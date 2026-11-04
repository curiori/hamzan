// How a child moves through the one course, with the rules of src/domain/progression.ts and session.ts
// (rules.progression, rules.dailySession) laid over the course order. With only stages 0–5 in the course this is
// exactly src/domain (tests/course/progression.test.ts). Levels waiting for their check are never the frontier.
import { diffDays, type LocalDate } from "@/domain/dates";
import { freshProgress, hasStar2, isMastered, type LevelProgress, type LevelStatus, type ProgressMap } from "@/domain/progression";
import { dueReviews, type ReviewItem } from "@/domain/review";
import type { StageCheckRecord } from "@/domain/session";
import { SPEC, type Mode } from "@/domain/spec";
import { COURSE, type Course, type CourseLevel } from "./course";

export interface CourseOpts {
  unlockAll?: boolean;
  /** levels waiting for their check (Profile.course.checks) */
  waiting?: readonly string[];
  course?: Course;
}

const courseOf = (opts: CourseOpts = {}) => opts.course ?? COURSE;

/** Progress of a level of the course (a fresh one when the child has none). */
export function lpAny(map: ProgressMap, id: string, course: Course = COURSE): LevelProgress {
  const lv = course.level[id];
  if (!lv) throw new Error(`unknown level ${id}`);
  return map[id] ?? freshProgress(lv);
}

/** Open when every prerequisite has ★2 or better. */
export function isUnlocked(map: ProgressMap, id: string, opts: CourseOpts = {}): boolean {
  const course = courseOf(opts);
  return !!opts.unlockAll || course.level[id].prerequisites.every((pid) => !course.level[pid] || hasStar2(lpAny(map, pid, course)));
}

export function levelStatus(map: ProgressMap, id: string, opts: CourseOpts = {}): LevelStatus {
  const p = lpAny(map, id, courseOf(opts));
  if (isMastered(p)) return "mastered";
  if (hasStar2(p)) return "star2";
  if (!isUnlocked(map, id, opts)) return "locked";
  return p.practiced ? "practicing" : "available";
}

/** The first level of the course that is open, has no ★2 and is not waiting for its check. */
export function frontier(map: ProgressMap, opts: CourseOpts = {}): CourseLevel | null {
  const course = courseOf(opts);
  const waiting = new Set(opts.waiting ?? []);
  return course.levels.find((l) => !waiting.has(l.id) && isUnlocked(map, l.id, opts) && !hasStar2(lpAny(map, l.id, course))) ?? null;
}

/** ★2 but not mastered: stage-check priority first, then the oldest ★2, then the course order. */
export function pendingList(map: ProgressMap, opts: CourseOpts = {}): CourseLevel[] {
  const course = courseOf(opts);
  return course.levels
    .filter((l) => {
      const p = lpAny(map, l.id, course);
      return hasStar2(p) && !isMastered(p);
    })
    .sort((a, b) => {
      const pa = lpAny(map, a.id, course);
      const pb = lpAny(map, b.id, course);
      if (pa.priority !== pb.priority) return pa.priority ? -1 : 1;
      return (pa.star2At ?? "").localeCompare(pb.star2At ?? "") || a.order - b.order;
    });
}

/** The frontier, or after N speed sets without ★2 its first unmastered prerequisite (in course order). */
export function practiceTarget(map: ProgressMap, opts: CourseOpts = {}): { level: CourseLevel; reason: "frontier" | "prerequisite" } | null {
  const course = courseOf(opts);
  const f = frontier(map, opts);
  if (!f) return null;
  const limit = SPEC.rules.progression.fallbackToPrerequisite.speedSetsWithoutStar2;
  if (lpAny(map, f.id, course).speedSetsWithoutStar2 >= limit) {
    const pre = f.prerequisites
      .filter((id) => course.level[id])
      .map((id) => course.level[id])
      .sort((a, b) => a.order - b.order)
      .find((l) => !isMastered(lpAny(map, l.id, course)));
    if (pre) return { level: pre, reason: "prerequisite" };
  }
  return { level: f, reason: "frontier" };
}

/** Every level of the stage has ★2 or better. */
export function stageAllStar2(map: ProgressMap, stageId: number, course: Course = COURSE): boolean {
  return (course.stage[stageId]?.levelIds ?? []).every((id) => hasStar2(lpAny(map, id, course)));
}

/** The next stage check: the first stage (course order) whose levels all have ★2 and whose check was not done. */
export function stageCheckDue(map: ProgressMap, checks: Record<number, StageCheckRecord>, course: Course = COURSE): number | null {
  const s = course.stages.find((st) => !checks[st.id] && stageAllStar2(map, st.id, course));
  return s ? s.id : null;
}

/** A slot of today's plan when it starts (the frontier may have moved since the plan was made). */
export function resolveSlot(slot: "frontier" | "pending", map: ProgressMap, opts: CourseOpts = {}): { levelId: string; mode: Mode; reason: "frontier" | "prerequisite" | "pending" } | null {
  const course = courseOf(opts);
  const fromTarget = () => {
    const t = practiceTarget(map, opts);
    return t ? { levelId: t.level.id, mode: t.reason === "prerequisite" ? ("S" as const) : lpAny(map, t.level.id, course).mode, reason: t.reason } : null;
  };
  if (slot === "frontier") {
    const t = fromTarget();
    if (t) return t;
  }
  const p = pendingList(map, opts)[0];
  if (p) return { levelId: p.id, mode: "S", reason: "pending" };
  return slot === "pending" ? fromTarget() : null;
}

/** Reviews due today among levels of the course (others are kept in the records and passed over). */
export function dueCourseReviews(reviews: ReviewItem[], date: LocalDate, course: Course = COURSE): ReviewItem[] {
  return dueReviews(
    reviews.filter((r) => !!course.level[r.levelId]),
    date,
  );
}

export const masteredAll = (map: ProgressMap, course: Course = COURSE): string[] => course.levels.filter((l) => isMastered(lpAny(map, l.id, course))).map((l) => l.id);

/** the weekly challenge needs a mastered level and a week since the last one */
export function challengeOpen(map: ProgressMap, lastDate: LocalDate | null, date: LocalDate, course: Course = COURSE): boolean {
  if (!masteredAll(map, course).length) return false;
  return lastDate === null || diffDays(date, lastDate) >= SPEC.rules.dailySession.weeklyChallenge.everyDays;
}
