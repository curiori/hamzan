import { nextCheck } from "@/course/checks";
import { isCourseLevel, isCourseStage, levelLabel, levelName, levelSpec, stageName, stageNo, stageSpec } from "@/course/levels";
import { miniLevel } from "@/course/placement";
import type { DayPart } from "@/course/plan";
import type { CourseInstance } from "@/course/problems";
import { masteredAll, resolveSlot } from "@/course/progression";
import { buildLevelSet, buildMixedSet, buildWarmupSet } from "@/course/sets";
import type { LocalDate } from "@/domain/dates";
import { seedOf } from "@/domain/rng";
import { spread } from "@/domain/setBuilder";
import { RULE_NUMBERS, SPEC, type Mode } from "@/domain/spec";
import { MODE_LABEL } from "@/i18n/ja";
import { setSeed, warmupLevels, weakFacts, yesterdaysMisses } from "@/state/profile";
import type { Profile, SessionDay, SetKind } from "@/state/types";

const WARMUP_POOL = 80;
const SHORT_STAGE_CHECK = 6;
const CHECK_SUBTITLE = "あたらしい レベルの チェック";

export interface PlayRequest {
  key: string;
  title: string;
  subtitle: string;
  mode: Mode;
  problems: CourseInstance[];
  warmupSec?: number;
}

export interface PlayContext {
  kind: SetKind;
  levelId: string | null;
  mode: Mode;
  fixed?: boolean;
  sessionPart?: number;
  /** the day of the session plan this part belongs to */
  sessionDate?: LocalDate;
  stage?: number;
  placementPhase?: "stageCheck" | "mini";
  inSession: boolean;
  title: string;
}

export interface PlayPlan {
  req: PlayRequest;
  ctx: PlayContext;
}

const stageTitle = (stage: number) => `ステージ${stageNo(stage)}「${stageName(stage)}」`;

export function levelPlan(p: Profile, levelId: string, mode: Mode, date: LocalDate, kind: SetKind, sessionPart?: number, now: number = Date.now()): PlayPlan {
  const { seed, fixed } = setSeed(p, levelId, mode, date);
  const lv = levelSpec(levelId);
  return {
    req: {
      key: `${levelId}-${seed}-${now}`,
      title: levelName(levelId),
      subtitle: `${MODE_LABEL[mode]}・レベル ${levelLabel(levelId)}`,
      mode,
      problems: buildLevelSet(levelId, lv.setSize, seed, weakFacts(p, levelId, date)),
    },
    ctx: {
      kind,
      levelId,
      mode,
      fixed,
      sessionPart,
      sessionDate: sessionPart !== undefined ? date : undefined,
      inSession: sessionPart !== undefined,
      title: levelName(levelId),
    },
  };
}

/** The check of a new level: 5 problems (speed), like the diagnosis' mini checks. */
export function checkPlan(p: Profile, levelId: string, date: LocalDate, idx: number): PlayPlan {
  const attempt = p.sets.filter((x) => x.kind === "check").length;
  const seed = seedOf(p.id, "check", levelId, date, attempt);
  return {
    req: { key: `ck${levelId}${date}${attempt}`, title: levelName(levelId), subtitle: CHECK_SUBTITLE, mode: "S", problems: buildLevelSet(levelId, RULE_NUMBERS.miniCheckProblems, seed) },
    ctx: { kind: "check", levelId, mode: "S", sessionPart: idx, sessionDate: date, inSession: true, title: "チェック" },
  };
}

const slotOpts = (p: Profile, unlockAll: boolean) => ({ unlockAll, waiting: p.course.checks });

