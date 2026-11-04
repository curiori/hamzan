import { describe, expect, test } from "bun:test";
import { mulberry32 } from "../../src/domain/rng";
import { BENCHMARKS, PLAUSIBLES } from "../../src/juku/benchmarks";
import { JGENERATORS, MMIN_KMH, enumerateJLevel } from "../../src/juku/generators";
import { jSameValue } from "../../src/juku/judge";
import { dec, decText, decValue, gcd } from "../../src/juku/num";
import { jAnswer, jSpeech, jText, jTokens, jWriteUnits, makeJInstance, type JAnswer, type JProblem } from "../../src/juku/problem";
import { jScaffoldOf } from "../../src/juku/scaffolds";
import { JLEVEL, JLEVELS, JSTAGES, JUNITS, validateJukuSpec } from "../../src/juku/spec";
import { SPEED, UNITS, unitShift } from "../../src/juku/units";

const N = 2000;
const SEED = 20261104;

const sample = (levelId: string, n = N, seed = SEED) => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => JGENERATORS[levelId](r));
};

const val = (a: JAnswer): number => {
  switch (a.kind) {
    case "dec":
      return decValue(dec(a.v));
    case "frac":
      return a.w + a.n / a.d;
    default:
      return NaN;
  }
};
const close = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y));
const places = (v: string) => (v.includes(".") ? v.split(".")[1].length : 0);
const intDigits = (v: string) => v.split(".")[0].replace(/^0+/, "").length;

/** the answer worked out again with ordinary numbers, independently of src/juku/num.ts */
function check(p: JProblem, a: JAnswer): boolean {
  const x = (s: string) => Number(s);
  switch (p.type) {
    case "op":
      return a.kind === "dec" && close(val(a), p.op === "×" ? x(p.a) * x(p.b) : x(p.a) / x(p.b));
    case "missing":
      return a.kind === "dec" && close(val(a) * x(p.known), x(p.product));
    case "piSum": {
      let s = 0;
      p.terms.forEach((t, i) => {
        const v = t.reduce((acc, f) => acc * x(f), 1);
        s += i > 0 && p.signs[i - 1] === "-" ? -v : v;
      });
      return a.kind === "dec" && close(val(a), s);
    }
    case "fracForm":
      return a.kind === "frac" && close(val(a), p.w + p.n / p.d) && (p.to === "mixed" ? a.mixed && a.n < a.d && a.w >= 1 : !a.mixed && a.w === 0 && a.n > a.d);
    case "reduce":
      return a.kind === "frac" && close(val(a), p.n / p.d) && gcd(a.n, a.d) === 1 && a.n < a.d;
    case "fracToDec":
      return a.kind === "dec" && close(val(a), p.w + p.n / p.d);
    case "decToFrac":
      return a.kind === "frac" && close(val(a), x(p.v)) && gcd(a.n, a.d) === 1 && a.w === 0;
    case "rate":
      if (p.kind === "decToPct") return a.kind === "dec" && close(val(a), x(p.v) * 100);
      if (p.kind === "pctToDec") return a.kind === "dec" && close(val(a), x(p.v) / 100);
      if (p.kind === "wariToDec") return a.kind === "dec" && close(val(a), x(p.v));
      if (p.kind === "pctToFrac") return a.kind === "frac" && close(val(a), x(p.v) / 100);
      return a.kind === "pair" ? close(a.a / 10 + a.b / 100, x(p.v)) : a.kind === "dec" && close(val(a) / 10, x(p.v));
    case "change": {
      const part = p.amount / (p.by === "wari" ? 10 : 100);
      return a.kind === "dec" && close(val(a), p.dir === "off" ? 1 - part : 1 + part);
    }
    case "convert":
      return a.kind === "dec" && close(val(a), x(p.v) * 10 ** unitShift(p.from, p.to));
    case "time": {
      if (p.kind === "hToM" || p.kind === "mToS") return a.kind === "dec" && close(val(a), x(p.a) * 60);
      if (p.kind === "mToH") return a.kind === "dec" && close(val(a), x(p.a) + (p.b ?? 0) / 60);
      return a.kind === "pair" && a.a * 60 + a.b === x(p.a) && a.b > 0 && a.b < 60;
    }
    case "speed": {
      const mph = (v: number, u: keyof typeof SPEED) => v * SPEED[u].metres * SPEED[u].perHour;
      return a.kind === "dec" && close(mph(val(a), p.to), mph(x(p.v), p.from));
    }
    case "trip": {
      const mpm = (x(p.speed) * SPEED[p.su].metres * SPEED[p.su].perHour) / 60;
      const distM = x(p.dist) * (p.du === "km" ? 1000 : 1);
      if (p.ask === "dist") return a.kind === "dec" && close(val(a) * (p.du === "km" ? 1000 : 1), mpm * p.mins);
      if (p.ask === "time") return a.kind === "dec" && close(val(a), distM / mpm);
      return a.kind === "dec" && close(val(a), x(p.speed)) && close(distM / p.mins, mpm);
    }
    case "figure": {
      const k = { circleArea: p.r * p.r, circumference: p.dia ? p.r : 2 * p.r, sectorArea: (p.r * p.r * (p.angle ?? 0)) / 360, arc: (2 * p.r * (p.angle ?? 0)) / 360, cylinder: p.r * p.r * (p.h ?? 0) }[p.fig];
      return a.kind === "dec" && close(val(a), k * 3.14);
    }
    case "round": {
      if (a.kind !== "dec") return false;
      const v = x(p.v);
      const ans = val(a);
      const unit = 10 ** Math.floor(Math.log10(v) + 1e-12);
      const sig = a.v.replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
      return sig.length === 1 && Math.abs(ans - v) <= unit / 2 + 1e-9 && !(Math.abs(ans - v) === unit / 2 && ans < v);
    }
    case "estimate": {
      if (a.kind !== "choice") return false;
      const v = p.op === "×" ? x(p.a) * x(p.b) : x(p.a) / x(p.b);
      const ratio = v / x(p.options[a.i]);
      const ascending = p.options.every((o, i) => i === 0 || close(x(o), x(p.options[i - 1]) * 10));
      return ascending && ratio >= 0.6 && ratio <= 1.6;
    }
    case "compare": {
      const v = p.op === "×" ? x(p.a) * x(p.b) : x(p.a) / x(p.b);
      return a.kind === "choice" && a.i === (v > x(p.a) ? 0 : 1);
    }
    case "benchmark":
      return a.kind === "choice" && a.i === BENCHMARKS.find((b) => b.id === p.item)?.answer;
    case "plausible":
      return a.kind === "tf" && a.v === PLAUSIBLES.find((b) => b.id === p.item)?.ok;
  }
}

