import type { LocalDate } from "@/domain/dates";
import type { ErrorTypeId } from "@/domain/errors";
import type { SetResult } from "@/domain/judge";
import type { PlacementState } from "@/domain/placement";
import type { Answer, Problem, ProblemInstance } from "@/domain/problem";
import type { ProgressEvent, ProgressMap } from "@/domain/progression";
import type { ReviewItem } from "@/domain/review";
import type { SessionPart, StageCheckRecord } from "@/domain/session";
import type { Coeffs, Mode } from "@/domain/spec";

// Everything is stored on this device only (C-1). One record per child profile.

export type SetKind = "main" | "extra" | "review" | "warmup" | "placement" | "stage_check" | "challenge";

export interface Settings {
  timer: boolean;
  autoSubmit: boolean;
  sound: boolean;
  vibration: boolean;
  coeffs: { star2: Coeffs; star3: Coeffs } | null;
}
export const DEFAULT_SETTINGS: Settings = { timer: false, autoSubmit: true, sound: true, vibration: true, coeffs: null };

export interface SetAttempt {
  id: string;
  kind: SetKind;
  levelId: string | null;
  mode: Mode;
  date: LocalDate;
  startedAt: number;
  n: number;
  errors: number;
  perProblemSec: number;
  target2: number;
  target3: number;
  result: SetResult | "pass" | "fail" | "done";
}

export interface FactStat {
  levelId: string;
  problem: Problem;
  attempts: number;
  errors: number;
  errorDates: LocalDate[];
  lastErrorDate: LocalDate | null;
  lastSlowDate: LocalDate | null;
  lastLatencyMs: number | null;
  lastSeen: LocalDate;
}

export interface ErrorRecord {
  date: LocalDate;
  levelId: string;
  factKey: string;
  type: ErrorTypeId;
  problem: Problem;
}

export interface SessionDay {
  plan: SessionPart[];
  done: number;
  goal: boolean;
}

export interface Profile {
  id: string;
  nickname: string;
  grade: number;
  createdAt: number;
  writeSecPerDigit: number | null;
  writeTestedAt: LocalDate | null;
  settings: Settings;
  progress: ProgressMap;
  reviews: ReviewItem[];
  sets: SetAttempt[];
  facts: Record<string, FactStat>;
  errors: ErrorRecord[];
  stageChecks: Record<number, StageCheckRecord>;
  sessions: Record<LocalDate, SessionDay>;
  challenge: { lastDate: LocalDate | null; bestSec: number | null };
  placement: PlacementState | null;
  placementDone: boolean;
  /** the child has seen the end-of-diagnosis screen */
  placementSeen?: boolean;
  /** ★2 / mastered counts handed out by the diagnosis; rewards only count what comes after */
  rewardBaseline?: { star2: number; mastered: number };
  wearing: string | null;
}

export interface ProblemResult {
  inst: ProblemInstance;
  /** first answer correct (H: no blank had to be revealed; M: memo and answer right) */
  correct: boolean;
  given: Answer | null;
  latencyMs: number;
}

export interface SetRun {
  kind: SetKind;
  mode: Mode;
  levelId: string | null;
  results: ProblemResult[];
  interrupted: boolean;
  fixedSet?: boolean;
  sessionPart?: number;
  /** the day whose session plan sessionPart belongs to (a set can end after midnight) */
  sessionDate?: LocalDate;
  stage?: number;
  placementPhase?: "stageCheck" | "mini";
  activeSec: number;
}

export interface SetSummary {
  kind: SetKind;
  levelId: string | null;
  mode: Mode;
  result: SetResult | null;
  stars: number;
  n: number;
  errors: number;
  perProblemSec: number;
  t2: number;
  t3: number;
  prevBest: number | null;
  events: ProgressEvent[];
  nextMode: Mode | null;
  reviews: { levelId: string; passed: boolean; demoted: boolean }[];
  stageCheck: { stage: number; passed: boolean } | null;
  placement: PlacementState | null;
  challengeBest: { sec: number | null; isNew: boolean } | null;
  goalReached: boolean;
  newRewards: string[];
}

export interface DevSettings {
  dayOffset: number;
  unlockAll: boolean;
  shortPlacement: boolean;
  /** test tool: the room shows every good (records are untouched); missing in older saves means off */
  roomAllGoods?: boolean;
}

export interface PinRecord {
  hash: string;
  salt: string;
}