/** The set for one part of today's session, or null when the part has nothing to ask (or this version does not know it). */
export function sessionPartPlan(part: DayPart, idx: number, p: Profile, date: LocalDate, unlockAll: boolean): PlayPlan | null {
  switch (part.kind) {
    case "warmup": {
      const levels = warmupLevels(p, unlockAll);
      const missed = yesterdaysMisses(p, date);
      if (!levels.length && !missed.length) return null;
      const problems = buildWarmupSet(levels, missed, seedOf(p.id, "warmup", date), WARMUP_POOL);
      if (!problems.length) return null;
      const seconds = SPEC.rules.dailySession.warmup.seconds;
      return {
        req: { key: `w${date}`, title: "ウォームアップ", subtitle: `${seconds}びょう・はんていなし`, mode: "S", problems, warmupSec: seconds },
        ctx: { kind: "warmup", levelId: null, mode: "S", sessionPart: idx, sessionDate: date, inSession: true, title: "ウォームアップ" },
      };
    }
    case "check": {
      const c = nextCheck(p.progress, p.course.checks);
      return c ? checkPlan(p, c.levelId, date, idx) : null;
    }
    case "slot": {
      const r = resolveSlot(part.slot, p.progress, slotOpts(p, unlockAll));
      return r ? levelPlan(p, r.levelId, r.mode, date, "main", idx) : null;
    }
    case "stageCheck": {
      if (p.stageChecks[part.stage] || !isCourseStage(part.stage)) return null;
      const sc = stageSpec(part.stage).stageCheck;
      const seed = seedOf(p.id, "stageCheck", part.stage, date);
      return {
        req: {
          key: `sc${part.stage}${date}`,
          title: stageTitle(part.stage),
          subtitle: "ステージチェック",
          mode: "S",
          problems: buildMixedSet(sc.levels, spread(sc.levels, sc.problems, seed), seed),
        },
        ctx: { kind: "stage_check", levelId: null, mode: "S", stage: part.stage, sessionPart: idx, sessionDate: date, inSession: true, title: "ステージチェック" },
      };
    }
    case "review": {
      const levels = part.levelIds.filter((id) => isCourseLevel(id) && p.reviews.some((r) => r.levelId === id));
      if (!levels.length) return null;
      const seed = seedOf(p.id, "review", date, idx);
      return {
        req: {
          key: `rv${date}${idx}`,
          title: levels.map(levelName).join("・"),
          subtitle: "ふくしゅう",
          mode: "S",
          problems: buildMixedSet(levels, levels.map(() => SPEC.rules.spacedReview.problemsPerLevel), seed),
        },
        ctx: { kind: "review", levelId: null, mode: "S", sessionPart: idx, sessionDate: date, inSession: true, title: "ふくしゅう" },
      };
    }
    default:
      // a part saved by another version
      return null;
  }
}

/** The next part of today's session that has something to ask; parts with nothing to ask come back in skipped. */
export function nextSessionPlan(day: SessionDay, p: Profile, date: LocalDate, unlockAll: boolean): { plan: PlayPlan | null; skipped: number[] } {
  const skipped: number[] = [];
  for (let idx = day.done; idx < day.plan.length; idx++) {
    const plan = sessionPartPlan(day.plan[idx], idx, p, date, unlockAll);
    if (plan) return { plan, skipped };
    skipped.push(idx);
  }
  return { plan: null, skipped };
}

/** A part of today's plan as words for the plan list. */
export function partLabel(part: DayPart, p: Profile, unlockAll: boolean): string {
  switch (part.kind) {
    case "warmup":
      return "ウォームアップ";
    case "check":
      return CHECK_SUBTITLE;
    case "stageCheck":
      return isCourseStage(part.stage) ? `ステージチェック（ステージ${stageNo(part.stage)}）` : "ステージチェック";
    case "review":
      return `ふくしゅう（${part.levelIds.filter((id) => isCourseLevel(id)).map(levelName).join("・")}）`;
    case "slot": {
      const r = resolveSlot(part.slot, p.progress, slotOpts(p, unlockAll));
      return r ? `${levelName(r.levelId)}（${MODE_LABEL[r.mode]}）` : "メイン";
    }
    default:
      return "メイン";
  }
}

export function challengePlan(p: Profile, date: LocalDate): PlayPlan {
  const mastered = masteredAll(p.progress);
  const seed = seedOf(p.id, "challenge", date);
  const n = SPEC.rules.dailySession.weeklyChallenge.problems;
  return {
    req: { key: `ch${date}`, title: "チャレンジ", subtitle: "じこベストに ちょうせん", mode: "S", problems: buildMixedSet(mastered, spread(mastered, n, seed), seed) },
    ctx: { kind: "challenge", levelId: null, mode: "S", inSession: false, title: "チャレンジ" },
  };
}

/** The next diagnosis set, or null when there is no open diagnosis. */
export function placementPlan(p: Profile, date: LocalDate, short: boolean): PlayPlan | null {
  const st = p.placement;
  if (!st || st.phase === "done" || !isCourseStage(st.stage)) return null;
  const attempt = p.sets.filter((x) => x.kind === "placement").length;
  const seed = seedOf(p.id, "placement", date, attempt);
  if (st.phase === "stageCheck") {
    const sc = stageSpec(st.stage).stageCheck;
    const n = short ? Math.min(SHORT_STAGE_CHECK, sc.problems) : sc.problems;
    return {
      req: {
        key: `pl${attempt}`,
        title: stageTitle(st.stage),
        subtitle: "しんだん：ステージチェック",
        mode: "S",
        problems: buildMixedSet(sc.levels, spread(sc.levels, n, seed), seed),
      },
      ctx: { kind: "placement", levelId: null, mode: "S", placementPhase: "stageCheck", inSession: false, title: "しんだん" },
    };
  }
  const lv = miniLevel(st);
  return {
    req: { key: `pl${attempt}`, title: levelName(lv), subtitle: "しんだん：ミニチェック", mode: "S", problems: buildLevelSet(lv, RULE_NUMBERS.miniCheckProblems, seed) },
    ctx: { kind: "placement", levelId: lv, mode: "S", placementPhase: "mini", inSession: false, title: "しんだん" },
  };
}
