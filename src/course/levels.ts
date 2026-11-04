// Stages 0–5 (src/domain, curriculum.json) and stages 6–9 (src/juku, juku.json) as one course.
// The screens and the records look levels and stages up here instead of in one of the two specs.
import type { ErrorTypeId } from "@/domain/errors";
import { ERROR_TYPES, LEVEL, LEVELS, STAGES, type LevelSpec, type StageSpec } from "@/domain/spec";
import { JERROR_TYPES, JLEVEL, JLEVELS, JSPEC, JSTAGES, isJukuLevelId, type JErrorTypeId } from "@/juku/spec";

/** every level of stages 0–9, in order */
export const ALL_LEVELS: LevelSpec[] = [...LEVELS, ...JLEVELS];
/** every stage, 0–9 */
export const ALL_STAGES: StageSpec[] = [...STAGES, ...JSTAGES];

export function levelSpec(id: string): LevelSpec {
  const lv = LEVEL[id] ?? JLEVEL[id];
  if (!lv) throw new Error(`unknown level ${id}`);
  return lv;
}

export function stageSpec(id: number): StageSpec {
  const st = ALL_STAGES.find((s) => s.id === id);
  if (!st) throw new Error(`unknown stage ${id}`);
  return st;
}

export const isJukuLevel = isJukuLevelId;
export const isJukuStage = (id: number) => JSTAGES.some((s) => s.id === id);

export type CourseErrorTypeId = ErrorTypeId | JErrorTypeId;

/** the mistake types of both specs: the six of curriculum.json, then 約分・形 and 時間の60と100 */
export const COURSE_ERROR_TYPES: { id: CourseErrorTypeId; name: string; detect: string; remedy: string }[] = [
  ...ERROR_TYPES.map((e) => ({ ...e, id: e.id as ErrorTypeId })),
  ...JERROR_TYPES,
];

/** extra remedy words for a mistake type when the child practises stages 6–9 */
export const remedyAddendum = (id: string): string | null => JSPEC.remedyAddendum[id] ?? null;
