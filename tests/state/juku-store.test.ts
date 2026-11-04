import { describe, expect, test } from "bun:test";
import type { StateStorage } from "zustand/middleware";
import { unitRows } from "../../src/features/parent/juku-data";
import { activeProfile, createAppStore } from "../../src/state/create-store";
import { todayOf } from "../../src/state/profile";

const NOW = Date.UTC(2026, 10, 4, 3);

function memoryStorage(): StateStorage {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

function storeWithChild() {
  const store = createAppStore(memoryStorage(), { now: () => NOW });
  const id = store.getState().addProfile("さくら", 4);
  store.getState().skipPlacementTo("3-5");
  return { store, id };
}

describe("塾の単元 in the store", () => {
  test("opening a unit plans today's practice again when it has not started", () => {
    const { store, id } = storeWithChild();
    const before = store.getState().ensureSession();
    expect(before?.day.plan.some((p) => p.kind === "juku")).toBe(false);
    store.getState().setJukuUnit(id, "pi-cylinder", true);
    const p = activeProfile(store.getState());
    expect(p?.juku).toEqual({ open: { "pi-cylinder": todayOf(0, NOW) }, checks: ["pi-cylinder"] });
    const after = store.getState().ensureSession();
    expect(after?.day.plan[1]).toEqual({ kind: "juku", slot: "frontier" });
  });

  test("a day already started keeps its plan; the unit joins tomorrow", () => {
    const { store, id } = storeWithChild();
    store.getState().ensureSession();
    store.getState().skipSessionPart(0);
    store.getState().setJukuUnit(id, "pi-cylinder", true);
    expect(store.getState().ensureSession()?.day.plan.some((p) => p.kind === "juku")).toBe(false);
  });

  test("closing a unit takes it out of the queue and keeps the records", () => {
    const { store, id } = storeWithChild();
    store.getState().setJukuUnit(id, "pi-cylinder", true);
    store.getState().setJukuUnit(id, "pi-cylinder", false);
    expect(activeProfile(store.getState())?.juku).toEqual({ open: {}, checks: [] });
    expect(store.getState().ensureSession()?.day.plan.some((p) => p.kind === "juku")).toBe(false);
  });

  test("the parent's tab lists the units in order with their state", () => {
    const { store, id } = storeWithChild();
    store.getState().setJukuUnit(id, "speed-units", true);
    const rows = unitRows(activeProfile(store.getState())!);
    expect(rows.map((r) => [r.id, r.state, r.total])).toEqual([
      ["pi-cylinder", "closed", 4],
      ["speed-units", "checking", 4],
      ["pi-cone", "closed", 5],
      ["review-g4", "closed", 7],
      ["unit-mix", "closed", 1],
      ["toward-g5", "closed", 7],
    ]);
    expect(rows[1].levels.map((l) => l.status)).toEqual(["available", "available", "available", "available"]);
    expect(rows[0].levels.map((l) => l.status)).toEqual(["locked", "locked", "locked", "locked"]);
  });

  test("the diagnosis skip of the test tools keeps juku records", () => {
    const { store, id } = storeWithChild();
    store.getState().setJukuUnit(id, "pi-cylinder", true);
    store.getState().skipPlacementTo("2-1");
    expect(activeProfile(store.getState())?.juku?.open["pi-cylinder"]).toBe(todayOf(0, NOW));
  });
});
