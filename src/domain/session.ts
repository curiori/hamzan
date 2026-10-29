// Daily session (rules.dailySession) and weekly challenge.
import { LEVELS, SPEC, STAGES, type Mode } from "./spec";
import { diffDays, type LocalDate } from "./dates";
import { dueReviews, type ReviewItem } from "./review";
import { isMastered, lpOf, pendingList, practiceTarget, stageAllStar2, type ProgressMap } from "./progression";

export type SessionPart =
  | { kind: "warmup" }
  | { kind: "slot"; slot: "frontier" | "pending" }
  | { kind: "stageCheck"; stage: number }
  | { kind: "review"; levelIds: string[] };

export interface StageCheckRecord {
  date: LocalDate;
  passed: boolean;
  /** cleared by the diagnosis, not by an actual stage check */
  byPlacement?: boolean;
}

/** The next stage check to run: every level of the stage has ★2, and its check has not been done yet. */
export function stageCheckDue(progress: ProgressMap, checks: Record<number, StageCheckRecord>): number | null {
  const s = STAGES.find((st) => !checks[st.id] && stageAllStar2(progress, st.id));
  return s ? s.id : null;
}

export function planDailySession(args: {
  progress: ProgressMap;
  reviews: ReviewItem[];
  stageChecks: Record<number, StageCheckRecord>;
  date: LocalDate;
  unlockAll: boolean;
}): SessionPart[] {
  const parts: SessionPart[] = [{ kind: "warmup" }];
  const check = stageCheckDue(args.progress, args.stageChecks);
  if (check !== null) {
    parts.push({ kind: "stageCheck", stage: check });
  } else {
    const target = practiceTarget(args.progress, args.unlockAll);
    const pending = pendingList(args.progress).filter((l) => l.id !== target?.level.id);
    if (target) parts.push({ kind: "slot", slot: "frontier" }, pending.length ? { kind: "slot", slot: "pending" } : { kind: "slot", slot: "frontier" });
    else if (pending.length) parts.push({ kind: "slot", slot: "pending" }, { kind: "slot", slot: "pending" });
  }
  const due = dueReviews(args.reviews, args.date);
  if (due.length) parts.push({ kind: "review", levelIds: due.map((d) => d.levelId) });
  return parts;
}

/** Resolve a slot when it starts (the frontier may have moved after the previous set). */
export function resolveSlot(
  slot: "frontier" | "pending",
  progress: ProgressMap,
  unlockAll: boolean,
): { levelId: string; mode: Mode; reason: "frontier" | "prerequisite" | "pending" } | null {
  if (slot === "frontier") {
    const t = practiceTarget(progress, unlockAll);
    if (t) return { levelId: t.level.id, mode: t.reason === "prerequisite" ? "S" : lpOf(progress, t.level.id).mode, reason: t.reason };
  }
  const p = pendingList(progress)[0];
  if (p) return { levelId: p.id, mode: "S", reason: "pending" };
  if (slot === "pending") {
    const t = practiceTarget(progress, unlockAll);
    if (t) return { levelId: t.level.id, mode: t.reason === "prerequisite" ? "S" : lpOf(progress, t.level.id).mode, reason: t.reason };
  }
  return null;
}

export function masteredLevels(progress: ProgressMap): string[] {
  return LEVELS.filter((l) => isMastered(lpOf(progress, l.id))).map((l) => l.id);
}

export function challengeAvailable(progress: ProgressMap, lastDate: LocalDate | null, date: LocalDate): boolean {
  if (!masteredLevels(progress).length) return false;
  return lastDate === null || diffDays(date, lastDate) >= SPEC.rules.dailySession.weeklyChallenge.everyDays;
}
