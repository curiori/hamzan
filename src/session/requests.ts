import type { DayPart } from "@/course/day";
import { isJukuStage, levelSpec, stageSpec } from "@/course/levels";
import type { CourseInstance } from "@/course/problems";
import { jukuOf, masteredAll } from "@/course/progress";
import { buildLevelSet, buildMixedSet, buildWarmupSet } from "@/course/sets";
import type { LocalDate } from "@/domain/dates";
import { miniLevel } from "@/domain/placement";
import { seedOf } from "@/domain/rng";
import { resolveSlot } from "@/domain/session";
import { spread } from "@/domain/setBuilder";
import { RULE_NUMBERS, SPEC, STAGES, type Mode } from "@/domain/spec";
import { KID_LEVEL_NAME, KID_STAGE_NAME, MODE_LABEL } from "@/i18n/ja";
import { nextCheck, resolveJukuSlot } from "@/juku/track";
import { setSeed, warmupLevels, weakFacts, yesterdaysMisses } from "@/state/profile";
import type { Profile, SessionDay, SetKind } from "@/state/types";

const WARMUP_POOL = 80;
const SHORT_STAGE_CHECK = 6;

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
  /** juku_check: the 塾の単元 being checked */
  unitId?: string;
  inSession: boolean;
  title: string;
}

export interface PlayPlan {
  req: PlayRequest;
  ctx: PlayContext;
}

export function levelPlan(p: Profile, levelId: string, mode: Mode, date: LocalDate, kind: SetKind, sessionPart?: number, now: number = Date.now()): PlayPlan {
  const { seed, fixed } = setSeed(p, levelId, mode, date);
  const lv = levelSpec(levelId);
  return {
    req: {
      key: `${levelId}-${seed}-${now}`,
      title: KID_LEVEL_NAME[levelId],
      subtitle: `${MODE_LABEL[mode]}・レベル ${levelId}`,
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
      title: KID_LEVEL_NAME[levelId],
    },
  };
}

/** The starting check of a 塾の単元: 5 problems (speed) of the level the check has reached. */
export function jukuCheckPlan(p: Profile, unitId: string, levelId: string, date: LocalDate, idx: number): PlayPlan {
  const attempt = p.sets.filter((x) => x.kind === "juku_check").length;
  const seed = seedOf(p.id, "juku-check", levelId, date, attempt);
  return {
    req: {
      key: `jc${levelId}${date}${attempt}`,
      title: KID_LEVEL_NAME[levelId],
      subtitle: "じゅくの たんげん：チェック",
      mode: "S",
      problems: buildLevelSet(levelId, RULE_NUMBERS.miniCheckProblems, seed),
    },
    ctx: { kind: "juku_check", levelId, mode: "S", unitId, sessionPart: idx, sessionDate: date, inSession: true, title: "チェック" },
  };
}

/** The set for one part of today's session, or null when the part has nothing to ask. */
export function sessionPartPlan(part: DayPart, idx: number, p: Profile, date: LocalDate, unlockAll: boolean): PlayPlan | null {
  if (part.kind === "warmup") {
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
  if (part.kind === "juku") {
    const juku = jukuOf(p);
    const check = part.slot === "frontier" ? nextCheck(p.progress, juku) : null;
    if (check) return jukuCheckPlan(p, check.unitId, check.levelId, date, idx);
    const r = resolveJukuSlot(part.slot, p.progress, juku) ?? resolveSlot("pending", p.progress, unlockAll);
    return r ? levelPlan(p, r.levelId, r.mode, date, "main", idx) : null;
  }
  if (part.kind === "slot") {
    const r = resolveSlot(part.slot, p.progress, unlockAll);
    return r ? levelPlan(p, r.levelId, r.mode, date, "main", idx) : null;
  }
  if (part.kind === "stageCheck") {
    if (p.stageChecks[part.stage]) return null;
    const sc = stageSpec(part.stage).stageCheck;
    const seed = seedOf(p.id, "stageCheck", part.stage, date);
    return {
      req: {
        key: `sc${part.stage}${date}`,
        title: `ステージ${part.stage}「${KID_STAGE_NAME[part.stage]}」`,
        subtitle: "ステージチェック",
        mode: "S",
        problems: buildMixedSet(sc.levels, spread(sc.levels, sc.problems, seed), seed),
      },
      ctx: { kind: "stage_check", levelId: null, mode: "S", stage: part.stage, sessionPart: idx, sessionDate: date, inSession: true, title: "ステージチェック" },
    };
  }
  const levels = part.levelIds.filter((id) => p.reviews.some((r) => r.levelId === id));
  if (!levels.length) return null;
  const seed = seedOf(p.id, "review", date, idx);
  return {
    req: {
      key: `rv${date}${idx}`,
      title: levels.map((id) => KID_LEVEL_NAME[id]).join("・"),
      subtitle: "ふくしゅう",
      mode: "S",
      problems: buildMixedSet(levels, levels.map(() => SPEC.rules.spacedReview.problemsPerLevel), seed),
    },
    ctx: { kind: "review", levelId: null, mode: "S", sessionPart: idx, sessionDate: date, inSession: true, title: "ふくしゅう" },
  };
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

/** Today's 塾の単元 part as words for the plan list: the check, or the level it practises. */
export function jukuPartLabel(part: DayPart, p: Profile, unlockAll: boolean): string | null {
  if (part.kind === "stageCheck" && isJukuStage(part.stage)) return `ステージチェック（ステージ${part.stage}）`;
  if (part.kind !== "juku") return null;
  const juku = jukuOf(p);
  if (part.slot === "frontier" && nextCheck(p.progress, juku)) return "じゅくの たんげんの チェック";
  const r = resolveJukuSlot(part.slot, p.progress, juku) ?? resolveSlot("pending", p.progress, unlockAll);
  return r ? `${KID_LEVEL_NAME[r.levelId]}（${MODE_LABEL[r.mode]}）` : "じゅくの たんげん";
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
  if (!st || st.phase === "done") return null;
  const attempt = p.sets.filter((x) => x.kind === "placement").length;
  const seed = seedOf(p.id, "placement", date, attempt);
  if (st.phase === "stageCheck") {
    const sc = STAGES[st.stage].stageCheck;
    const n = short ? Math.min(SHORT_STAGE_CHECK, sc.problems) : sc.problems;
    return {
      req: {
        key: `pl${attempt}`,
        title: `ステージ${st.stage}「${KID_STAGE_NAME[st.stage]}」`,
        subtitle: "しんだん：ステージチェック",
        mode: "S",
        problems: buildMixedSet(sc.levels, spread(sc.levels, n, seed), seed),
      },
      ctx: { kind: "placement", levelId: null, mode: "S", placementPhase: "stageCheck", inSession: false, title: "しんだん" },
    };
  }
  const lv = miniLevel(st);
  return {
    req: { key: `pl${attempt}`, title: KID_LEVEL_NAME[lv], subtitle: "しんだん：ミニチェック", mode: "S", problems: buildLevelSet(lv, RULE_NUMBERS.miniCheckProblems, seed) },
    ctx: { kind: "placement", levelId: lv, mode: "S", placementPhase: "mini", inSession: false, title: "しんだん" },
  };
}
