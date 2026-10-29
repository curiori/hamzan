// Mode and level progression (rules.modeProgression, rules.progression).
import { LEVEL, LEVELS, SPEC, nextMode, prevMode, type LevelSpec, type Mode } from "./spec";
import type { LocalDate } from "./dates";
import { starsOf, type SetResult } from "./judge";

export type LevelStatus = "locked" | "available" | "practicing" | "star2" | "mastered";

export interface LevelProgress {
  mode: Mode;
  practiced: boolean;
  star2At: LocalDate | null;
  star3Dates: LocalDate[];
  masteredAt: LocalDate | null;
  speedSetsWithoutStar2: number;
  consecutiveBadSets: number;
  /** distinct local dates on which the fixed S set was played (first days of a new level) */
  fixedSetDates: LocalDate[];
  personalBestSec: number | null;
  /** best S-mode ★ (0–3) */
  bestStars: number;
  /** failed stage check → handled first among pendingStar3 */
  priority: boolean;
}

export type ProgressMap = Record<string, LevelProgress>;

export const freshProgress = (lv: LevelSpec): LevelProgress => ({
  mode: lv.modes[0],
  practiced: false,
  star2At: null,
  star3Dates: [],
  masteredAt: null,
  speedSetsWithoutStar2: 0,
  consecutiveBadSets: 0,
  fixedSetDates: [],
  personalBestSec: null,
  bestStars: 0,
  priority: false,
});

export const lpOf = (map: ProgressMap, id: string): LevelProgress => map[id] ?? freshProgress(LEVEL[id]);
export const hasStar2 = (p: LevelProgress) => p.star2At !== null || p.masteredAt !== null;
export const isMastered = (p: LevelProgress) => p.masteredAt !== null;

/** Unlocked when every prerequisite has ★2 or better (every stage is usable: no paywall in this build). */
export function isUnlocked(map: ProgressMap, id: string, unlockAll = false): boolean {
  return unlockAll || LEVEL[id].prerequisites.every((pid) => hasStar2(lpOf(map, pid)));
}

export function statusOf(map: ProgressMap, id: string, unlockAll = false): LevelStatus {
  const p = lpOf(map, id);
  if (isMastered(p)) return "mastered";
  if (hasStar2(p)) return "star2";
  if (!isUnlocked(map, id, unlockAll)) return "locked";
  return p.practiced ? "practicing" : "available";
}

/** frontier: first level (order) that is unlocked and has no ★2. */
export function frontier(map: ProgressMap, unlockAll = false): LevelSpec | null {
  return LEVELS.find((l) => isUnlocked(map, l.id, unlockAll) && !hasStar2(lpOf(map, l.id))) ?? null;
}

/** pendingStar3: ★2 but not mastered, oldest ★2 date first (stage-check priority first). */
export function pendingList(map: ProgressMap): LevelSpec[] {
  return LEVELS.filter((l) => {
    const p = lpOf(map, l.id);
    return hasStar2(p) && !isMastered(p);
  }).sort((a, b) => {
    const pa = lpOf(map, a.id);
    const pb = lpOf(map, b.id);
    if (pa.priority !== pb.priority) return pa.priority ? -1 : 1;
    return (pa.star2At ?? "").localeCompare(pb.star2At ?? "") || a.order - b.order;
  });
}
export const pendingStar3 = (map: ProgressMap) => pendingList(map)[0] ?? null;

/** Frontier slot target: after N S-sets without ★2, practise the first unmastered prerequisite instead. */
export function practiceTarget(map: ProgressMap, unlockAll = false): { level: LevelSpec; reason: "frontier" | "prerequisite" } | null {
  const f = frontier(map, unlockAll);
  if (!f) return null;
  const limit = SPEC.rules.progression.fallbackToPrerequisite.speedSetsWithoutStar2;
  if (lpOf(map, f.id).speedSetsWithoutStar2 >= limit) {
    const pre = f.prerequisites
      .map((id) => LEVEL[id])
      .sort((a, b) => a.order - b.order)
      .find((l) => !isMastered(lpOf(map, l.id)));
    if (pre) return { level: pre, reason: "prerequisite" };
  }
  return { level: f, reason: "frontier" };
}

export type ProgressEvent = "modeUp" | "modeDown" | "star2" | "mastered" | "personalBest";

export interface SetOutcome {
  result: SetResult;
  mode: Mode;
  errors: number;
  perProblemSec: number;
  t2: number;
  date: LocalDate;
  fixedSet?: boolean;
}

export function applySetResult(prev: LevelProgress, lv: LevelSpec, o: SetOutcome): { progress: LevelProgress; events: ProgressEvent[] } {
  if (o.result === "interrupted") return { progress: prev, events: [] };
  const rules = SPEC.rules;
  const p: LevelProgress = { ...prev, practiced: true, star3Dates: [...prev.star3Dates], fixedSetDates: [...prev.fixedSetDates] };
  const events: ProgressEvent[] = [];
  const clean = o.result !== "retry";

  if (o.mode === "H") {
    if (clean) {
      p.mode = nextMode(lv, "H");
      if (p.mode !== "H") events.push("modeUp");
    }
  } else if (o.mode === "M") {
    if (clean && o.perProblemSec <= rules.modeProgression.M.memoTimeFactor * o.t2) {
      p.mode = "S";
      events.push("modeUp");
    }
  } else {
    if (o.result === "star2" || o.result === "star3") {
      if (!hasStar2(prev)) {
        p.star2At = o.date;
        events.push("star2");
      }
      p.speedSetsWithoutStar2 = 0;
      if (o.result === "star3" && !p.star3Dates.includes(o.date)) p.star3Dates.push(o.date);
      if (!p.masteredAt && p.star3Dates.length >= rules.stars.mastery.star3OnDistinctLocalDates) {
        p.masteredAt = o.date;
        p.priority = false;
        events.push("mastered");
      }
    } else if (!hasStar2(prev)) {
      p.speedSetsWithoutStar2 += 1;
    }
    p.bestStars = Math.max(p.bestStars, starsOf(o.result));
    if (clean && (p.personalBestSec === null || o.perProblemSec < p.personalBestSec)) {
      p.personalBestSec = o.perProblemSec;
      events.push("personalBest");
    }
    if (o.fixedSet && !p.fixedSetDates.includes(o.date)) p.fixedSetDates.push(o.date);
  }

  // Step back one mode after N consecutive sets with ≥ M errors (only while the level has no ★2 yet).
  const sb = rules.progression.modeStepBack;
  p.consecutiveBadSets = o.errors >= sb.minErrorsPerSet ? prev.consecutiveBadSets + 1 : 0;
  if (p.consecutiveBadSets >= sb.consecutiveSets && !hasStar2(p) && o.mode !== "H") {
    const back = prevMode(lv, o.mode);
    if (back !== o.mode) {
      p.mode = back;
      events.push("modeDown");
    }
    p.consecutiveBadSets = 0;
  }
  return { progress: p, events };
}

/** Review demotion: back to pendingStar3 (★2 kept, mastery and ★3 dates cleared). */
export function demote(prev: LevelProgress): LevelProgress {
  return { ...prev, masteredAt: null, star3Dates: [], mode: "S", bestStars: Math.min(prev.bestStars, 2) };
}

/** Stage complete = every level of the stage has ★2 or better. */
export function stageAllStar2(map: ProgressMap, stageId: number): boolean {
  return LEVELS.filter((l) => l.stage === stageId).every((l) => hasStar2(lpOf(map, l.id)));
}
