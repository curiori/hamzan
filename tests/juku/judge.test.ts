import { describe, expect, test } from "bun:test";
import { jClassifyError, jJudge, jSameValue, unitFactFor } from "../../src/juku/judge";
import { makeJInstance, type JAnswer, type JProblem } from "../../src/juku/problem";

const dec = (v: string): JAnswer => ({ kind: "dec", v });
const frac = (n: number, d: number, w = 0, mixed = false): JAnswer => ({ kind: "frac", w, n, d, mixed });
const inst = (levelId: string, p: JProblem) => makeJInstance(levelId, p);

describe("judging answers", () => {
  test("decimals ignore trailing zeros and a missing leading zero", () => {
    expect(jJudge(dec("15.7"), dec("15.70"))).toEqual({ correct: true, note: null });
    expect(jJudge(dec("0.5"), dec(".5"))).toEqual({ correct: true, note: null });
    expect(jJudge(dec("1200"), dec("120"))).toEqual({ correct: false, note: null });
  });

  test("an unreduced fraction is wrong and says it can be reduced", () => {
    expect(jJudge(frac(3, 4), frac(9, 12))).toEqual({ correct: false, note: "reduce" });
    expect(jJudge(frac(3, 4), frac(6, 8))).toEqual({ correct: false, note: "reduce" });
    expect(jJudge(frac(3, 4), frac(3, 4))).toEqual({ correct: true, note: null });
    expect(jJudge(frac(3, 4), frac(2, 3))).toEqual({ correct: false, note: null });
    expect(jJudge(frac(3, 4), frac(3, 0))).toEqual({ correct: false, note: null });
  });

  test("a mixed number must be written as one", () => {
    expect(jJudge(frac(2, 5, 3, true), frac(2, 5, 3, true))).toEqual({ correct: true, note: null });
    expect(jJudge(frac(2, 5, 3, true), frac(7, 5, 2, true))).toEqual({ correct: false, note: "mixed" });
    expect(jJudge(frac(2, 5, 3, true), frac(4, 10, 3, true))).toEqual({ correct: false, note: "reduce" });
  });

  test("pairs, choices and ○× compare their parts", () => {
    const pair: JAnswer = { kind: "pair", a: 3, b: 20, units: [{ v: "分" }, { v: "秒" }] };
    expect(jSameValue(pair, { ...pair })).toBe(true);
    expect(jSameValue(pair, { ...pair, b: 2 })).toBe(false);
    expect(jSameValue({ kind: "choice", i: 1, options: ["a", "b"] }, { kind: "choice", i: 1, options: ["a", "b"] })).toBe(true);
    expect(jSameValue({ kind: "tf", v: false, labels: ["ありえる", "ありえない"] }, { kind: "tf", v: true, labels: ["ありえる", "ありえない"] })).toBe(false);
  });
});

describe("naming the mistake", () => {
  test("約分・形 comes first for fractions of the right value", () => {
    expect(jClassifyError(inst("frac-reduce", { shape: "juku", type: "reduce", n: 18, d: 24 }), frac(9, 12), 0)).toBe("reduce");
    expect(jClassifyError(inst("frac-mixed", { shape: "juku", type: "fracForm", w: 0, n: 17, d: 5, to: "mixed" }), frac(7, 5, 2, true), 0)).toBe("reduce");
  });

  test("counting an hour as 100 minutes is the 60/100 mix-up", () => {
    expect(jClassifyError(inst("unit-time", { shape: "juku", type: "time", kind: "hToM", a: "1.5" }), dec("150"), 0)).toBe("time60");
    expect(jClassifyError(inst("unit-time", { shape: "juku", type: "time", kind: "mToH", a: "2", b: 15 }), dec("2.15"), 0)).toBe("time60");
    const s = inst("unit-time", { shape: "juku", type: "time", kind: "sToMS", a: "200" });
    expect(jClassifyError(s, { kind: "pair", a: 2, b: 0, units: [{ v: "分" }, { v: "秒" }] }, 0)).toBe("time60");
    expect(jClassifyError(inst("unit-speed", { shape: "juku", type: "speed", v: "80", from: "mmin", to: "kmh" }), dec("8"), 0)).toBe("time60");
    expect(jClassifyError(inst("unit-trip", { shape: "juku", type: "trip", ask: "dist", speed: "4.8", su: "kmh", dist: "1.2", du: "km", mins: 15 }), dec("0.72"), 0)).toBe("time60");
  });

  test("a moved point or a wrong unit factor is 位取り・0の数, also between 4択 options", () => {
    expect(jClassifyError(inst("unit-area", { shape: "juku", type: "convert", v: "0.8", from: "m²", to: "cm²" }), dec("80"), 0)).toBe("placeValue");
    expect(jClassifyError(inst("pi-shift", { shape: "juku", type: "op", a: "3.14", op: "×", b: "30" }), dec("942"), 0)).toBe("placeValue");
    const est = inst("est-magnitude", { shape: "juku", type: "estimate", a: "398", op: "×", b: "51", options: ["2000", "20000", "200000", "2000000"] });
    expect(jClassifyError(est, { kind: "choice", i: 2, options: ["2000", "20000", "200000", "2000000"] }, 0)).toBe("placeValue");
  });

  test("carries, swapped digits, facts and the rest", () => {
    const sixteen = inst("pi-two-digit", { shape: "juku", type: "op", a: "3.14", op: "×", b: "16" });
    expect(jClassifyError(sixteen, dec("49.24"), 0)).toBe("carry");
    expect(jClassifyError(sixteen, dec("50.42"), 0)).toBe("transposition");
    expect(jClassifyError(sixteen, dec("50.25"), 0)).toBe("procedure");
    expect(jClassifyError(sixteen, dec("50.25"), 2)).toBe("fact");
    expect(jClassifyError(inst("pi-table", { shape: "juku", type: "op", a: "3.14", op: "×", b: "7" }), dec("21.97"), 0)).toBe("fact");
  });

  test("the unit fact shown after a unit mistake", () => {
    expect(unitFactFor({ shape: "juku", type: "convert", v: "0.8", from: "m²", to: "cm²" })).toBe("1m²＝10000cm²");
    expect(unitFactFor({ shape: "juku", type: "convert", v: "350", from: "g", to: "kg" })).toBe("1kg＝1000g");
    expect(unitFactFor({ shape: "juku", type: "op", a: "3.14", op: "×", b: "7" })).toBeNull();
  });
});
