// juku.json is the source of truth for the learning rules of the stages 小数と分数, 円周率の計算, 単位の換算 and
// 見積もり (stage ids 6–9), in the same shape as curriculum.json. Where they sit in the course, and the numbers on
// screen, come from src/course/course.json. This module types the spec and validates it.
import raw from "./juku.json";
import { ERROR_TYPES, LEVEL as CORE_LEVEL, LEVELS as CORE_LEVELS, type LevelSpec, type StageSpec } from "@/domain/spec";

export interface JLevelSpec extends LevelSpec {
  /** how many times the usual reading time a problem takes (words, choices); 1 when missing */
  R?: number;
}

export type JErrorTypeId = "reduce" | "time60";

export interface JErrorTypeSpec {
  id: JErrorTypeId;
  name: string;
  detect: string;
  remedy: string;
}

interface JukuSpec {
  specVersion: string;
  title: string;
  stages: StageSpec[];
  levels: JLevelSpec[];
  scaffoldKinds: Record<string, { use: string }>;
  errorTypes: JErrorTypeSpec[];
  errorTypeOrder: string[];
  remedyAddendum: Record<string, string>;
}

export const JSPEC = raw as unknown as JukuSpec;
export const JLEVELS: JLevelSpec[] = [...JSPEC.levels].sort((a, b) => a.order - b.order);
export const JLEVEL: Record<string, JLevelSpec> = Object.fromEntries(JLEVELS.map((l) => [l.id, l]));
export const JSTAGES: StageSpec[] = JSPEC.stages;
export const JERROR_TYPES: JErrorTypeSpec[] = JSPEC.errorTypes;

export const isJukuLevelId = (id: string) => Object.prototype.hasOwnProperty.call(JLEVEL, id);
export const readFactor = (lv: LevelSpec) => (lv as JLevelSpec).R ?? 1;

/** Startup validation, like validateSpec() for curriculum.json. */
export function validateJukuSpec(): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  const firstOrder = CORE_LEVELS.length;
  JLEVELS.forEach((l, i) => {
    if (ids.has(l.id) || CORE_LEVEL[l.id]) errs.push(`レベルIDが重複: ${l.id}`);
    ids.add(l.id);
    if (l.order !== firstOrder + i) errs.push(`order が連番ではありません: ${l.id}`);
    if (!JSTAGES.some((s) => s.id === l.stage)) errs.push(`${l.id}: stage ${l.stage} がありません`);
    if (!l.modes.length || l.modes.some((m) => !["H", "M", "S"].includes(m)) || l.modes[l.modes.length - 1] !== "S") errs.push(`${l.id}: modes が不正`);
    if (!JSPEC.scaffoldKinds[l.scaffoldKind]) errs.push(`${l.id}: scaffoldKind ${l.scaffoldKind} がありません`);
    for (const k of ["setSize", "K", "D"] as const) if (!(typeof l[k] === "number" && l[k] > 0)) errs.push(`${l.id}: ${k} が不正`);
    if (l.R !== undefined && !(l.R > 0)) errs.push(`${l.id}: R が不正`);
    l.prerequisites.forEach((p) => {
      const pre = CORE_LEVEL[p] ?? JLEVEL[p];
      if (!pre) errs.push(`${l.id}: 前提 ${p} がありません`);
      else if (pre.order >= l.order) errs.push(`${l.id}: 前提 ${p} が後ろにあります`);
    });
  });
  JSTAGES.forEach((s) => {
    s.levelIds.forEach((id) => {
      if (JLEVEL[id]?.stage !== s.id) errs.push(`ステージ${s.id}: ${id} の所属が不一致`);
    });
    if (JLEVELS.filter((l) => l.stage === s.id).length !== s.levelIds.length) errs.push(`ステージ${s.id}: levelIds が足りません`);
    s.stageCheck.levels.forEach((id) => {
      if (JLEVEL[id]?.stage !== s.id) errs.push(`ステージ${s.id}: チェック用 ${id} がありません`);
    });
    if (!(s.stageCheck.problems > 0)) errs.push(`ステージ${s.id}: stageCheck.problems が不正`);
  });
  const known = new Set<string>([...ERROR_TYPES.map((e) => e.id), ...JERROR_TYPES.map((e) => e.id)]);
  if (JSPEC.errorTypeOrder.some((id) => !known.has(id))) errs.push("errorTypeOrder が errorTypes と一致しません");
  return errs;
}
