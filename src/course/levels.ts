// Levels and stages of the one course (src/course/course.ts) for the screens and the records: the number on screen
// (label) comes from the position in the course, names from src/i18n/ja.ts, and texts that mention levels are
// shown with today's numbers.
import type { ErrorTypeId } from "@/domain/errors";
import { ERROR_TYPES } from "@/domain/spec";
import { KID_LEVEL_NAME, KID_STAGE_NAME } from "@/i18n/ja";
import { JERROR_TYPES, JSPEC, JSTAGES, isJukuLevelId, type JErrorTypeId } from "@/juku/spec";
import { COURSE, type Course, type CourseLevel, type CourseStage } from "./course";

/** every level of the course, in course order */
export const ALL_LEVELS: CourseLevel[] = COURSE.levels;
/** every stage of the course, in course order */
export const ALL_STAGES: CourseStage[] = COURSE.stages;

const has = (o: object, k: string | number) => Object.prototype.hasOwnProperty.call(o, k);

export const isCourseLevel = (id: string, course: Course = COURSE) => has(course.level, id);
export const isCourseStage = (id: number, course: Course = COURSE) => has(course.stage, id);

export function levelSpec(id: string): CourseLevel {
  if (!isCourseLevel(id)) throw new Error(`unknown level ${id}`);
  return COURSE.level[id];
}

export function stageSpec(id: number): CourseStage {
  if (!isCourseStage(id)) throw new Error(`unknown stage ${id}`);
  return COURSE.stage[id];
}

/** "5-2": the stage's number and the place in the stage */
export const levelLabel = (id: string, course: Course = COURSE) => (isCourseLevel(id, course) ? course.level[id].label : "—");
/** the stage's number on screen (its position in the course) */
export const stageNo = (id: number, course: Course = COURSE) => (isCourseStage(id, course) ? course.stage[id].no : -1);

/** the child's name of a level; records can hold levels this version does not have */
export const levelName = (id: string) => (isCourseLevel(id) && KID_LEVEL_NAME[id]) || "（いまは ない レベル）";
export const stageName = (id: number) => (isCourseStage(id) && KID_STAGE_NAME[id]) || "（いまは ない ステージ）";

const isDigit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";

/**
 * A text as it is shown: {id} becomes the level's number, and a level id written as numbers (curriculum.json writes
 * "5-1〜5-10の問題") becomes its number today. Dates and decimals are left alone.
 */
export function displayText(text: string, course: Course = COURSE): string {
  // one pass, so a number put in for {id} is never read again as an id
  return text.replace(/\{([a-z0-9-]+)\}|(\d+)-(\d+)/g, (m: string, id: string | undefined, _a: string, _b: string, at: number, s: string) => {
    if (id !== undefined) return isCourseLevel(id, course) ? course.level[id].label : m;
    const before = s[at - 1];
    const after = s[at + m.length];
    if (isDigit(before) || before === "-" || before === "." || isDigit(after) || after === "-") return m;
    return isCourseLevel(m, course) ? course.level[m].label : m;
  });
}

/** levels whose problems come from src/juku (the other engine is src/domain) */
export const isJukuLevel = isJukuLevelId;
export const isJukuStage = (id: number) => JSTAGES.some((s) => s.id === id);

export type CourseErrorTypeId = ErrorTypeId | JErrorTypeId;

/** the mistake types of both specs: the six of curriculum.json, then 約分・形 and 時間の60と100 */
export const COURSE_ERROR_TYPES: { id: CourseErrorTypeId; name: string; detect: string; remedy: string }[] = [
  ...ERROR_TYPES.map((e) => ({ ...e, id: e.id as ErrorTypeId })),
  ...JERROR_TYPES,
];

/** extra remedy words for a mistake type when the child practises the decimal, pi, unit and estimation stages */
export const remedyAddendum = (id: string): string | null => JSPEC.remedyAddendum[id] ?? null;
