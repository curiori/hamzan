// Answer timing for one set. Pure functions over a plain state object (no React Native imports).
// Time does not count while any pause reason is active; overlapping reasons are counted once,
// so a manual pause that continues in the background is never subtracted twice.

export type PauseReason = "user" | "background";

export interface ClockState {
  /** when the current item's timing starts (after the grace period) */
  itemStart: number;
  /** start of the current not-counting interval, null while counting */
  pausedSince: number | null;
  reasons: PauseReason[];
  /** not-counting time inside the current item, closed intervals only */
  itemPaused: number;
  /** answer time of the committed items */
  activeTotal: number;
  backgroundSince: number | null;
  /** closed background intervals, for the interruption rule */
  backgroundTotal: number;
}

export const GRACE_MS = 150;

export function createClock(now: number, graceMs = GRACE_MS): ClockState {
  return { itemStart: now + graceMs, pausedSince: null, reasons: [], itemPaused: 0, activeTotal: 0, backgroundSince: null, backgroundTotal: 0 };
}

export function startItem(c: ClockState, now: number, graceMs = GRACE_MS): ClockState {
  return { ...c, itemStart: now + graceMs, itemPaused: 0, pausedSince: c.reasons.length ? now : null };
}

/** not-counting time of an interval that started at `since`, clipped to the current item */
const pausedPart = (c: ClockState, since: number, now: number) => Math.max(0, now - Math.max(since, c.itemStart));

export function pauseFor(c: ClockState, reason: PauseReason, now: number): ClockState {
  if (c.reasons.includes(reason)) return c;
  return {
    ...c,
    reasons: [...c.reasons, reason],
    pausedSince: c.reasons.length ? c.pausedSince : now,
    backgroundSince: reason === "background" ? now : c.backgroundSince,
  };
}

export function resumeFor(c: ClockState, reason: PauseReason, now: number): ClockState {
  if (!c.reasons.includes(reason)) return c;
  const reasons = c.reasons.filter((r) => r !== reason);
  const next: ClockState = { ...c, reasons };
  if (reason === "background" && c.backgroundSince !== null) {
    next.backgroundTotal = c.backgroundTotal + (now - c.backgroundSince);
    next.backgroundSince = null;
  }
  if (!reasons.length && c.pausedSince !== null) {
    next.itemPaused = c.itemPaused + pausedPart(c, c.pausedSince, now);
    next.pausedSince = null;
  }
  return next;
}

export function itemElapsedMs(c: ClockState, now: number): number {
  const open = c.pausedSince !== null ? pausedPart(c, c.pausedSince, now) : 0;
  return Math.max(0, now - c.itemStart - c.itemPaused - open);
}

export function commitItem(c: ClockState, now: number): { clock: ClockState; latencyMs: number } {
  const latencyMs = itemElapsedMs(c, now);
  return { clock: { ...c, activeTotal: c.activeTotal + latencyMs }, latencyMs };
}

export function backgroundMs(c: ClockState, now: number): number {
  return c.backgroundTotal + (c.backgroundSince !== null ? now - c.backgroundSince : 0);
}

export function isInterrupted(c: ClockState, now: number, limitSec: number): boolean {
  return backgroundMs(c, now) > limitSec * 1000;
}
