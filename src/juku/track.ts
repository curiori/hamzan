// How a child moves through stages 6–9: a parent opens 塾の単元, a 5-problem check per level finds where to
// start, and then the opened levels are practised like the core levels (H → M → S, ★2, mastery). Prerequisites
// never lock these levels; they are where practice goes back to when the child is stuck (rules.progression).
import type { LocalDate } from "@/domain/dates";
import { freshProgress, hasStar2, isMastered, type LevelProgress, type LevelStatus, type ProgressMap } from "@/domain/progression";
import type { StageCheckRecord } from "@/domain/session";
import { LEVEL as CORE_LEVEL, SPEC, type LevelSpec, type Mode } from "@/domain/spec";
import { JLEVEL, JLEVELS, JSTAGES, JUNITS, unitOf } from "./spec";

export interface JukuState {
  /** opened units: unit id → the day the parent opened it */
  open: Record<string, LocalDate>;
  /** opened units still waiting for their starting check, in unit order */
  checks: string[];
}

export const emptyJuku = (): JukuState => ({ open: {}, checks: [] });

const specOf = (id: string): LevelSpec => CORE_LEVEL[id] ?? JLEVEL[id];

/** Progress of any level, core or juku. */
export const anyLp = (map: ProgressMap, id: string): LevelProgress => map[id] ?? freshProgress(specOf(id));

const unitOrder = (id: string) => JUNITS.findIndex((u) => u.id === id);

/** the levels of the opened units, in level order */
export function openLevels(j: JukuState): LevelSpec[] {
  const ids = new Set(Object.keys(j.open).flatMap((u) => unitOf(u)?.levelIds ?? []));
  return JLEVELS.filter((l) => ids.has(l.id));
}

export const jukuActive = (j: JukuState) => Object.keys(j.open).some((u) => unitOf(u) !== null);

/** A juku level can be practised when its unit is open, the test tool opens everything, or practice already reached it. */
export function jukuUnlocked(map: ProgressMap, j: JukuState, id: string, unlockAll = false): boolean {
  if (unlockAll || openLevels(j).some((l) => l.id === id)) return true;
  const p = anyLp(map, id);
  return p.practiced || hasStar2(p);
}

export function jukuStatus(map: ProgressMap, j: JukuState, id: string, unlockAll = false): LevelStatus {
  const p = anyLp(map, id);
  if (isMastered(p)) return "mastered";
  if (hasStar2(p)) return "star2";
  if (!jukuUnlocked(map, j, id, unlockAll)) return "locked";
  return p.practiced ? "practicing" : "available";
}

/** first opened level (in order) without ★2 */
export function jukuFrontier(map: ProgressMap, j: JukuState): LevelSpec | null {
  return openLevels(j).find((l) => !hasStar2(anyLp(map, l.id))) ?? null;
}

/** opened levels with ★2 but not mastered: stage-check priority first, then the oldest ★2 */
export function jukuPendingList(map: ProgressMap, j: JukuState): LevelSpec[] {
  return openLevels(j)
    .filter((l) => {
      const p = anyLp(map, l.id);
      return hasStar2(p) && !isMastered(p);
    })
    .sort((a, b) => {
      const pa = anyLp(map, a.id);
      const pb = anyLp(map, b.id);
      if (pa.priority !== pb.priority) return pa.priority ? -1 : 1;
      return (pa.star2At ?? "").localeCompare(pb.star2At ?? "") || a.order - b.order;
    });
}

/** The juku frontier, or after N speed sets without ★2 its first unmastered prerequisite (core levels included). */
export function jukuTarget(map: ProgressMap, j: JukuState): { level: LevelSpec; reason: "frontier" | "prerequisite" } | null {
  const f = jukuFrontier(map, j);
  if (!f) return null;
  const limit = SPEC.rules.progression.fallbackToPrerequisite.speedSetsWithoutStar2;
  if (anyLp(map, f.id).speedSetsWithoutStar2 >= limit) {
    const pre = f.prerequisites
      .map(specOf)
      .sort((a, b) => a.order - b.order)
      .find((l) => !isMastered(anyLp(map, l.id)));
    if (pre) return { level: pre, reason: "prerequisite" };
  }
  return { level: f, reason: "frontier" };
}

export interface JukuSlot {
  levelId: string;
  mode: Mode;
  reason: "frontier" | "prerequisite" | "pending";
}

