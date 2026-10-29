// Spaced review after mastery (rules.spacedReview).
// intervalsDays are the gaps between successive reviews: due = previous review (or mastery) + interval.
import { SPEC, RULE_NUMBERS } from "./spec";
import { addDays, type LocalDate } from "./dates";

export interface ReviewItem {
  levelId: string;
  intervalIndex: number;
  dueDate: LocalDate;
  consecutiveFails: number;
}

const R = () => SPEC.rules.spacedReview;
export const intervalDays = (i: number) => R().intervalsDays[i] ?? R().thenEveryDays;

export function scheduleOnMastery(levelId: string, date: LocalDate, offsetDays?: number): ReviewItem {
  return { levelId, intervalIndex: 0, dueDate: addDays(date, offsetDays ?? intervalDays(0)), consecutiveFails: 0 };
}

export function applyReview(item: ReviewItem, passed: boolean, date: LocalDate): { item: ReviewItem | null; demoted: boolean } {
  if (passed) {
    const next = item.intervalIndex + 1;
    return { item: { ...item, intervalIndex: next, dueDate: addDays(date, intervalDays(next)), consecutiveFails: 0 }, demoted: false };
  }
  const fails = item.consecutiveFails + 1;
  if (fails >= R().demoteAfterConsecutiveFails) return { item: null, demoted: true };
  return { item: { ...item, intervalIndex: 0, dueDate: addDays(date, RULE_NUMBERS.reviewRetryDays), consecutiveFails: fails }, demoted: false };
}

/** Levels due today, oldest due date first, at most maxLevelsPerDay (the rest roll over). */
export function dueReviews(items: ReviewItem[], date: LocalDate): ReviewItem[] {
  return items
    .filter((i) => i.dueDate <= date)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.levelId.localeCompare(b.levelId))
    .slice(0, R().maxLevelsPerDay);
}
