// The one course: course.json gives the order of the stages (the number on screen is the position), the ids that were
// renamed or retired, and every id any version used. What a level or a stage is comes from its spec, curriculum.json
// (stage ids 0–5) or juku.json (6–9). Records keep ids; nothing reads a number out of an id.
import { LEVELS, STAGES, type LevelSpec, type StageSpec } from "@/domain/spec";
import { JLEVELS, JSTAGES } from "@/juku/spec";
import raw from "./course.json";

export interface CourseManifest {
  version: number;
  /** stages in course order; `levels` replaces the stage's own level list (to move levels between stages) */
  stages: { id: number; levels?: string[] }[];
  /** an id a version used → the id the level has now */
  renamedLevels: Record<string, string>;
  retiredLevels: string[];
  retiredStages: number[];
  /** every level id any version used, added to and never trimmed */
  levelIdsEverUsed: string[];
  stageIdsEverUsed: number[];
}

export interface CourseSources {
  stages: StageSpec[];
  levels: LevelSpec[];
}

/** A level as the course has it: `order` is its position in the course, `stage` its stage id, `label` the number on screen. */
export type CourseLevel = LevelSpec & { R?: number; no: number; label: string };

/** A stage as the course has it: `no` is the number on screen, `levelIds` the course order. */
export interface CourseStage extends StageSpec {
  no: number;
}

export interface Course {
  version: number;
  stages: CourseStage[];
  levels: CourseLevel[];
  level: Record<string, CourseLevel>;
  stage: Record<number, CourseStage>;
  /** an old id → the id now (chains followed) */
  renamed: Record<string, string>;
  retiredLevels: string[];
  retiredStages: number[];
}

export const MANIFEST = raw as CourseManifest;
export const SOURCES: CourseSources = { stages: [...STAGES, ...JSTAGES], levels: [...LEVELS, ...JLEVELS] };

const has = (o: object, k: string | number) => Object.prototype.hasOwnProperty.call(o, k);

/** follows a → b → c; null when the chain loops */
function follow(renamed: Record<string, string>, id: string): string | null {
  let cur = id;
  for (let i = 0; i <= Object.keys(renamed).length; i++) {
    if (!has(renamed, cur)) return cur;
    cur = renamed[cur];
  }
  return null;
}

export function buildCourse(m: CourseManifest, sources: CourseSources): Course {
  const specs = new Map(sources.levels.map((l) => [l.id, l]));
  const stageSpecs = new Map(sources.stages.map((s) => [s.id, s]));
  const stages: CourseStage[] = [];
  const levels: CourseLevel[] = [];
  m.stages.forEach((entry, no) => {
    const st = stageSpecs.get(entry.id);
    if (!st) throw new Error(`course.json: stage ${entry.id} has no spec`);
    const ids = entry.levels ?? st.levelIds;
    ids.forEach((id, i) => {
      const spec = specs.get(id);
      if (!spec) throw new Error(`course.json: level ${id} of stage ${entry.id} has no spec`);
      levels.push({ ...spec, stage: st.id, order: levels.length, no: i + 1, label: `${no}-${i + 1}` });
    });
    stages.push({ ...st, levelIds: [...ids], no });
  });
  const renamed = Object.fromEntries(Object.keys(m.renamedLevels).map((id) => [id, follow(m.renamedLevels, id) ?? id]));
  return {
    version: m.version,
    stages,
    levels,
    level: Object.fromEntries(levels.map((l) => [l.id, l])),
    stage: Object.fromEntries(stages.map((s) => [s.id, s])),
    renamed,
    retiredLevels: [...m.retiredLevels],
    retiredStages: [...m.retiredStages],
  };
}

export const COURSE: Course = buildCourse(MANIFEST, SOURCES);

/** the ids of course.json that children's records may hold: never trimmed, so no id is ever given to another level */
export type ShippedIds = Pick<CourseManifest, "levelIdsEverUsed" | "stageIdsEverUsed" | "renamedLevels" | "retiredLevels" | "retiredStages">;

/**
 * course.json against a copy of the ids that went out (tests/course/shipped-ids.json): none may leave the lists of
 * used ids, change where it was renamed to, or stop being retired. Trimming course.json alone then frees no id.
 */
export function shippedIdErrors(m: ShippedIds, shipped: ShippedIds): string[] {
  const errs: string[] = [];
  const ever = new Set(m.levelIdsEverUsed);
  for (const id of shipped.levelIdsEverUsed) if (!ever.has(id)) errs.push(`配った ID ${id} が levelIdsEverUsed から消えています`);
  const everStages = new Set(m.stageIdsEverUsed);
  for (const id of shipped.stageIdsEverUsed) if (!everStages.has(id)) errs.push(`配ったステージ ${id} が stageIdsEverUsed から消えています`);
  for (const [from, to] of Object.entries(shipped.renamedLevels))
    if (!has(m.renamedLevels, from) || m.renamedLevels[from] !== to) errs.push(`配った付け替え ${from} → ${to} が変わっています`);
  for (const id of shipped.retiredLevels) if (!m.retiredLevels.includes(id)) errs.push(`外したレベル ${id} が retiredLevels から消えています`);
  for (const id of shipped.retiredStages) if (!m.retiredStages.includes(id)) errs.push(`外したステージ ${id} が retiredStages から消えています`);
  return errs;
}

