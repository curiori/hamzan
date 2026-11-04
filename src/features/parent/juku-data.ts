import { levelSpec } from "@/course/levels";
import { jukuOf, levelStatus } from "@/course/progress";
import type { LevelStatus } from "@/domain/progression";
import { JUNITS } from "@/juku/spec";
import type { Profile } from "@/state/types";

// What the parent's 塾の単元 tab shows: each unit in the order of the juku year, its levels and how far the child is.

export type UnitState = "closed" | "checking" | "open";

export interface UnitRow {
  id: string;
  name: string;
  juku: string;
  when: string;
  state: UnitState;
  /** levels with ★2 or better, of all the unit's levels */
  passed: number;
  total: number;
  levels: { id: string; name: string; status: LevelStatus }[];
}

export function unitRows(p: Profile): UnitRow[] {
  const juku = jukuOf(p);
  return JUNITS.map((u) => {
    const levels = u.levelIds.map((id) => ({ id, name: levelSpec(id).name, status: levelStatus(p.progress, juku, id) }));
    const state: UnitState = !juku.open[u.id] ? "closed" : juku.checks.includes(u.id) ? "checking" : "open";
    return {
      id: u.id,
      name: u.name,
      juku: u.juku,
      when: u.when,
      state,
      passed: levels.filter((l) => l.status === "star2" || l.status === "mastered").length,
      total: levels.length,
      levels,
    };
  });
}

export const UNIT_STATE_LABEL: Record<UnitState, string> = {
  closed: "未開放",
  checking: "チェック待ち",
  open: "練習中",
};
