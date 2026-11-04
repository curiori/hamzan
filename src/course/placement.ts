// The diagnosis (rules.placement) over the one course, with the rules of src/domain/placement.ts: stage checks from
// the grade's first stage, then 5-problem mini checks, in course order. The saved state keeps stage ids, so a
// diagnosis begun before an update goes on. With only stages 0–5 this is exactly src/domain
// (tests/course/placement.test.ts).
import { addDays, type LocalDate } from "@/domain/dates";
import { addPlacementTime, placementBudgetLeft, type PlacementState } from "@/domain/placement";
import { freshProgress, type ProgressMap } from "@/domain/progression";
import { scheduleOnMastery, type ReviewItem } from "@/domain/review";
import { RULE_NUMBERS, SPEC, type Mode } from "@/domain/spec";
import { COURSE, type Course } from "./course";

export { addPlacementTime, placementBudgetLeft, type PlacementState };

const posOf = (course: Course, stageId: number) => course.stages.findIndex((s) => s.id === stageId);

export function startPlacement(grade: number, course: Course = COURSE): PlacementState {
  const start = SPEC.rules.placement.startStageByGrade[String(grade)] ?? 0;
  const stage = course.stage[start] ? start : course.stages[0].id;
  return { grade, stage, phase: "stageCheck", miniIndex: 0, checked: [], passed: [], masteredStages: [], pendingFrontier: null, result: null, day: null, secondsToday: 0, days: 0 };
}

const finishWith = (st: PlacementState, result: { frontier: string | null; mode: Mode }): PlacementState => ({ ...st, phase: "done", result });

/** after a passed stage: the next stage (course order) the diagnosis has not passed, or the end */
function afterStagePassed(st: PlacementState, stage: number, course: Course): PlacementState {
  if (st.pendingFrontier) return finishWith(st, { frontier: st.pendingFrontier.levelId, mode: st.pendingFrontier.mode });
  const next = course.stages.slice(posOf(course, stage) + 1).find((s) => !st.passed.includes(s.id));
  if (!next) return finishWith(st, { frontier: null, mode: "S" });
  return { ...st, stage: next.id, phase: "stageCheck", miniIndex: 0 };
}

export function applyStageCheck(st: PlacementState, misses: number, perSec: number, t2: number, t3: number, course: Course = COURSE): PlacementState {
  const stage = st.stage;
  const next = { ...st, checked: [...st.checked, stage] };
  if (misses <= RULE_NUMBERS.stageCheckMaxMisses && perSec <= t2) {
    next.passed = [...st.passed, stage];
    if (perSec <= t3) next.masteredStages = [...st.masteredStages, stage];
    return afterStagePassed(next, stage, course);
  }
  return { ...next, phase: "mini", miniIndex: 0 };
}

export function miniLevel(st: PlacementState, course: Course = COURSE): string {
  return course.stage[st.stage].levelIds[st.miniIndex];
}

export function applyMiniCheck(st: PlacementState, misses: number, perSec: number, t2: number, course: Course = COURSE): PlacementState {
  const levelId = miniLevel(st, course);
  if (misses === 0 && perSec <= t2) {
    const idx = st.miniIndex + 1;
    if (idx < course.stage[st.stage].levelIds.length) return { ...st, miniIndex: idx };
    return afterStagePassed(st, st.stage, course);
  }
  const mode: Mode = misses > 0 ? course.level[levelId].modes[0] : "S";
  const i = posOf(course, st.stage);
  const prev = i > 0 ? course.stages[i - 1] : null;
  if (st.miniIndex === 0 && prev && !st.checked.includes(prev.id)) {
    return { ...st, pendingFrontier: { levelId, mode }, stage: prev.id, phase: "stageCheck", miniIndex: 0 };
  }
  return finishWith(st, { frontier: levelId, mode });
}

/** Earlier levels (course order) count as ★2; mastered stages enter review spread over 14 days. */
export function applyPlacementResult(st: PlacementState, date: LocalDate, course: Course = COURSE): { progress: ProgressMap; reviews: ReviewItem[]; clearedStages: number[] } {
  const progress: ProgressMap = {};
  const reviews: ReviewItem[] = [];
  const frontier = st.result?.frontier ? course.level[st.result.frontier] : undefined;
  const frontierOrder = frontier ? frontier.order : Infinity;
  let spreadIndex = 0;
  for (const lv of course.levels) {
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
  const clearedStages = course.stages.filter((s) => s.levelIds.every((id) => course.level[id].order < frontierOrder)).map((s) => s.id);
  return { progress, reviews: reviews.map((r) => ({ ...r, dueDate: r.dueDate < date ? addDays(date, 1) : r.dueDate })), clearedStages };
}