/**
 * What a content change must keep true (tests run it). Every message names the id it is about.
 * Ids are never reused: a renamed or retired id stays out of the course and stays recorded as used, and
 * levelIdsEverUsed only grows (shippedIdErrors holds it to a copy of the ids that went out).
 */
export function validateCourse(m: CourseManifest = MANIFEST, sources: CourseSources = SOURCES): string[] {
  const errs: string[] = [];
  const specs = new Map(sources.levels.map((l) => [l.id, l]));
  const stageSpecs = new Map(sources.stages.map((s) => [s.id, s]));
  const pos = new Map<string, number>();
  const count = new Map<string, number>();
  const inCourse = new Set<number>();
  const stageLevels = new Map<number, string[]>();

  for (const entry of m.stages) {
    const st = stageSpecs.get(entry.id);
    if (inCourse.has(entry.id)) errs.push(`ステージ ${entry.id} がコースに2回あります`);
    inCourse.add(entry.id);
    if (m.retiredStages.includes(entry.id)) errs.push(`外したステージ ${entry.id} がコースにあります`);
    if (!st) {
      errs.push(`ステージ ${entry.id} の仕様がありません`);
      continue;
    }
    const ids = entry.levels ?? st.levelIds;
    stageLevels.set(entry.id, ids);
    for (const id of ids) {
      count.set(id, (count.get(id) ?? 0) + 1);
      if (!pos.has(id)) pos.set(id, pos.size);
      if (!specs.has(id)) errs.push(`ステージ ${entry.id} のレベル ${id} の仕様がありません`);
    }
  }
  for (const s of sources.stages)
    if (!inCourse.has(s.id) && !m.retiredStages.includes(s.id)) errs.push(`ステージ ${s.id} がコースにも、外したステージにもありません`);

  for (const id of specs.keys()) {
    const n = count.get(id) ?? 0;
    if (m.retiredLevels.includes(id)) {
      if (n > 0) errs.push(`外したレベル ${id} がコースにあります`);
    } else if (n !== 1) errs.push(`レベル ${id} がコースに ${n} 回あります`);
  }
  for (const id of m.retiredLevels) if (pos.has(id)) errs.push(`外したレベル ${id} がコースにあります`);

  for (const [id, p] of pos) {
    const spec = specs.get(id);
    if (!spec) continue;
    for (const pre of spec.prerequisites) {
      const q = pos.get(pre);
      if (q === undefined) errs.push(`${id}: 前提 ${pre} がコースにありません`);
      else if (q >= p) errs.push(`${id}: 前提 ${pre} がうしろにあります`);
    }
  }
  for (const [stageId, ids] of stageLevels) {
    const st = stageSpecs.get(stageId);
    for (const id of st?.stageCheck.levels ?? []) if (!ids.includes(id)) errs.push(`ステージ ${stageId}: チェックのレベル ${id} がステージにありません`);
  }

  for (const [from, to] of Object.entries(m.renamedLevels)) {
    if (pos.has(from)) errs.push(`付け替える前の ID ${from} を今も使っています`);
    const end = follow(m.renamedLevels, from);
    if (end === null) errs.push(`付け替え ${from} → ${to} が輪になっています`);
    // a level renamed and later retired is retired under both ids
    else if (!pos.has(end) && !m.retiredLevels.includes(end)) errs.push(`付け替え ${from} → ${to} の先 ${end} がコースにありません`);
  }

  const ever = new Set(m.levelIdsEverUsed);
  for (const id of pos.keys()) if (!ever.has(id)) errs.push(`レベル ${id} が levelIdsEverUsed にありません`);
  for (const id of Object.keys(m.renamedLevels)) if (!ever.has(id)) errs.push(`付け替える前の ID ${id} が levelIdsEverUsed にありません`);
  for (const id of m.retiredLevels) if (!ever.has(id)) errs.push(`外したレベル ${id} が levelIdsEverUsed にありません`);
  for (const id of ever) {
    const end = has(m.renamedLevels, id) ? follow(m.renamedLevels, id) : id;
    if (end === null || !(pos.has(end) || m.retiredLevels.includes(end)))
      errs.push(`使ったことのある ID ${id} が、コースにも、付け替えにも、外したレベルにもありません`);
  }
  const everStages = new Set(m.stageIdsEverUsed);
  for (const id of inCourse) if (!everStages.has(id)) errs.push(`ステージ ${id} が stageIdsEverUsed にありません`);
  for (const id of m.retiredStages) if (!everStages.has(id)) errs.push(`外したステージ ${id} が stageIdsEverUsed にありません`);
  for (const id of everStages) if (!inCourse.has(id) && !m.retiredStages.includes(id)) errs.push(`使ったことのあるステージ ${id} が、コースにも、外したステージにもありません`);
  return errs;
}