/** ranges of each level's generator (juku.json generationRule) */
const RANGE: Record<string, (p: JProblem) => boolean> = {
  "6-1": (p) => p.type === "fracForm" && p.d >= 2 && p.d <= 9 && (p.to === "improper" ? p.w >= 1 && p.w <= 5 && p.n < p.d && gcd(p.n, p.d) === 1 : p.w === 0 && p.n > p.d && p.n % p.d !== 0 && p.n < 6 * p.d),
  "6-2": (p) => p.type === "reduce" && p.n < p.d && p.d <= 99 && gcd(p.n, p.d) > 1,
  "6-3": (p) => (p.type === "fracToDec" && [2, 4, 5, 10, 20, 25].includes(p.d) && p.w <= 3) || (p.type === "decToFrac" && x01(p.v)),
  "6-4": (p) => (p.type === "fracToDec" && p.d === 8 && [1, 3, 5, 7].includes(p.n) && p.w <= 2) || (p.type === "decToFrac" && ["0.125", "0.375", "0.625", "0.875"].includes(p.v)),
  "6-5": (p) => p.type === "rate" || p.type === "change",
  "6-6": (p) => p.type === "op" && p.op === "×" && places(p.a) + places(p.b) >= 1 && places(p.a) + places(p.b) <= 3,
  "6-7": (p) => p.type === "op" && (["0.5", "0.25", "0.125"].includes(p.b) || ["0.5", "0.25", "0.125"].includes(p.a)),
  "7-1": (p) => p.type === "convert" && ["length", "weight"].includes(UNITS[p.from].family) && intDigits(p.v) <= 5 && places(p.v) <= 3,
  "7-2": (p) => p.type === "time",
  "7-3": (p) => p.type === "speed" && p.from !== p.to,
  "7-4": (p) => p.type === "trip",
  "7-5": (p) => p.type === "convert" && UNITS[p.from].family === "area" && intDigits(p.v) <= 7 && places(p.v) <= 3,
  "7-6": (p) => p.type === "convert" && UNITS[p.from].family === "volume" && intDigits(p.v) <= 7 && places(p.v) <= 3,
  "8-1": (p) => p.type === "op" && p.op === "×" && (p.a === "3.14" || p.b === "3.14"),
  "8-2": (p) => p.type === "op" && p.op === "×",
  "8-3": (p) => p.type === "op" && [12, 15, 16, 18, 24, 25, 36].includes(Number(p.a === "3.14" ? p.b : p.a)),
  "8-4": (p) => (p.type === "op" && p.op === "÷" && p.b === "3.14") || (p.type === "missing" && p.known === "3.14"),
  "8-5": (p) => p.type === "piSum" && p.terms.every((t) => t.includes("3.14")),
  "8-6": (p) => p.type === "figure",
  "9-1": (p) => p.type === "round",
  "9-2": (p) => p.type === "estimate" && !p.a.includes(".") && !p.b.includes("."),
  "9-3": (p) => p.type === "estimate" || p.type === "compare",
  "9-4": (p) => p.type === "benchmark",
  "9-5": (p) => p.type === "plausible",
};
function x01(v: string) {
  const n = Number(v);
  return n > 0 && n < 1;
}
const MIX: Record<string, string[]> = { "6-8": ["6-1", "6-2", "6-3", "6-4", "6-5", "6-6", "6-7"], "7-7": ["7-1", "7-2", "7-3", "7-4", "7-5", "7-6"], "8-7": ["8-1", "8-2", "8-3", "8-4", "8-5", "8-6"], "9-6": ["9-1", "9-2", "9-3", "9-4", "9-5"] };

