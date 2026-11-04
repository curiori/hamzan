import { describe, expect, test } from "bun:test";
import { ALL_LEVELS, ALL_STAGES, levelSpec } from "../../src/course/levels";
import { classifyMistake, instanceOf, judgeAnswer, problemText, revealOf } from "../../src/course/problems";
import { buildLevelSet, buildMixedSet, buildWarmupSet } from "../../src/course/sets";
import { levelTargetSec, mixedTargetSecAll } from "../../src/course/timing";
import { buildMixed, buildSet, buildWarmup } from "../../src/domain/setBuilder";
import { LEVEL, LEVELS } from "../../src/domain/spec";
import { mixedTargetSec, targetSec } from "../../src/domain/timing";
import { makeJInstance } from "../../src/juku/problem";
import { JLEVELS } from "../../src/juku/spec";

describe("one course of 89 levels", () => {
  test("the 61 core levels and the 28 new levels share one order: the new stages come before 受験の技", () => {
    expect(ALL_LEVELS.length).toBe(89);
    expect(ALL_STAGES.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 6, 8, 7, 5, 9]);
    expect(ALL_LEVELS.map((l) => l.order)).toEqual(ALL_LEVELS.map((_, i) => i));
    expect(levelSpec("pi-table").name).toBe("3.14の段");
    expect(levelSpec("4-12").order).toBeLessThan(levelSpec("frac-mixed").order);
    expect(levelSpec("unit-mix").order).toBeLessThan(levelSpec("5-1").order);
  });

  test("stage 0–5 sets, warm-ups and targets are exactly those of src/domain", () => {
    for (const id of ["1-5", "2-5", "3-10", "5-9"]) expect(buildLevelSet(id, 10, 42)).toEqual(buildSet(id, 10, 42));
    expect(buildMixedSet(["3-2", "3-5"], [5, 5], 11)).toEqual(buildMixed(["3-2", "3-5"], [5, 5], 11));
    const missed = buildSet("2-5", 3, 9);
    expect(buildWarmupSet(["2-1", "2-2"], missed, 5, 20)).toEqual(buildWarmup(["2-1", "2-2"], missed, 5, 20));
    for (const l of LEVELS) expect(levelTargetSec(l.id, 2)).toBe(targetSec(LEVEL[l.id], 2));
    expect(mixedTargetSecAll(["0-1", "3-5"], 3, { writeChild: 0.7 })).toBe(mixedTargetSec(["0-1", "3-5"], 3, { writeChild: 0.7 }));
  });

  test("juku targets add the reading factor: word problems read longer, estimation stays short", () => {
    // 7-4: 0.5×6 + 0.9×2.5 + 0.5×D
    const d74 = levelSpec("unit-trip").D;
    expect(levelTargetSec("unit-trip", 2)).toBe(Math.round((0.5 * 6 + 0.9 * 2.5 + 0.5 * d74) * 10) / 10);
    expect(levelTargetSec("pi-table", 2)).toBe(Math.round((0.5 + 0.9 + 0.5 * levelSpec("pi-table").D) * 10) / 10);
    for (const l of JLEVELS) expect(levelTargetSec(l.id, 3)).toBeLessThan(levelTargetSec(l.id, 2));
    expect(levelTargetSec("est-magnitude", 2)).toBeLessThan(levelTargetSec("pi-two-digit", 2));
  });

  test("mixed sets of core and juku levels keep each level's count", () => {
    const set = buildMixedSet(["3-2", "pi-table", "frac-reduce"], [3, 4, 5], 7);
    const count = (id: string) => set.filter((x) => x.levelId === id).length;
    expect([count("3-2"), count("pi-table"), count("frac-reduce")]).toEqual([3, 4, 5]);
    expect(buildMixedSet(["3-2", "pi-table", "frac-reduce"], [3, 4, 5], 7)).toEqual(set);
  });

  test("juku sets: no fact twice while the level has enough, never twice in a row", () => {
    const set = buildLevelSet("pi-table", 20, 3);
    expect(set.length).toBe(20);
    expect(new Set(set.slice(0, 9).map((x) => x.factKey)).size).toBe(9);
    expect(set.every((x, i) => i === 0 || x.factKey !== set[i - 1].factKey)).toBe(true);
    const gen = buildLevelSet("unit-length-weight", 20, 3);
    expect(new Set(gen.map((x) => x.factKey)).size).toBe(20);
  });

  test("yesterday's juku mistakes come first in the warm-up", () => {
    const miss = makeJInstance("pi-table", { shape: "juku", type: "op", a: "3.14", op: "×", b: "7" });
    const w = buildWarmupSet(["2-1"], [miss], 5, 20);
    expect(w[0]).toEqual(miss);
    expect(w.length).toBe(20);
  });

  test("problems, answers and mistakes go to the spec they belong to", () => {
    const core = instanceOf("2-5", { shape: "binary", a: 7, op: "×", b: 8 });
    const juku = instanceOf("frac-reduce", { shape: "juku", type: "reduce", n: 18, d: 24 });
    expect(problemText(core.problem)).toBe("7×8＝");
    expect(problemText(juku.problem)).toBe("18/24を 約分");
    expect(judgeAnswer(core.answer, { kind: "number", value: 56 })).toEqual({ correct: true, note: null });
    expect(judgeAnswer(juku.answer, { kind: "frac", w: 0, n: 9, d: 12, mixed: false })).toEqual({ correct: false, note: "やくぶん できるよ" });
    expect(classifyMistake(core, { kind: "number", value: 560 }, 0)).toBe("placeValue");
    expect(classifyMistake(juku, { kind: "frac", w: 0, n: 9, d: 12, mixed: false }, 0)).toBe("reduce");
    expect(revealOf(instanceOf("unit-area", { shape: "juku", type: "convert", v: "0.8", from: "m²", to: "cm²" }), { kind: "dec", v: "80" })).toEqual({
      answer: "8000cm²",
      note: "1m²＝10000cm²",
    });
  });
});
