// Checks of new levels: when an update puts levels before where the child already is, each of them gets a
// 5-problem speed check (like the diagnosis' mini checks) instead of being practised from the hint mode.
// One stage a day, in course order; the first stumble is where the child starts.
import type { LocalDate } from "@/domain/dates";
import { hasStar2, type ProgressMap } from "@/domain/progression";
import { COURSE, type Course, type CourseLevel } from "./course";
import { lpAny } from "./progression";

/** levels waiting for their check that the course has and that have no ★2, in course order */
export function waitingLevels(map: ProgressMap, checks: readonly string[], course: Course = COURSE): CourseLevel[] {
  const ids = new Set(checks);
  return course.levels.filter((l) => ids.has(l.id) && !hasStar2(lpAny(map, l.id, course)));
}

/** The level the check asks next: the first waiting level, in the stage of the first waiting level. */
export function nextCheck(map: ProgressMap, checks: readonly string[], course: Course = COURSE): { stage: number; levelId: string } | null {
  const first = waitingLevels(map, checks, course)[0];
  return first ? { stage: first.stage, levelId: first.id } : null;
}

/**
 * The waiting levels the check can still open: a level keeps waiting while each of its prerequisites has ★2 or keeps
 * waiting itself (prerequisites come earlier in the course, so the check reaches them first). The others leave the
 * check and are met on the way, after their prerequisites. Ids the course does not have stay.
 */
export function openableChecks(map: ProgressMap, checks: readonly string[], course: Course = COURSE): string[] {
  const ids = new Set(checks);
  const keep = new Set<string>();
  for (const l of course.levels)
    if (ids.has(l.id) && l.prerequisites.every((pid) => !course.level[pid] || keep.has(pid) || hasStar2(lpAny(map, pid, course)))) keep.add(l.id);
  return checks.filter((id) => !course.level[id] || keep.has(id));
}

export interface CheckOutcome {
  progress: ProgressMap;
  checks: string[];
  passed: boolean;
  /** the day's check of this stage ended with this set (a stumble, or no level of the stage left) */
  stageDone: boolean;
  /** where the child starts after a stumble */
  startLevel: string | null;
  /** ★2 handed out by the check (rewards do not count them) */
  star2Given: number;
}

/**
 * One check set (5 problems, speed). No mistake and within T★2: ★2, and the check goes on in the stage. Otherwise
 * the child starts this level (its first mode after mistakes, speed when only slow), and the rest of its stage and
 * the waiting levels that need what left leave the check, to be met on the way.
 */
export function applyCheck(
  map: ProgressMap,
  checks: readonly string[],
  args: { levelId: string; errors: number; perProblemSec: number; t2: number; date: LocalDate },
  course: Course = COURSE,
): CheckOutcome {
  const { levelId, errors, perProblemSec, t2, date } = args;
  const lv = course.level[levelId];
  const before = lpAny(map, levelId, course);
  const progress: ProgressMap = { ...map };
  const passed = errors === 0 && perProblemSec <= t2;
  if (passed) {
    progress[levelId] = { ...before, star2At: before.star2At ?? date, mode: "S", practiced: true, bestStars: Math.max(before.bestStars, 2) };
    const rest = checks.filter((id) => id !== levelId);
    const stageLeft = waitingLevels(progress, rest, course).some((l) => l.stage === lv.stage);
    return { progress, checks: rest, passed, stageDone: !stageLeft, startLevel: null, star2Given: hasStar2(before) ? 0 : 1 };
  }
  if (!before.practiced) progress[levelId] = { ...before, mode: errors > 0 ? lv.modes[0] : "S" };
  const rest = openableChecks(
    progress,
    checks.filter((id) => id !== levelId && course.level[id]?.stage !== lv.stage),
    course,
  );
  return { progress, checks: rest, passed, stageDone: true, startLevel: levelId, star2Given: 0 };
}
