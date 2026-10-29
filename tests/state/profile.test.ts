import { describe, expect, test } from "bun:test";
import { addDays } from "../../src/domain/dates";
import type { Problem } from "../../src/domain/problem";
import { freshProgress, isUnlocked } from "../../src/domain/progression";
import { LEVEL, SPEC } from "../../src/domain/spec";
import { hashPin, makeSalt } from "../../src/state/pin";
import { newProfile, setSeed, warmupLevels, weakFacts } from "../../src/state/profile";
import { DEFAULT_SETTINGS, type FactStat } from "../../src/state/types";

const DATE = "2026-10-29";

describe("pin", () => {
  test("hashPin matches the web prototype", () => {
    expect(hashPin("1234", "testsalt")).toBe("1662vgo");
  });

  test("hashPin depends on the salt", () => {
    expect(hashPin("1234", "othersalt")).not.toBe(hashPin("1234", "testsalt"));
  });

  test("makeSalt draws from the given random source", () => {
    expect(makeSalt(() => 0.5)).toBe(makeSalt(() => 0.5));
    expect(makeSalt(() => 0.25)).not.toBe(makeSalt(() => 0.5));
  });
});

describe("profile", () => {
  test("newProfile starts before the input test and diagnosis", () => {
    const p = newProfile("テスト", 4, { id: "p1", now: 0 });
    expect(p.id).toBe("p1");
    expect(p.settings).toEqual(DEFAULT_SETTINGS);
    expect([p.writeTestedAt, p.placement, p.placementDone]).toEqual([null, null, false]);
  });

  test("newProfile gives every profile its own settings object", () => {
    const a = newProfile("a", 1);
    const b = newProfile("b", 1);
    expect(a.settings).not.toBe(b.settings);
    expect(a.settings).not.toBe(DEFAULT_SETTINGS);
  });

  test("setSeed is fixed while a new S level has fewer fixed days than the spec", () => {
    const days = SPEC.rules.setGeneration.fixedSetDaysForNewLevelSpeed;
    const p = newProfile("t", 4, { id: "p1" });
    p.progress["1-1"] = { ...freshProgress(LEVEL["1-1"]), mode: "S" };
    const a = setSeed(p, "1-1", "S", DATE);
    const b = setSeed(p, "1-1", "S", addDays(DATE, 1));
    expect(a.fixed).toBe(true);
    expect(b.seed).toBe(a.seed);
    p.progress["1-1"].fixedSetDates = Array.from({ length: days }, (_, i) => addDays(DATE, -i - 1));
    expect(setSeed(p, "1-1", "S", DATE).fixed).toBe(false);
  });

  test("weakFacts keeps facts missed within weakFactWindowDays", () => {
    const win = SPEC.rules.setGeneration.weakFactWindowDays;
    const p = newProfile("t", 4, { id: "p1" });
    const problem: Problem = { shape: "binary", a: 1, op: "+", b: 2 };
    const base: FactStat = { levelId: "1-1", problem, attempts: 1, errors: 1, errorDates: [], lastErrorDate: null, lastSlowDate: null, lastLatencyMs: null, lastSeen: DATE };
    p.facts["add:1+2"] = { ...base, lastErrorDate: addDays(DATE, -(win - 1)) };
    p.facts["add:1+3"] = { ...base, lastErrorDate: addDays(DATE, -win) };
    p.facts["add:1+4"] = { ...base, levelId: "1-2", lastErrorDate: DATE };
    expect([...weakFacts(p, "1-1", DATE)]).toEqual(["add:1+2"]);
  });

  test("warmupLevels of a fresh profile are open enumerable levels of stage 0", () => {
    const p = newProfile("t", 4, { id: "p1" });
    const ids = warmupLevels(p, false);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(LEVEL[id].stage).toBe(0);
      expect(LEVEL[id].enumerable).toBe(true);
      expect(isUnlocked(p.progress, id)).toBe(true);
    }
  });
});