describe("juku spec", () => {
  test("juku.json is valid and fills stages 6–9 with 28 levels in six units", () => {
    expect(validateJukuSpec()).toEqual([]);
    expect(JLEVELS.length).toBe(28);
    expect(JSTAGES.map((s) => s.id)).toEqual([6, 7, 8, 9]);
    expect(JUNITS.map((u) => u.levelIds.length).reduce((a, b) => a + b, 0)).toBe(28);
    expect(Object.keys(JGENERATORS).sort()).toEqual(JLEVELS.map((l) => l.id).sort());
  });

  test("the units follow the juku year and open contiguous levels of each stage", () => {
    expect(JUNITS.map((u) => u.id)).toEqual(["pi-cylinder", "speed-units", "pi-cone", "review-g4", "unit-mix", "toward-g5"]);
    expect(JUNITS[0].levelIds).toEqual(["8-1", "8-2", "8-3", "8-4"]);
    expect(JUNITS[1].levelIds).toEqual(["7-1", "7-2", "7-3", "7-4"]);
  });
});

describe.each(JLEVELS.map((l) => l.id))("level %s", (levelId) => {
  const lv = JLEVEL[levelId];
  const problems = sample(levelId);

  test("every answer is right when worked out again, and in its written form", () => {
    for (const p of problems) {
      const a = jAnswer(p);
      expect({ p, ok: check(p, a) }).toEqual({ p, ok: true });
      if (a.kind === "dec") expect(a.v).toBe(decText(dec(a.v)));
    }
  });

  test("problems stay inside the generation rule", () => {
    const allowed = MIX[levelId] ? (p: JProblem) => MIX[levelId].some((id) => RANGE[id](p)) : RANGE[levelId];
    for (const p of problems) expect({ p, ok: allowed(p) }).toEqual({ p, ok: true });
  });

  test("problems survive the records (JSON) and read aloud without gaps", () => {
    for (const p of problems.slice(0, 300)) {
      const back = JSON.parse(JSON.stringify(p)) as JProblem;
      expect(makeJInstance(levelId, back)).toEqual(makeJInstance(levelId, p));
      const text = jText(p);
      const speech = jSpeech(p);
      for (const s of [text, speech]) expect(/undefined|NaN|\[object/.test(s)).toBe(false);
      expect(jTokens(p).some((t) => t.t === "box") || ["op", "piSum", "fracForm", "reduce", "fracToDec", "decToFrac", "rate", "round", "estimate", "compare", "benchmark", "plausible"].includes(p.type)).toBe(true);
    }
  });

  test("hints end with the answer, use every blank, and memo numbers are hint blanks", () => {
    for (const p of problems.slice(0, 500)) {
      const sc = jScaffoldOf(levelId, p);
      const ans = jAnswer(p);
      if (lv.scaffoldKind === "NONE" || lv.scaffoldKind.startsWith("VISUAL")) {
        expect(sc.steps).toEqual([]);
        continue;
      }
      expect(sc.steps.length).toBeGreaterThan(0);
      expect({ p, last: jSameValue(ans, sc.steps[sc.steps.length - 1]) }).toEqual({ p, last: true });
      const refs = new Set(sc.lines.flatMap((ln) => ln.flatMap((t) => (t.t === "blank" ? [t.step] : []))));
      expect([...refs].sort((a, b) => a - b)).toEqual(sc.steps.map((_, i) => i));
      for (const m of sc.memo) expect(sc.steps.some((s) => s.kind === "dec" && m.kind === "dec" && decValue(dec(s.v)) === decValue(dec(m.v)))).toBe(true);
      if (lv.modes.includes("M")) expect(sc.memo.every((m) => m.kind === "dec")).toBe(true);
    }
  });

  test("D in juku.json is the average of what is written (within 0.2)", () => {
    const avg = problems.reduce((s, p) => s + jWriteUnits(jAnswer(p)), 0) / problems.length;
    expect(Math.abs(avg - lv.D)).toBeLessThanOrEqual(0.2);
  });

  test("the same seed gives the same problems", () => {
    expect(sample(levelId, 50, 7)).toEqual(sample(levelId, 50, 7));
  });

  if (lv.enumerable)
    test("enumerable: every generated problem is in the enumeration, without duplicates", () => {
      const all = enumerateJLevel(levelId) ?? [];
      const keys = new Set(all.map(jText));
      expect(keys.size).toBe(all.length);
      for (const p of problems) expect(keys.has(jText(p))).toBe(true);
      expect(all.length).toBe(lv.approxDistinctProblems);
    });
});

describe("worked examples from the proposal", () => {
  const ans = (p: JProblem) => {
    const a = jAnswer(p);
    return a.kind === "dec" ? a.v : a.kind === "frac" ? (a.w ? `${a.w}と${a.n}/${a.d}` : `${a.n}/${a.d}`) : a.kind === "pair" ? `${a.a}/${a.b}` : a.kind === "choice" ? a.options[a.i] : String(a.v);
  };
  test.each([
    [{ shape: "juku", type: "op", a: "3.14", op: "×", b: "7" }, "21.98"],
    [{ shape: "juku", type: "op", a: "3.14", op: "×", b: "30" }, "94.2"],
    [{ shape: "juku", type: "op", a: "31.4", op: "×", b: "6" }, "188.4"],
    [{ shape: "juku", type: "op", a: "3.14", op: "×", b: "16" }, "50.24"],
    [{ shape: "juku", type: "op", a: "3.14", op: "×", b: "25" }, "78.5"],
    [{ shape: "juku", type: "missing", known: "3.14", product: "28.26", pos: "left" }, "9"],
    [{ shape: "juku", type: "op", a: "125.6", op: "÷", b: "3.14" }, "40"],
    [{ shape: "juku", type: "piSum", terms: [["3.14", "7"], ["3.14", "3"]], signs: ["+"] }, "31.4"],
    [{ shape: "juku", type: "piSum", terms: [["6", "6", "3.14"], ["4", "4", "3.14"]], signs: ["-"] }, "62.8"],
    [{ shape: "juku", type: "figure", fig: "sectorArea", r: 6, angle: 60 }, "18.84"],
    [{ shape: "juku", type: "figure", fig: "cylinder", r: 3, h: 10 }, "282.6"],
    [{ shape: "juku", type: "convert", v: "1.2", from: "km", to: "m" }, "1200"],
    [{ shape: "juku", type: "convert", v: "350", from: "g", to: "kg" }, "0.35"],
    [{ shape: "juku", type: "convert", v: "3", from: "ha", to: "m²" }, "30000"],
    [{ shape: "juku", type: "convert", v: "0.8", from: "m²", to: "cm²" }, "8000"],
    [{ shape: "juku", type: "convert", v: "2.5", from: "L", to: "cm³" }, "2500"],
    [{ shape: "juku", type: "convert", v: "300", from: "mL", to: "dL" }, "3"],
    [{ shape: "juku", type: "time", kind: "hToM", a: "1.5" }, "90"],
    [{ shape: "juku", type: "time", kind: "sToMS", a: "200" }, "3/20"],
    [{ shape: "juku", type: "time", kind: "mToH", a: "2", b: 15 }, "2.25"],
    [{ shape: "juku", type: "speed", v: "36", from: "kmh", to: "mmin" }, "600"],
    [{ shape: "juku", type: "speed", v: "80", from: "mmin", to: "kmh" }, "4.8"],
    [{ shape: "juku", type: "speed", v: "20", from: "msec", to: "kmh" }, "72"],
    [{ shape: "juku", type: "trip", ask: "dist", speed: "80", su: "mmin", dist: "1200", du: "m", mins: 15 }, "1200"],
    [{ shape: "juku", type: "trip", ask: "dist", speed: "4.8", su: "kmh", dist: "1.2", du: "km", mins: 15 }, "1.2"],
    [{ shape: "juku", type: "fracForm", w: 2, n: 3, d: 4, to: "improper" }, "11/4"],
    [{ shape: "juku", type: "fracForm", w: 0, n: 17, d: 5, to: "mixed" }, "3と2/5"],
    [{ shape: "juku", type: "reduce", n: 18, d: 24 }, "3/4"],
    [{ shape: "juku", type: "reduce", n: 45, d: 60 }, "3/4"],
    [{ shape: "juku", type: "fracToDec", w: 0, n: 3, d: 4 }, "0.75"],
    [{ shape: "juku", type: "decToFrac", v: "0.6" }, "3/5"],
    [{ shape: "juku", type: "fracToDec", w: 0, n: 3, d: 8 }, "0.375"],
    [{ shape: "juku", type: "decToFrac", v: "0.625" }, "5/8"],
    [{ shape: "juku", type: "rate", kind: "decToPct", v: "0.35" }, "35"],
    [{ shape: "juku", type: "rate", kind: "wariToDec", v: "0.25" }, "0.25"],
    [{ shape: "juku", type: "rate", kind: "pctToFrac", v: "12.5" }, "1/8"],
    [{ shape: "juku", type: "change", amount: 3, by: "wari", dir: "off" }, "0.7"],
    [{ shape: "juku", type: "op", a: "0.4", op: "×", b: "0.05" }, "0.02"],
    [{ shape: "juku", type: "op", a: "1.2", op: "×", b: "0.3" }, "0.36"],
    [{ shape: "juku", type: "op", a: "36", op: "÷", b: "0.25" }, "144"],
    [{ shape: "juku", type: "op", a: "7", op: "÷", b: "0.125" }, "56"],
    [{ shape: "juku", type: "op", a: "48", op: "×", b: "0.125" }, "6"],
    [{ shape: "juku", type: "round", v: "398" }, "400"],
    [{ shape: "juku", type: "round", v: "6012" }, "6000"],
    [{ shape: "juku", type: "round", v: "4.87" }, "5"],
    [{ shape: "juku", type: "estimate", a: "398", op: "×", b: "51", options: ["2000", "20000", "200000", "2000000"] }, "20000"],
    [{ shape: "juku", type: "estimate", a: "19.8", op: "×", b: "0.52", options: ["1", "10", "100", "1000"] }, "10"],
    [{ shape: "juku", type: "compare", a: "36", op: "÷", b: "0.8" }, "おおきい"],
    [{ shape: "juku", type: "benchmark", item: "walk" }, "分速80m"],
    [{ shape: "juku", type: "plausible", item: "bus" }, "false"],
  ] as [JProblem, string][])("%j → %s", (p, want) => {
    expect(ans(p)).toBe(want);
  });

  test("speeds of 7-3 are whole metres a minute and one decimal place of km an hour", () => {
    for (const m of MMIN_KMH) expect(places(decText(dec(String((m * 60) / 1000))))).toBeLessThanOrEqual(1);
  });
});
