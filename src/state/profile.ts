import { ALL_LEVELS, ALL_STAGES, isCourseLevel } from "@/course/levels";
import { tryInstanceOf, type CourseInstance } from "@/course/problems";
import { isUnlocked, lpAny, pendingList, practiceTarget } from "@/course/progression";
import { addDays, diffDays, toLocalDate, type LocalDate } from "@/domain/dates";
import { hasStar2, isMastered, type ProgressMap } from "@/domain/progression";
import { seedOf } from "@/domain/rng";
import type { StageCheckRecord } from "@/domain/session";
import { SPEC, type Mode } from "@/domain/spec";
import type { TimeOptions } from "@/domain/timing";
import { REWARDS, unlockedRewards, type RewardStats } from "@/game/achievements";
import { emptyWallet } from "@/game/economy";
import { GOOD_KIND } from "@/game/room";
import { SHOP, type ShopKind } from "@/game/shop";
import { freshCourseRecord } from "./reconcile";
import { DEFAULT_SETTINGS, type Profile } from "./types";

export const todayOf = (dayOffset: number, nowMs: number = Date.now()): LocalDate => toLocalDate(nowMs + dayOffset * 86400000);

export const timeOpts = (p: Profile): TimeOptions => ({ writeChild: p.writeSecPerDigit, override: p.settings.coeffs });

export function newProfile(nickname: string, grade: number, opts: { id?: string; now?: number; random?: () => number } = {}): Profile {
  const now = opts.now ?? Date.now();
  const random = opts.random ?? Math.random;
  return {
    id: opts.id ?? `p${now.toString(36)}${Math.floor(random() * 1e6).toString(36)}`,
    nickname,
    grade,
    createdAt: now,
    writeSecPerDigit: null,
    writeTestedAt: null,
    settings: { ...DEFAULT_SETTINGS },
    progress: {},
    reviews: [],
    sets: [],
    facts: {},
    errors: [],
    stageChecks: {},
    sessions: {},
    challenge: { lastDate: null, bestSec: null },
    placement: null,
    placementDone: false,
    wearing: null,
    wallet: emptyWallet(),
    inventory: {},
    room: { layout: {}, wallpaper: null, floor: null, seen: [] },
    ledger: [],
    course: freshCourseRecord(),
  };
}

export function rewardStats(p: Profile): RewardStats {
  // every level the child has records of counts, including levels a later version retired: rewards never go away
  // because the course changed
  const lps = Object.values(p.progress);
  const base = p.rewardBaseline ?? { star2: 0, mastered: 0 };
  return {
    cleanSets: p.sets.filter((s) => s.kind !== "warmup" && s.kind !== "placement" && s.kind !== "check" && s.n > 0 && s.errors === 0).length,
    star2Levels: Math.max(0, lps.filter(hasStar2).length - base.star2),
    mastered: Math.max(0, lps.filter(isMastered).length - base.mastered),
    goalDays: Object.values(p.sessions).filter((d) => d.goal).length,
    stageChecksPassed: Object.values(p.stageChecks).filter((c) => c.passed && !c.byPlacement).length,
  };
}

const bought = (p: Profile, kind: ShopKind) => SHOP.filter((i) => i.kind === kind && (p.inventory[i.id] ?? 0) > 0).map((i) => i.id);

/** Room goods the child has: rewards practice brought, then goods bought in the shop. */
export function ownedGoods(p: Profile): string[] {
  return [...unlockedRewards(rewardStats(p)).filter((id) => GOOD_KIND[id]), ...bought(p, "good")];
}

/** Wearables the child has: rewards practice brought, then wear bought in the shop. */
export function ownedWear(p: Profile): string[] {
  const earned = new Set(unlockedRewards(rewardStats(p)));
  return [...REWARDS.filter((r) => r.wear && earned.has(r.id)).map((r) => r.id), ...bought(p, "wear")];
}

/** What the diagnosis hands out: earlier levels as ★2, cleared stages, and the reward baseline. */
export function placementOutcome(applied: { progress: ProgressMap; clearedStages: number[] }, date: LocalDate) {
  const lps = ALL_LEVELS.map((l) => lpAny(applied.progress, l.id));
  return {
    stageChecks: Object.fromEntries(applied.clearedStages.map((id) => [id, { date, passed: true, byPlacement: true }])) as Record<number, StageCheckRecord>,
    rewardBaseline: { star2: lps.filter(hasStar2).length, mastered: lps.filter(isMastered).length },
  };
}

/** progress of levels this version does not have (kept when the diagnosis writes the course's levels) */
export const outsideCourse = (map: ProgressMap): ProgressMap => Object.fromEntries(Object.entries(map).filter(([id]) => !isCourseLevel(id)));

/** factKeys to weight ×2: wrong, or slower than T★2, within the last weakFactWindowDays. */
export function weakFacts(p: Profile, levelId: string, date: LocalDate): Set<string> {
  const win = SPEC.rules.setGeneration.weakFactWindowDays;
  const recent = (d: LocalDate | null) => d !== null && diffDays(date, d) < win;
  return new Set(
    Object.entries(p.facts)
      .filter(([, f]) => f.levelId === levelId && (recent(f.lastErrorDate) || recent(f.lastSlowDate)))
      .map(([k]) => k),
  );
}

export function setIndexToday(p: Profile, levelId: string, date: LocalDate): number {
  return p.sets.filter((s) => s.levelId === levelId && s.date === date).length;
}

/** Seed for a level's set: fixed during the first N days of S mode, otherwise hash(profile, level, date, index). */
export function setSeed(p: Profile, levelId: string, mode: Mode, date: LocalDate): { seed: number; fixed: boolean } {
  const lp = lpAny(p.progress, levelId);
  const days = SPEC.rules.setGeneration.fixedSetDaysForNewLevelSpeed;
  if (mode === "S" && !hasStar2(lp) && (lp.fixedSetDates.length < days || lp.fixedSetDates.includes(date)))
    return { seed: seedOf(p.id, levelId, "fixed"), fixed: true };
  return { seed: seedOf(p.id, levelId, date, setIndexToday(p, levelId, date)), fixed: false };
}

/** Problems missed yesterday (warm-up source) that this version can make again: its levels, problems it can still build. */
export function yesterdaysMisses(p: Profile, date: LocalDate): CourseInstance[] {
  const y = addDays(date, -1);
  return p.errors.filter((e) => e.date === y).flatMap((e) => {
    const inst = tryInstanceOf(e.levelId, e.problem);
    return inst ? [inst] : [];
  });
}

/** Current stage = the stage of today's practice target (course order; levels waiting for their check are skipped). */
export function currentStage(p: Profile, unlockAll: boolean): number {
  const opts = { unlockAll, waiting: p.course.checks };
  const t = practiceTarget(p.progress, opts)?.level ?? pendingList(p.progress, opts)[0];
  return t ? t.stage : ALL_STAGES[ALL_STAGES.length - 1].id;
}

/** Enumerable open levels of the current stage, or of every stage up to it in course order. */
export function warmupLevels(p: Profile, unlockAll: boolean): string[] {
  const stage = currentStage(p, unlockAll);
  const open = (id: string) => isUnlocked(p.progress, id, { unlockAll });
  const here = ALL_LEVELS.filter((l) => l.stage === stage && l.enumerable && open(l.id)).map((l) => l.id);
  if (here.length) return here;
  const upTo = new Set(ALL_STAGES.slice(0, ALL_STAGES.findIndex((s) => s.id === stage) + 1).map((s) => s.id));
  return ALL_LEVELS.filter((l) => l.enumerable && open(l.id) && upTo.has(l.stage)).map((l) => l.id);
}
