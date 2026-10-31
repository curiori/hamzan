import type { LocalDate } from "@/domain/dates";
import type { ProgressEvent } from "@/domain/progression";
import type { SetKind } from "@/state/types";

// Sunflower seeds: earned by practice only, spent only in the shop, and never part of how learning is judged.
// Every amount is here, so the economy is tuned in one place.

export const SEEDS = {
  /** today's practice (a set started as a part of today's session), per first right answer; not the warm-up */
  sessionCorrect: 1,
  sessionComplete: 5,
  warmup: 3,
  /** free practice (extra sets) pays 1 per this many first right answers */
  extraCorrectPer: 2,
  extraComplete: 2,
  placementCorrect: 1,
  challengeCorrect: 1,
  goal: 20,
  star2: 10,
  mastered: 30,
  stageCheck: 50,
  /** per review level passed */
  review: 5,
  /** once per level a day */
  personalBest: 5,
  challengeBest: 10,
  /** free practice answers and finishing pay at most this much a day; milestones are never capped */
  extraDailyCap: 50,
} as const;

export interface Wallet {
  seeds: number;
  lifetime: number;
  /** the day earnedToday and bestToday belong to */
  day: LocalDate | null;
  /** seeds from free practice on that day */
  earnedToday: number;
  /** levels whose personal best was paid on that day */
  bestToday: string[];
}

export const emptyWallet = (): Wallet => ({ seeds: 0, lifetime: 0, day: null, earnedToday: 0, bestToday: [] });

export type LedgerReason = "set" | "buy" | "gift";

/** One movement of seeds: a finished set, a purchase (negative) or a test-tool gift. */
export interface LedgerEntry {
  at: number;
  date: LocalDate;
  delta: number;
  reason: LedgerReason;
  ref?: string;
}

export const MAX_LEDGER = 300;

/** The ledger with `e` added, keeping the newest MAX_LEDGER entries. */
export const appendLedger = (ledger: LedgerEntry[], e: LedgerEntry): LedgerEntry[] => [...ledger, e].slice(-MAX_LEDGER);

export type SeedLineKind = "correct" | "complete" | "warmup" | "goal" | "star2" | "mastered" | "stageCheck" | "review" | "personalBest" | "challengeBest";

/** One line of the result screen's breakdown; count is the number of right answers behind a "correct" line. */
export interface SeedLine {
  kind: SeedLineKind;
  seeds: number;
  count?: number;
}

export interface SeedInput {
  kind: SetKind;
  /** started as a part of today's session */
  inSession: boolean;
  interrupted: boolean;
  /** problems answered right the first time */
  firstCorrect: number;
  levelId: string | null;
  levelMasteredBefore: boolean;
  events: ProgressEvent[];
  reviewsPassed: number;
  stageCheckPassed: boolean;
  goalReached: boolean;
  challengeBestNew: boolean;
}

export interface SeedAward {
  lines: SeedLine[];
  total: number;
  /** the free practice cap cut something from this set */
  capped: boolean;
  wallet: Wallet;
}

/** The seeds one finished set earns, in the order the result screen lists them, and the wallet after them. */
export function awardSeeds(w0: Wallet, input: SeedInput, date: LocalDate): SeedAward {
  const w: Wallet = w0.day === date ? w0 : { ...w0, day: date, earnedToday: 0, bestToday: [] };
  const free = input.kind === "extra";
  if (input.interrupted) {
    // the set itself earns nothing, but the day's goal it reaches is a milestone of the day
    const goal = input.goalReached ? SEEDS.goal : 0;
    const wallet = { ...w, seeds: w.seeds + goal, lifetime: w.lifetime + goal };
    return { lines: goal ? [{ kind: "goal", seeds: goal }] : [], total: goal, capped: false, wallet };
  }
  if (free && input.levelMasteredBefore) return { lines: [], total: 0, capped: false, wallet: w };

  const lines: SeedLine[] = [];
  const add = (kind: SeedLineKind, seeds: number, count?: number) => {
    if (seeds > 0) lines.push(count === undefined ? { kind, seeds } : { kind, seeds, count });
  };
  let earnedToday = w.earnedToday;
  let capped = false;

  if (free) {
    const rawCorrect = Math.floor(input.firstCorrect / SEEDS.extraCorrectPer);
    const left = Math.max(0, SEEDS.extraDailyCap - earnedToday);
    const correct = Math.min(rawCorrect, left);
    const complete = Math.min(SEEDS.extraComplete, left - correct);
    capped = correct < rawCorrect || complete < SEEDS.extraComplete;
    earnedToday += correct + complete;
    add("correct", correct, input.firstCorrect);
    add("complete", complete);
  } else if (input.kind === "warmup") {
    add("warmup", SEEDS.warmup);
  } else if (input.kind === "placement") {
    add("correct", input.firstCorrect * SEEDS.placementCorrect, input.firstCorrect);
  } else if (input.kind === "challenge") {
    add("correct", input.firstCorrect * SEEDS.challengeCorrect, input.firstCorrect);
  } else if (input.inSession) {
    add("correct", input.firstCorrect * SEEDS.sessionCorrect, input.firstCorrect);
    add("complete", SEEDS.sessionComplete);
  }

  if (input.events.includes("star2")) add("star2", SEEDS.star2);
  if (input.events.includes("mastered")) add("mastered", SEEDS.mastered);
  if (input.kind === "stage_check" && input.stageCheckPassed) add("stageCheck", SEEDS.stageCheck);
  add("review", input.reviewsPassed * SEEDS.review);
  let bestToday = w.bestToday;
  if (input.events.includes("personalBest") && input.levelId && !bestToday.includes(input.levelId)) {
    add("personalBest", SEEDS.personalBest);
    bestToday = [...bestToday, input.levelId];
  }
  if (input.challengeBestNew) add("challengeBest", SEEDS.challengeBest);
  if (input.goalReached) add("goal", SEEDS.goal);

  const total = lines.reduce((sum, l) => sum + l.seeds, 0);
  return { lines, total, capped, wallet: { ...w, seeds: w.seeds + total, lifetime: w.lifetime + total, earnedToday, bestToday } };
}
