// Today's practice with 塾の単元: one main set for the opened units (their starting check first), one for
// stages 0–5, so the day keeps its two main sets (rules.dailySession: 7–10 minutes).
import { diffDays, type LocalDate } from "@/domain/dates";
import type { ProgressMap } from "@/domain/progression";
import type { ReviewItem } from "@/domain/review";
import { planDailySession, type SessionPart, type StageCheckRecord } from "@/domain/session";
import { jukuActive, jukuStageCheckDue, nextCheck, resolveJukuSlot, type JukuState } from "@/juku/track";

/** the 塾の単元 part: the starting check while one is waiting, else practice (frontier first, or pending first) */
export interface JukuPart {
  kind: "juku";
  slot: "frontier" | "pending";
}

export type DayPart = SessionPart | JukuPart;

/** On days with a juku part, the one stage 0–5 set alternates: moving on one day, ★3 practice the next. */
export function coreSlotOn(date: LocalDate): "frontier" | "pending" {
  return diffDays(date, "2000-01-01") % 2 === 0 ? "frontier" : "pending";
}

export function planDay(args: {
  progress: ProgressMap;
  reviews: ReviewItem[];
  stageChecks: Record<number, StageCheckRecord>;
  date: LocalDate;
  unlockAll: boolean;
  juku: JukuState;
}): DayPart[] {
  const core = planDailySession(args);
  if (!jukuActive(args.juku)) return core;
  const checking = nextCheck(args.progress, args.juku) !== null;
  const stage = checking ? null : jukuStageCheckDue(args.progress, args.stageChecks);
  if (!checking && stage === null && !resolveJukuSlot("frontier", args.progress, args.juku)) return core;

  const juku: DayPart = stage !== null ? { kind: "stageCheck", stage } : { kind: "juku", slot: "frontier" };
  const coreCheck = core.find((p) => p.kind === "stageCheck");
  const coreSlots = core.some((p) => p.kind === "slot");
  const second: DayPart = coreCheck ?? (coreSlots ? { kind: "slot", slot: coreSlotOn(args.date) } : { kind: "juku", slot: "pending" });
  return [...core.filter((p) => p.kind === "warmup"), juku, second, ...core.filter((p) => p.kind === "review")];
}
