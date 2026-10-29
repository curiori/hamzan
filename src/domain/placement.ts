// Placement (rules.placement): stage checks from the grade's start stage, then 5-problem mini checks.
import { LEVEL, LEVELS, RULE_NUMBERS, SPEC, STAGES, type Mode } from "./spec";
import { addDays, type LocalDate } from "./dates";
import { freshProgress, type ProgressMap } from "./progression";
import { scheduleOnMastery, type ReviewItem } from "./review";

export interface PlacementState {
  grade: number;
  stage: number;
  phase: "stageCheck" | "mini" | "done";
  miniIndex: number;
  checked: number[];
  passed: number[];
  masteredStages: number[];
  /** set when a stage's first level fails and we step down to the previous stage's check */
  pendingFrontier: { levelId: string; mode: Mode } | null;
  result: { frontier: string | null; mode: Mode } | null;
  day: LocalDate | null;
  secondsToday: number;
  days: number;
}

const lastStage = () => STAGES[STAGES.length - 1].id;
const firstMode = (levelId: string): Mode => LEVEL[levelId].modes[0];

export function startPlacement(grade: number): PlacementState {
  const map = SPEC.rules.placement.startStageByGrade;
  const stage = map[String(grade)] ?? 0;
  return { grade, stage, phase: "stageCheck", miniIndex: 0, checked: [], passed: [], masteredStages: [], pendingFrontier: null, result: null, day: null, secondsToday: 0, days: 0 };
}

/** Time budget: maxMinutesPerDay, counted per local date. */
export function placementBudgetLeft(st: PlacementState, date: LocalDate): number {
  const used = st.day === date ? st.secondsToday : 0;
  return SPEC.rules.placement.maxMinutesPerDay * 60 - used;
}

export function addPlacementTime(st: PlacementState, date: LocalDate, sec: number): PlacementState {
  if (st.day === date) return { ...st, secondsToday: st.secondsToday + sec };
  return { ...st, day: date, secondsToday: sec, days: st.days + 1 };
}

function finishWith(st: PlacementState, result: { frontier: string | null; mode: Mode }): PlacementState {
  return { ...st, phase: "done", result };
}

function afterStagePassed(st: PlacementState, stage: number): PlacementState {
  if (st.pendingFrontier) return finishWith(st, { frontier: st.pendingFrontier.levelId, mode: st.pendingFrontier.mode });
  if (stage >= lastStage()) return finishWith(st, { frontier: null, mode: "S" });
  return { ...st, stage: stage + 1, phase: "stageCheck", miniIndex: 0 };
}

export function applyStageCheck(st: PlacementState, misses: number, perSec: number, t2: number, t3: number): PlacementState {
  const stage = st.stage;
  const next = { ...st, checked: [...st.checked, stage] };
  if (misses <= RULE_NUMBERS.stageCheckMaxMisses && perSec <= t2) {
    next.passed = [...st.passed, stage];
    if (perSec <= t3) next.masteredStages = [...st.masteredStages, stage];
    return afterStagePassed(next, stage);
  }
  return { ...next, phase: "mini", miniIndex: 0 };
}

export function miniLevel(st: PlacementState): string {
  return STAGES[st.stage].levelIds[st.miniIndex];
}

export function applyMiniCheck(st: PlacementState, misses: number, perSec: number, t2: number): PlacementState {
  const levelId = miniLevel(st);
  if (misses === 0 && perSec <= t2) {
    const idx = st.miniIndex + 1;
    if (idx < STAGES[st.stage].levelIds.length) return { ...st, miniIndex: idx };
    return afterStagePassed(st, st.stage);
  }
  const mode: Mode = misses > 0 ? firstMode(levelId) : "S";
  if (st.miniIndex === 0 && st.stage > 0 && !st.checked.includes(st.stage - 1)) {
    return { ...st, pendingFrontier: { levelId, mode }, stage: st.stage - 1, phase: "stageCheck", miniIndex: 0 };
  }
  return finishWith(st, { frontier: levelId, mode });
}

/** Apply the outcome: earlier levels count as ★2, mastered stages enter review spread over 14 days. */
export function applyPlacementResult(
  st: PlacementState,
  date: LocalDate,
): { progress: ProgressMap; reviews: ReviewItem[]; clearedStages: number[] } {
  const progress: ProgressMap = {};
  const reviews: ReviewItem[] = [];
  const frontierOrder = st.result?.frontier ? LEVEL[st.result.frontier].order : Infinity;
  let spreadIndex = 0;
  for (const lv of LEVELS) {
    const p = freshProgress(lv);
    if (lv.order < frontierOrder) {
      p.star2At = date;
      p.mode = "S";
      p.practiced = true;
      p.bestStars = 2;
      if (st.masteredStages.includes(lv.stage)) {
        p.masteredAt = date;
        p.bestStars = 3;
        reviews.push(scheduleOnMastery(lv.id, date, 1 + (spreadIndex++ % 14)));
      }
      progress[lv.id] = p;
    } else if (lv.id === st.result?.frontier) {
      p.mode = st.result.mode;
      progress[lv.id] = p;
    }
  }
  // stages entirely before the frontier count as cleared: their stage check is not asked again
  const clearedStages = STAGES.filter((s) => s.levelIds.every((id) => LEVEL[id].order < frontierOrder)).map((s) => s.id);
  return { progress, reviews: reviews.map((r) => ({ ...r, dueDate: r.dueDate < date ? addDays(date, 1) : r.dueDate })), clearedStages };
}
