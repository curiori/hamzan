import { describe, expect, test } from "bun:test";
import type { StateStorage } from "zustand/middleware";
import { buildSet } from "../../src/domain/setBuilder";
import { STORAGE_KEY, activeProfile, createAppStore } from "../../src/state/create-store";
import { newProfile, todayOf } from "../../src/state/profile";
import type { SetRun } from "../../src/state/types";

const NOW = Date.UTC(2026, 9, 29, 3);

function memoryStorage(opts: { delayMs?: number } = {}) {
  const data = new Map<string, string>();
  const sync: StateStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
  const delayed: StateStorage = {
    getItem: (k) => new Promise((r) => setTimeout(() => r(data.get(k) ?? null), opts.delayMs)),
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return { data, storage: opts.delayMs === undefined ? sync : delayed };
}

const saved = (profiles = [newProfile("あに", 5, { id: "pA", now: NOW })]) =>
  JSON.stringify({ state: { pin: null, profiles, activeId: profiles[0].id, dev: { dayOffset: 0, unlockAll: false, shortPlacement: false } }, version: 1 });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("app store", () => {
  test("hydrated turns true only after the stored state is read", async () => {
    const { data, storage } = memoryStorage({ delayMs: 5 });
    data.set(STORAGE_KEY, saved());
    const store = createAppStore(storage, { now: () => NOW });
    expect(store.getState().hydrated).toBe(false);
    await sleep(40);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().profiles.map((p) => p.nickname)).toEqual(["あに"]);
  });

  test("hydrated is true at once with synchronous storage", () => {
    const { data, storage } = memoryStorage();
    data.set(STORAGE_KEY, saved());
    const store = createAppStore(storage, { now: () => NOW });
    expect(store.getState().hydrated).toBe(true);
    expect(activeProfile(store.getState())?.id).toBe("pA");
  });

  test("unreadable stored data still finishes hydration with an empty state", async () => {
    const { data, storage } = memoryStorage({ delayMs: 1 });
    data.set(STORAGE_KEY, "{not json");
    const store = createAppStore(storage, { now: () => NOW });
    await sleep(30);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().profiles).toEqual([]);
  });

  test("unreadable stored data is kept and the app stops saving", async () => {
    const { data, storage } = memoryStorage({ delayMs: 1 });
    data.set(STORAGE_KEY, "{not json");
    const store = createAppStore(storage, { now: () => NOW });
    await sleep(30);
    store.getState().addProfile("あに", 5);
    await sleep(10);
    expect(store.getState().loadError).toBe(true);
    expect(data.get(STORAGE_KEY)).toBe("{not json");
  });

  test("a storage read error keeps the stored data", async () => {
    const { data } = memoryStorage();
    data.set(STORAGE_KEY, saved());
    const failing: StateStorage = {
      getItem: () => Promise.reject(new Error("disk")),
      setItem: async (k, v) => void data.set(k, v),
      removeItem: async (k) => void data.delete(k),
    };
    const store = createAppStore(failing, { now: () => NOW });
    await sleep(30);
    store.getState().addProfile("いもうと", 3);
    await sleep(10);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().loadError).toBe(true);
    expect(data.get(STORAGE_KEY)).toBe(saved());
  });

  test("data saved with another version is kept", async () => {
    const { data, storage } = memoryStorage({ delayMs: 1 });
    const newer = JSON.stringify({ ...JSON.parse(saved()), version: 2 });
    data.set(STORAGE_KEY, newer);
    const store = createAppStore(storage, { now: () => NOW });
    await sleep(30);
    store.getState().addProfile("いもうと", 3);
    await sleep(10);
    expect(store.getState().loadError).toBe(true);
    expect(data.get(STORAGE_KEY)).toBe(newer);
  });

  test("a successful load does not rewrite storage", async () => {
    const { data } = memoryStorage();
    data.set(STORAGE_KEY, saved());
    let writes = 0;
    const counting: StateStorage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        writes++;
        data.set(k, v);
      },
      removeItem: (k) => void data.delete(k),
    };
    const store = createAppStore(counting, { now: () => NOW });
    await sleep(10);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().loadError).toBe(false);
    expect(writes).toBe(0);
    store.getState().addProfile("いもうと", 3);
    expect(writes).toBe(1);
  });

  test("saveInputTest writes to the given profile, not the active one", () => {
    const store = createAppStore(memoryStorage().storage, { now: () => NOW });
    const a = store.getState().addProfile("あに", 5);
    const b = store.getState().addProfile("いもうと", 3, false);
    expect(store.getState().activeId).toBe(a);
    store.getState().saveInputTest(b, [0.4, 0.5, 0.6]);
    const [pa, pb] = store.getState().profiles;
    expect(pa.writeTestedAt).toBeNull();
    expect(pb.writeSecPerDigit).toBe(0.5);
    expect(pb.writeTestedAt).toBe(todayOf(0, NOW));
  });

  test("checkPin accepts only the pin that was set", () => {
    const store = createAppStore(memoryStorage().storage, { now: () => NOW });
    expect(store.getState().checkPin("1234")).toBe(false);
    store.getState().setPin("1234");
    expect(store.getState().checkPin("1234")).toBe(true);
    expect(store.getState().checkPin("4321")).toBe(false);
  });

  test("ensureSession creates today's plan once and returns its date", () => {
    const store = createAppStore(memoryStorage().storage, { now: () => NOW });
    store.getState().addProfile("あに", 5);
    const first = store.getState().ensureSession();
    expect(first?.date).toBe(todayOf(0, NOW));
    expect(first?.day.plan[0]).toEqual({ kind: "warmup" });
    store.getState().skipSessionPart(0);
    expect(store.getState().ensureSession()?.day.done).toBe(1);
  });

  test("deleting the active profile activates the next one", () => {
    const store = createAppStore(memoryStorage().storage, { now: () => NOW });
    const a = store.getState().addProfile("あに", 5);
    const b = store.getState().addProfile("いもうと", 3, false);
    store.getState().deleteProfile(a);
    expect(store.getState().activeId).toBe(b);
  });

  test("recordSet saves under hamzan-ios-v1 without runtime-only fields", () => {
    const { data, storage } = memoryStorage();
    const store = createAppStore(storage, { now: () => NOW });
    store.getState().addProfile("あに", 5);
    const run: SetRun = {
      kind: "extra",
      mode: "S",
      levelId: "1-1",
      results: buildSet("1-1", 3, 1).map((inst) => ({ inst, correct: true, given: null, latencyMs: 900 })),
      interrupted: false,
      activeSec: 3,
    };
    const summary = store.getState().recordSet(run);
    expect(summary.n).toBe(3);
    const stored = JSON.parse(data.get(STORAGE_KEY) ?? "{}");
    expect(stored.version).toBe(1);
    expect(stored.state.profiles[0].sets.length).toBe(1);
    expect(stored.state.hydrated).toBeUndefined();
  });
});