function fromTarget(map: ProgressMap, j: JukuState): JukuSlot | null {
  const t = jukuTarget(map, j);
  if (!t) return null;
  const p = anyLp(map, t.level.id);
  // a prerequisite with ★2 is practised for ★3 (speed); one without starts where it stands, usually the hint
  const mode: Mode = t.reason === "prerequisite" && hasStar2(p) ? "S" : p.mode;
  return { levelId: t.level.id, mode, reason: t.reason };
}

/** What the juku part of today's practice asks: the frontier first (or pending first for the "pending" slot). */
export function resolveJukuSlot(slot: "frontier" | "pending", map: ProgressMap, j: JukuState): JukuSlot | null {
  const pending = (): JukuSlot | null => {
    const p = jukuPendingList(map, j)[0];
    return p ? { levelId: p.id, mode: "S", reason: "pending" } : null;
  };
  return slot === "frontier" ? (fromTarget(map, j) ?? pending()) : (pending() ?? fromTarget(map, j));
}

/** The next juku stage check: every level of the stage has ★2 and its check was not done yet. */
export function jukuStageCheckDue(map: ProgressMap, checks: Record<number, StageCheckRecord>): number | null {
  const s = JSTAGES.find((st) => !checks[st.id] && st.levelIds.every((id) => hasStar2(anyLp(map, id))));
  return s ? s.id : null;
}

// ---------------- opening units and the starting check ----------------
/** the unit's levels without ★2, in level order */
const uncheckedLevels = (map: ProgressMap, unitId: string) =>
  (unitOf(unitId)?.levelIds ?? []).map((id) => JLEVEL[id]).sort((a, b) => a.order - b.order).filter((l) => !hasStar2(anyLp(map, l.id)));

/** Opens a unit; it waits for its starting check unless every level already has ★2. */
export function openUnit(j: JukuState, unitId: string, date: LocalDate, map: ProgressMap): JukuState {
  if (!unitOf(unitId) || j.open[unitId]) return j;
  const checks = uncheckedLevels(map, unitId).length ? [...j.checks, unitId].sort((a, b) => unitOrder(a) - unitOrder(b)) : j.checks;
  return { open: { ...j.open, [unitId]: date }, checks };
}

/** Closes a unit: it leaves the daily practice and the check queue; its records stay. */
export function closeUnit(j: JukuState, unitId: string): JukuState {
  if (!j.open[unitId]) return j;
  const open = { ...j.open };
  delete open[unitId];
  return { open, checks: j.checks.filter((u) => u !== unitId) };
}

/** The level the starting check asks next: the first unit in the queue, its first level without ★2. */
export function nextCheck(map: ProgressMap, j: JukuState): { unitId: string; levelId: string } | null {
  for (const unitId of j.checks) {
    if (!j.open[unitId]) continue;
    const lv = uncheckedLevels(map, unitId)[0];
    if (lv) return { unitId, levelId: lv.id };
  }
  return null;
}

export interface CheckOutcome {
  progress: ProgressMap;
  juku: JukuState;
  passed: boolean;
  /** the unit's check ended with this set (a stumble, or no level left to check) */
  unitDone: boolean;
  /** the level the child starts from after a stumble */
  startLevel: string | null;
  /** ★2 handed out by this check (rewards do not count them) */
  star2Given: number;
}

/**
 * The result of one starting-check set (5 problems, speed): no mistake and within T★2 gives ★2 and the check
 * goes on; otherwise the child starts this level (hint mode after mistakes, speed when only slow).
 */
export function applyCheck(map: ProgressMap, j: JukuState, args: { unitId: string; levelId: string; errors: number; perProblemSec: number; t2: number; date: LocalDate }): CheckOutcome {
  const { unitId, levelId, errors, perProblemSec, t2, date } = args;
  const lv = JLEVEL[levelId];
  const before = anyLp(map, levelId);
  const progress: ProgressMap = { ...map };
  const passed = errors === 0 && perProblemSec <= t2;
  let startLevel: string | null = null;
  let star2Given = 0;
  if (passed) {
    if (!hasStar2(before)) star2Given = 1;
    progress[levelId] = { ...before, star2At: before.star2At ?? date, mode: "S", practiced: true, bestStars: Math.max(before.bestStars, 2) };
  } else {
    startLevel = levelId;
    if (!before.practiced) progress[levelId] = { ...before, mode: errors > 0 ? lv.modes[0] : "S" };
  }
  const unitDone = !passed || uncheckedLevels(progress, unitId).length === 0;
  const juku = unitDone ? { ...j, checks: j.checks.filter((u) => u !== unitId) } : j;
  return { progress, juku, passed, unitDone, startLevel, star2Given };
}
