// juku.json is the source of truth for the learning rules of stages 6–9, in the same shape as
// curriculum.json (stages 0–5). This module types it and validates it, next to the core spec.
import raw from "./juku.json";
import { ERROR_TYPES, LEVEL as CORE_LEVEL, LEVELS as CORE_LEVELS, type LevelSpec, type StageSpec } from "@/domain/spec";

export interface JLevelSpec extends LevelSpec {
  /** how many times the usual reading time a problem takes (words, choices); 1 when missing */
  R?: number;
}

/** 塾の単元: the levels a parent opens together, in the order of the juku year */
export interface JUnit {
  id: string;
  name: string;
  juku: string;
  when: string;
  levelIds: string[];
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
  units: JUnit[];
  scaffoldKinds: Record<string, { use: string }>;
  errorTypes: JErrorTypeSpec[];
  errorTypeOrder: string[];
  remedyAddendum: Record<string, string>;
}

export const JSPEC = raw as unknown as JukuSpec;
export const JLEVELS: JLevelSpec[] = [...JSPEC.levels].sort((a, b) => a.order - b.order);
export const JLEVEL: Record<string, JLevelSpec> = Object.fromEntries(JLEVELS.map((l) => [l.id, l]));
export const JSTAGES: StageSpec[] = JSPEC.stages;
export const JUNITS: JUnit[] = JSPEC.units;
export const JERROR_TYPES: JErrorTypeSpec[] = JSPEC.errorTypes;

export const isJukuLevelId = (id: string) => id in JLEVEL;
export const readFactor = (lv: LevelSpec) => (lv as JLevelSpec).R ?? 1;
export const unitOf = (id: string) => JUNITS.find((u) => u.id === id) ?? null;
/** the unit a level is opened with */
export const unitOfLevel = (levelId: string) => JUNITS.find((u) => u.levelIds.includes(levelId)) ?? null;

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
  const inUnits = JUNITS.flatMap((u) => u.levelIds);
  JLEVELS.forEach((l) => {
    const n = inUnits.filter((id) => id === l.id).length;
    if (n !== 1) errs.push(`${l.id}: 単元に ${n} 回入っています`);
  });
  JUNITS.forEach((u) => {
    u.levelIds.forEach((id, i) => {
      if (!JLEVEL[id]) errs.push(`単元 ${u.id}: ${id} がありません`);
      else if (i > 0 && JLEVEL[u.levelIds[i - 1]] && JLEVEL[u.levelIds[i - 1]].order >= JLEVEL[id].order) errs.push(`単元 ${u.id}: レベルが順番どおりではありません`);
    });
  });
  const known = new Set<string>([...ERROR_TYPES.map((e) => e.id), ...JERROR_TYPES.map((e) => e.id)]);
  if (JSPEC.errorTypeOrder.some((id) => !known.has(id))) errs.push("errorTypeOrder が errorTypes と一致しません");
  return errs;
}
