// Today's practice over the one course (rules.dailySession: warm-up, two main sets, review, 7–10 minutes).
// Levels waiting for their check take the first main set; with no check this is src/domain's plan.
import type { LocalDate } from "@/domain/dates";
import type { ProgressMap } from "@/domain/progression";
import type { ReviewItem } from "@/domain/review";
import type { SessionPart, StageCheckRecord } from "@/domain/session";
import { COURSE, type Course } from "./course";
import { waitingLevels } from "./checks";
import { dueCourseReviews, pendingList, practiceTarget, stageCheckDue } from "./progression";

/** a part of today's plan: those of src/domain, and the check of new levels */
export type DayPart = SessionPart | { kind: "check" };

export function planDay(args: {
  progress: ProgressMap;
  reviews: ReviewItem[];
  stageChecks: Record<number, StageCheckRecord>;
  date: LocalDate;
  unlockAll: boolean;
  /** levels waiting for their check (Profile.course.checks) */
  checks: readonly string[];
  course?: Course;
}): DayPart[] {
  const course = args.course ?? COURSE;
  const opts = { unlockAll: args.unlockAll, waiting: args.checks, course };
  const parts: DayPart[] = [{ kind: "warmup" }];
  const checking = waitingLevels(args.progress, args.checks, course).length > 0;
  if (checking) parts.push({ kind: "check" });
  const stage = stageCheckDue(args.progress, args.stageChecks, course);
  if (stage !== null) {
    parts.push({ kind: "stageCheck", stage });
  } else {
    const target = practiceTarget(args.progress, opts);
    const pending = pendingList(args.progress, opts).filter((l) => l.id !== target?.level.id);
    // the check is one of the day's two main sets
    if (checking) {
      if (target) parts.push({ kind: "slot", slot: "frontier" });
      else if (pending.length) parts.push({ kind: "slot", slot: "pending" });
    } else if (target) parts.push({ kind: "slot", slot: "frontier" }, pending.length ? { kind: "slot", slot: "pending" } : { kind: "slot", slot: "frontier" });
    else if (pending.length) parts.push({ kind: "slot", slot: "pending" }, { kind: "slot", slot: "pending" });
  }
  const due = dueCourseReviews(args.reviews, args.date, course);
  if (due.length) parts.push({ kind: "review", levelIds: due.map((d) => d.levelId) });
  return parts;
}
