// Test helpers for the course layer: progress maps and seeded random records.
import { buildCourse, MANIFEST, type Course } from "../../src/course/course";
import { addDays, type LocalDate } from "../../src/domain/dates";
import { freshProgress, type LevelProgress, type ProgressMap } from "../../src/domain/progression";
import type { ReviewItem } from "../../src/domain/review";
import { mulberry32 } from "../../src/domain/rng";
import type { StageCheckRecord } from "../../src/domain/session";
import { LEVELS, STAGES } from "../../src/domain/spec";

export const D: LocalDate = "2026-11-04";

/** stages 0–5 only, as before the new stages: the course layer must then act exactly like src/domain */
export const CORE: Course = buildCourse({ ...MANIFEST, stages: STAGES.map((s) => ({ id: s.id })) }, { stages: STAGES, levels: LEVELS });

export const withLevels = (course: Course, levels: Record<string, Partial<LevelProgress>>): ProgressMap =>
  Object.fromEntries(Object.entries(levels).map(([id, lp]) => [id, { ...freshProgress(course.level[id]), ...lp }]));

export const star2 = (date = D): Partial<LevelProgress> => ({ star2At: date, mode: "S", practiced: true, bestStars: 2 });
export const mastered = (date = D): Partial<LevelProgress> => ({ star2At: date, masteredAt: date, mode: "S", practiced: true, bestStars: 3 });

/** every level of the course before `levelId` with ★2 */
export const passedBefore = (course: Course, levelId: string): ProgressMap =>
  withLevels(course, Object.fromEntries(course.levels.filter((l) => l.order < course.level[levelId].order).map((l) => [l.id, star2()])));

/** Records like a child's: mostly passed before a random point, a few started or passed after it. */
export function randomRecords(course: Course, seed: number): { progress: ProgressMap; reviews: ReviewItem[]; stageChecks: Record<number, StageCheckRecord> } {
  const r = mulberry32(seed);
  const cut = r.int(0, course.levels.length);
  const progress: ProgressMap = {};
  for (const l of course.levels) {
    const lp = freshProgress(l);
    if (r.next() < (l.order < cut ? 0.92 : 0.08)) {
      Object.assign(lp, star2(addDays(D, -r.int(0, 40))));
      if (r.next() < 0.35) lp.masteredAt = D;
      if (r.next() < 0.15) lp.priority = true;
    } else if (r.next() < 0.3) {
      Object.assign(lp, { practiced: true, mode: r.pick(l.modes), speedSetsWithoutStar2: r.int(0, 6) });
    } else continue;
    progress[l.id] = lp;
  }
  const stageChecks: Record<number, StageCheckRecord> = {};
  for (const s of course.stages) if (r.next() < 0.3) stageChecks[s.id] = { date: D, passed: r.next() < 0.7 };
  const reviews: ReviewItem[] = course.levels
    .filter(() => r.next() < 0.08)
    .map((l) => ({ levelId: l.id, intervalIndex: r.int(0, 3), dueDate: addDays(D, r.int(-3, 3)), consecutiveFails: 0 }));
  return { progress, reviews, stageChecks };
}
