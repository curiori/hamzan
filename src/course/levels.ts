// Levels and stages of the one course (src/course/course.ts) for the screens and the records: the number on screen
// (label) comes from the position in the course, names from src/i18n/ja.ts, and texts that mention levels are
// shown with today's numbers.
import type { ErrorTypeId } from "@/domain/errors";
import { ERROR_TYPES } from "@/domain/spec";
import { KID_LEVEL_NAME, KID_STAGE_NAME } from "@/i18n/ja";
import { JERROR_TYPES, JSPEC, isJukuLevelId, type JErrorTypeId } from "@/juku/spec";
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

const REF = /\{([a-z0-9-]+)\}|(\d+)-(\d+)/g;

/** A level a text names: {id}, or a level id written as numbers (curriculum.json writes "5-1〜5-10の問題"). Dates and decimals are not. */
function refAt(m: string, braced: string | undefined, at: number, s: string): { id: string; braced: boolean } | null {
  if (braced !== undefined) return { id: braced, braced: true };
  const before = s[at - 1];
  const after = s[at + m.length];
  if (isDigit(before) || before === "-" || before === "." || isDigit(after) || after === "-") return null;
  return { id: m, braced: false };
}

/** the id an {id} names today: renames followed */
const renamedTo = (id: string, course: Course) => (has(course.renamed, id) ? course.renamed[id] : id);

/**
 * A text as it is shown: {id} becomes the level's number (after a rename too), and a level id written as numbers
 * becomes its number today. Dates and decimals are left alone.
 */
export function displayText(text: string, course: Course = COURSE): string {
  // one pass, so a number put in for {id} is never read again as an id
  return text.replace(REF, (m: string, braced: string | undefined, _a: string, _b: string, at: number, s: string) => {
    const ref = refAt(m, braced, at, s);
    if (!ref) return m;
    const id = ref.braced ? renamedTo(ref.id, course) : ref.id;
    return isCourseLevel(id, course) ? course.level[id].label : m;
  });
}

/**
 * What displayText could not show right (tests run it over the shown texts): an {id} that names no level of the
 * course, or a level written as numbers that the course retired (that number now belongs to another level).
 */
export function levelRefErrors(text: string, course: Course = COURSE): string[] {
  const errs: string[] = [];
  for (const m of text.matchAll(REF)) {
    const ref = refAt(m[0], m[1], m.index ?? 0, text);
    if (!ref) continue;
    if (ref.braced && !isCourseLevel(renamedTo(ref.id, course), course)) errs.push(`「${text}」の {${ref.id}} はコースのレベルではありません`);
    else if (!ref.braced && course.retiredLevels.includes(ref.id)) errs.push(`「${text}」の ${ref.id} は外したレベルです`);
  }
  return errs;
}

/** levels whose problems come from src/juku (the other engine is src/domain) */
export const isJukuLevel = isJukuLevelId;

export type CourseErrorTypeId = ErrorTypeId | JErrorTypeId;

/** the mistake types of both specs: the six of curriculum.json, then 約分・形 and 時間の60と100 */
export const COURSE_ERROR_TYPES: { id: CourseErrorTypeId; name: string; detect: string; remedy: string }[] = [
  ...ERROR_TYPES.map((e) => ({ ...e, id: e.id as ErrorTypeId })),
  ...JERROR_TYPES,
];

/** extra remedy words for a mistake type when the child practises the decimal, pi, unit and estimation stages */
export const remedyAddendum = (id: string): string | null => JSPEC.remedyAddendum[id] ?? null;
