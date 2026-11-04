// Problem generators for stages 6–9. Like src/domain/generators.ts, every generator draws from a
// seeded Rng (never Math.random), so a set can be built again from its seed.
import type { Rng } from "@/domain/rng";
import { BENCHMARKS, PLAUSIBLES } from "./benchmarks";
import { dec, decInt, decText, decValue, divDec, fracToDec, gcd, mulDec, norm, type Dec } from "./num";
import { PI, jText, roundTop, type JOp, type JProblem, type RateKind, type TimeKind } from "./problem";
import { JLEVEL } from "./spec";
import { unitShift, type SpeedUnit } from "./units";

type Gen = (r: Rng) => JProblem;

const range = (lo: number, hi: number, step = 1) => {
  const out: number[] = [];
  for (let v = lo; v <= hi; v += step) out.push(v);
  return out;
};

/** one of the values, each with its weight */
function wpick<T>(r: Rng, items: readonly (readonly [T, number])[]): T {
  let x = r.next() * items.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return items[items.length - 1][0];
}

/** numerators n < d with n/d already reduced */
export const properReduced = (d: number) => range(1, d - 1).filter((n) => gcd(n, d) === 1);

const op = (a: string, o: JOp, b: string): JProblem => ({ shape: "juku", type: "op", a, op: o, b });
/** a × b in either order */
const mulEither = (r: Rng, a: string, b: string, keep = 0.5) => (r.next() < keep ? op(a, "×", b) : op(b, "×", a));
const rate = (kind: RateKind, v: string): JProblem => ({ shape: "juku", type: "rate", kind, v });
const time = (kind: TimeKind, a: string, b?: number): JProblem => (b === undefined ? { shape: "juku", type: "time", kind, a } : { shape: "juku", type: "time", kind, a, b });
const convert = (v: string, from: string, to: string): JProblem => ({ shape: "juku", type: "convert", v, from, to });
const D = (n: number, s = 0) => decText({ n, s });

// ---------------- Stage 6 小数と分数 ----------------
const g6_1: Gen = (r) => {
  const d = r.int(2, 9);
  const n = r.pick(properReduced(d));
  const w = r.int(1, 5);
  if (r.next() < 0.5) return { shape: "juku", type: "fracForm", w, n, d, to: "improper" };
  return { shape: "juku", type: "fracForm", w: 0, n: w * d + n, d, to: "mixed" };
};

const G6_2_K = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15];

const g6_2: Gen = (r) => {
  for (;;) {
    const d = r.int(2, 12);
    const n = r.pick(properReduced(d));
    const k = r.pick(G6_2_K);
    if (d * k <= 99) return { shape: "juku", type: "reduce", n: n * k, d: d * k };
  }
};

const G6_3_DENS: readonly (readonly [number, number])[] = [
  [2, 2],
  [4, 3],
  [5, 3],
  [10, 1],
  [20, 1],
  [25, 1],
];

/** fraction → decimal (sometimes with a whole part for halves, quarters and fifths) or decimal → fraction, 6:4 */
function fracDec(r: Rng, d: number, wholeShare: number, maxWhole: number): JProblem {
  const n = r.pick(properReduced(d));
  if (r.next() < 0.6) {
    const w = r.next() < wholeShare ? r.int(1, maxWhole) : 0;
    return { shape: "juku", type: "fracToDec", w, n, d };
  }
  return { shape: "juku", type: "decToFrac", v: decText(fracToDec({ n, d }) as Dec) };
}

const g6_3: Gen = (r) => {
  const d = wpick(r, G6_3_DENS);
  return fracDec(r, d, d <= 5 ? 0.25 : 0, 3);
};

const g6_4: Gen = (r) => fracDec(r, 8, 0.25, 2);

const EIGHTH_PCTS = ["12.5", "37.5", "62.5", "87.5"];
const PCT_FRACS = ["50", "25", "75", "20", "40", "60", "80", "12.5", "37.5", "62.5", "87.5", "10", "30", "70", "90", "5"];

const g6_5: Gen = (r) => {
  const t = r.next();
  if (t < 0.18) {
    const u = r.next();
    if (u < 0.75) return rate("decToPct", D(r.int(1, 99), 2));
    if (u < 0.9) return rate("decToPct", D(10 + r.int(1, 9), 1));
    return rate("decToPct", D(r.pick([125, 375, 625, 875]), 3));
  }
  if (t < 0.33) {
    const u = r.next();
    if (u < 0.75) return rate("pctToDec", String(r.int(1, 99)));
    if (u < 0.9) return rate("pctToDec", String(r.int(11, 19) * 10));
    return rate("pctToDec", r.pick(EIGHTH_PCTS));
  }
  if (t < 0.5) {
    if (r.next() < 0.3) return rate("decToWari", D(r.int(1, 9), 1));
    return rate("decToWari", D(r.int(1, 9) * 10 + r.int(1, 9), 2));
  }
  if (t < 0.65) {
    const u = r.next();
    if (u < 0.25) return rate("wariToDec", D(r.int(1, 9), 1));
    if (u < 0.85) return rate("wariToDec", D(r.int(1, 9) * 10 + r.int(1, 9), 2));
    return rate("wariToDec", D(r.int(1, 9) * 100 + r.int(1, 9) * 10 + r.int(1, 9), 3));
  }
  if (t < 0.8) return rate("pctToFrac", r.pick(PCT_FRACS));
  const dir = r.next() < 0.7 ? "off" : "up";
  if (r.next() < 0.6) return { shape: "juku", type: "change", amount: dir === "off" ? r.int(1, 9) : r.int(1, 5), by: "wari", dir };
  return { shape: "juku", type: "change", amount: r.pick(dir === "off" ? [5, 10, 15, 20, 25, 30, 40, 50] : [5, 10, 15, 20, 25, 50]), by: "pct", dir };
};

/** 2–9 or a two-digit number that does not end in 0 */
const nonRound = (r: Rng) => (r.next() < 0.6 ? r.int(2, 9) : r.int(1, 9) * 10 + r.int(1, 9));

const g6_6: Gen = (r) => {
  for (;;) {
    const x = nonRound(r);
    const y = r.int(2, 9);
    const p = r.int(0, 2);
    const q = r.int(0, 2);
    if (p + q < 1 || p + q > 3) continue;
    return mulEither(r, D(x, p), D(y, q));
  }
};

const INVERSES: readonly (readonly [readonly [string, number], number])[] = [
  [["0.5", 2], 1],
  [["0.25", 4], 2],
  [["0.125", 8], 2],
];

const g6_7: Gen = (r) => {
  const [m, f] = wpick(r, INVERSES);
  if (r.next() < 0.6) return op(String(r.int(2, Math.min(99, Math.floor(999 / f)))), "÷", m);
  const q = r.int(2, f === 2 ? 49 : f === 4 ? 24 : 12);
  return mulEither(r, String(q * f), m, 0.7);
};

const G6_8 = [g6_1, g6_2, g6_3, g6_4, g6_5, g6_6, g6_7];
const g6_8: Gen = (r) => r.pick(G6_8)(r);

// ---------------- Stage 7 単位の換算 ----------------
/**
 * A value of `from` whose conversion by 10^shift is easy to read: 1–3 significant digits, both numbers
 * with at most `maxDec` places after the point and `maxInt` digits before it.
 */
function niceValue(r: Rng, shift: number, maxInt: number, maxDec = 3): string {
  const sig = wpick(r, [
    [1, 35],
    [2, 45],
    [3, 20],
  ] as const);
  let m = 0;
  while (m === 0 || (sig > 1 && m % 10 === 0)) m = r.int(10 ** (sig - 1), 10 ** sig - 1);
  const dm = String(m).length;
  const lo = Math.max(-maxDec, -maxDec - shift);
  const hi = Math.min(maxInt - dm, maxInt - dm - shift);
  const e = r.int(lo, hi);
  return decText(e >= 0 ? { n: m * 10 ** e, s: 0 } : { n: m, s: -e });
}

type Pair = readonly [readonly [string, string], number];

function convertFrom(r: Rng, pairs: readonly Pair[], maxInt: number): JProblem {
  const [big, small] = wpick(r, pairs);
  const shift = unitShift(big, small);
  return r.next() < 0.5 ? convert(niceValue(r, shift, maxInt), big, small) : convert(niceValue(r, -shift, maxInt), small, big);
}

export const LENGTH_WEIGHT_PAIRS: readonly Pair[] = [
  [["km", "m"], 2],
  [["m", "cm"], 2],
  [["cm", "mm"], 1],
  [["m", "mm"], 1],
  [["t", "kg"], 1],
  [["kg", "g"], 2],
];

export const AREA_PAIRS: readonly Pair[] = [
  [["m²", "cm²"], 3],
  [["cm²", "mm²"], 1],
  [["a", "m²"], 2],
  [["ha", "m²"], 2],
  [["ha", "a"], 2],
  [["km²", "ha"], 1],
  [["km²", "m²"], 1],
];

export const VOLUME_PAIRS: readonly Pair[] = [
  [["L", "cm³"], 3],
  [["L", "dL"], 2],
  [["L", "mL"], 2],
  [["dL", "mL"], 2],
  [["m³", "L"], 2],
  [["m³", "cm³"], 1],
  [["kL", "L"], 1],
  [["mL", "cm³"], 1],
];

const g7_1: Gen = (r) => convertFrom(r, LENGTH_WEIGHT_PAIRS, 5);

/** 0.1–upTo/10 hours (or minutes) in tenths, or a quarter that is not whole */
function tenthsOrQuarters(r: Rng, maxTenths: number, maxQuarters: number): string {
  if (r.next() < 0.6) {
    for (;;) {
      const t = r.int(1, maxTenths);
      if (t % 10) return D(t, 1);
    }
  }
  for (;;) {
    const q = r.int(1, maxQuarters);
    if (q % 2) return D(q * 25, 2);
  }
}

const g7_2: Gen = (r) => {
  const t = r.next();
  if (t < 0.25) return time("hToM", tenthsOrQuarters(r, 39, 15));
  if (t < 0.5) {
    const mins = r.next() < 0.65 ? 6 * r.int(1, 9) : r.pick([15, 45]);
    return time("mToH", String(r.next() < 0.5 ? 0 : r.int(1, 3)), mins);
  }
  if (t < 0.7) {
    for (;;) {
      const s = r.int(61, 599);
      if (s % 60) return time("sToMS", String(s));
    }
  }
  if (t < 0.85) {
    for (;;) {
      const m = r.int(61, 299);
      if (m % 60) return time("mToHM", String(m));
    }
  }
  return time("mToS", tenthsOrQuarters(r, 59, 23));
};

/** 分速 that are a whole number of metres and at most one decimal place of 時速 km */
export const MMIN_KMH = [50, 60, 70, 75, 80, 90, 100, 120, 150, 200, 250, 300, 400, 500, 600, 750, 800, 900, 1000, 1200, 1500];
const MSEC_MMIN = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30];
const MSEC_KMH = [5, 10, 15, 20, 25, 30];

const speed = (v: string, from: SpeedUnit, to: SpeedUnit): JProblem => ({ shape: "juku", type: "speed", v, from, to });

const g7_3: Gen = (r) => {
  const t = r.next();
  const flip = r.next() < 0.5;
  if (t < 0.5) {
    const m = r.pick(MMIN_KMH);
    const kmh = decText(mulDec(decInt(m), dec("0.06")));
    return flip ? speed(String(m), "mmin", "kmh") : speed(kmh, "kmh", "mmin");
  }
  if (t < 0.75) {
    const s = r.pick(MSEC_KMH);
    const kmh = decText(mulDec(decInt(s), dec("3.6")));
    return flip ? speed(String(s), "msec", "kmh") : speed(kmh, "kmh", "msec");
  }
  const s = r.pick(MSEC_MMIN);
  return flip ? speed(String(s), "msec", "mmin") : speed(String(s * 60), "mmin", "msec");
};

export const TRIP_MMIN = [40, 50, 60, 70, 75, 80, 90, 100, 120, 150, 200, 250, 300];
export const TRIP_KMH = ["3", "3.6", "4", "4.2", "4.8", "6", "9", "12", "15", "18", "24", "30", "36", "40", "45", "48", "60", "72", "80", "90"];
const TRIP_MINS = [6, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 48, 90, 150];

const trip = (ask: "dist" | "time" | "speed", sp: string, su: SpeedUnit, dist: string, du: "km" | "m", mins: number): JProblem => ({
  shape: "juku",
  type: "trip",
  ask,
  speed: sp,
  su,
  dist,
  du,
  mins,
});

const placesOk = (x: Dec | null, max: number): x is Dec => !!x && x.n > 0 && norm(x).s <= max;

const g7_4: Gen = (r) => {
  const ask = r.pick(["dist", "time", "speed"] as const);
  const conv = r.next() < 0.5;
  for (;;) {
    if (!conv) {
      const m = r.pick(TRIP_MMIN);
      const t = r.int(2, 30);
      if (m * t > 9999) continue;
      return trip(ask, String(m), "mmin", String(m * t), "m", t);
    }
    const t = r.pick(TRIP_MINS);
    if (ask === "speed" && r.next() < 0.5) {
      const m = r.pick(TRIP_MMIN);
      const km = divDec(decInt(m * t), decInt(1000));
      if (!placesOk(km, 2)) continue;
      return trip("speed", String(m), "mmin", decText(km), "km", t);
    }
    const v = r.pick(TRIP_KMH);
    const km = divDec(mulDec(dec(v), decInt(t)), decInt(60));
    if (!placesOk(km, 2)) continue;
    return trip(ask, v, "kmh", decText(km), "km", t);
  }
};

const g7_5: Gen = (r) => convertFrom(r, AREA_PAIRS, 7);
const g7_6: Gen = (r) => convertFrom(r, VOLUME_PAIRS, 7);

const G7_7 = [g7_1, g7_2, g7_3, g7_4, g7_5, g7_6];
const g7_7: Gen = (r) => r.pick(G7_7)(r);

// ---------------- Stage 8 円周率の計算 ----------------
export const PI_TWO_DIGITS = [12, 15, 16, 18, 24, 25, 36];
/** numbers whose product with 3.14 the stage teaches: the table, tens, a hundred and the frequent two-digit ones */
export const PI_KNOWN = [...range(1, 9), ...range(10, 90, 10), 100, ...PI_TWO_DIGITS];

const g8_1: Gen = (r) => mulEither(r, PI, String(r.int(1, 9)), 0.6);

const g8_2: Gen = (r) => {
  const d = r.int(2, 9);
  const t = r.next();
  if (t < 0.4) return mulEither(r, PI, String(d * 10), 0.7);
  if (t < 0.65) return op("31.4", "×", String(d));
  if (t < 0.85) return op(PI, "×", String(d * 100));
  return op("314", "×", String(d));
};

const g8_3: Gen = (r) => mulEither(r, PI, String(r.pick(PI_TWO_DIGITS)), 0.7);

/** the number 3.14 is multiplied by in 8-4: the table (more often), tens, hundreds, frequent two-digit ones */
const G8_4_K: readonly (readonly [readonly number[], number])[] = [
  [range(1, 9), 3],
  [range(10, 90, 10), 2],
  [PI_TWO_DIGITS, 1],
  [range(100, 900, 100), 1],
];

const piProduct = (k: number) => decText(mulDec(dec(PI), decInt(k)));

const g8_4: Gen = (r) => {
  const k = r.pick(wpick(r, G8_4_K));
  const product = piProduct(k);
  if (r.next() < 0.5) return { shape: "juku", type: "missing", known: PI, product, pos: r.next() < 0.5 ? "left" : "right" };
  return op(product, "÷", PI);
};

const piSum = (terms: string[][], signs: ("+" | "-")[]): JProblem => ({ shape: "juku", type: "piSum", terms, signs });

const g8_5: Gen = (r) => {
  const t = r.next();
  const piFirst = r.next() < 0.6;
  const term = (k: number) => (piFirst ? [PI, String(k)] : [String(k), PI]);
  for (;;) {
    if (t < 0.35) {
      const k = r.pick(PI_KNOWN.filter((x) => x >= 3 && x <= 40));
      const a = r.int(1, k - 1);
      return piSum([term(a), term(k - a)], ["+"]);
    }
    if (t < 0.6) {
      const k = r.pick(PI_KNOWN.filter((x) => x <= 30));
      const b = r.int(1, 20);
      return piSum([term(k + b), term(b)], ["-"]);
    }
    if (t < 0.85) {
      const big = r.int(2, 10);
      const small = r.int(1, big - 1);
      if (!PI_KNOWN.includes(big * big - small * small)) continue;
      return piSum(
        [
          [String(big), String(big), PI],
          [String(small), String(small), PI],
        ],
        ["-"],
      );
    }
    const k = r.pick(PI_KNOWN.filter((x) => x >= 6 && x <= 40));
    const a = r.int(1, k - 2);
    const b = r.int(1, k - a - 1);
    return piSum([term(a), term(b), term(k - a - b)], ["+", "+"]);
  }
};

const FIGURE_KS = new Set([...PI_KNOWN, ...range(200, 900, 100)]);
const SECTOR_ANGLES = [30, 45, 60, 72, 90, 120, 135, 144, 150, 180, 210, 240, 270, 300];

const g8_6: Gen = (r) => {
  const fig = wpick(r, [
    ["circleArea", 2],
    ["circumference", 2],
    ["sectorArea", 3],
    ["arc", 2],
    ["cylinder", 2],
  ] as const);
  const ok = (k: Dec | null) => !!k && norm(k).s === 0 && FIGURE_KS.has(decValue(k));
  for (;;) {
    if (fig === "circleArea") {
      const rad = r.int(1, 10);
      if (ok(decInt(rad * rad))) return { shape: "juku", type: "figure", fig, r: rad };
    } else if (fig === "circumference") {
      const dia = r.next() < 0.5;
      const v = r.int(1, dia ? 40 : 20);
      if (ok(decInt(dia ? v : 2 * v))) return { shape: "juku", type: "figure", fig, r: v, dia };
    } else if (fig === "sectorArea" || fig === "arc") {
      const rad = r.int(1, 12);
      const angle = r.pick(SECTOR_ANGLES);
      const top = fig === "sectorArea" ? rad * rad * angle : 2 * rad * angle;
      if (ok(divDec(decInt(top), decInt(360)))) return { shape: "juku", type: "figure", fig, r: rad, angle };
    } else {
      const rad = r.int(1, 6);
      const h = r.pick([...range(2, 10), 12, 15, 20]);
      if (ok(decInt(rad * rad * h))) return { shape: "juku", type: "figure", fig, r: rad, h };
    }
  }
};

const G8_7 = [g8_1, g8_2, g8_3, g8_4, g8_5, g8_6];
const g8_7: Gen = (r) => r.pick(G8_7)(r);

// ---------------- Stage 9 見積もり ----------------
const g9_1: Gen = (r) => {
  const t = r.next();
  if (t < 0.6) {
    const digits = r.pick([3, 3, 4, 4, 5]);
    for (;;) {
      const n = r.int(10 ** (digits - 1), 10 ** digits - 1);
      if (n % 10 ** (digits - 1)) return { shape: "juku", type: "round", v: String(n) };
    }
  }
  if (t < 0.85) {
    for (;;) {
      const n = r.int(101, 999);
      if (n % 100) return { shape: "juku", type: "round", v: D(n, 2) };
    }
  }
  for (;;) {
    const n = r.int(11, 99);
    if (n % 10) return { shape: "juku", type: "round", v: D(n, 2) };
  }
};

/** an integer that rounds (to one significant digit) to `top`, but is not `top` itself */
function nearTo(r: Rng, top: number): number {
  const place = 10 ** (String(top).length - 1);
  for (;;) {
    const v = top + r.int(-Math.floor(place / 2), Math.floor(place / 2) - 1);
    if (v !== top && v % 10 !== 0 && decValue(roundTop(String(v))) === top) return v;
  }
}

/** four answers ten times apart, with the right one (m×10^e written as text) at a random place; none below `min` */
function tenfoldOptions(r: Rng, right: Dec, min: Dec): { options: string[]; index: number } {
  const below = [0, 1, 2, 3].filter((i) => decValue(right) / 10 ** i >= decValue(min) - 1e-12);
  const index = r.pick(below);
  const options = [0, 1, 2, 3].map((j) => {
    const k = j - index;
    return decText(k >= 0 ? { n: right.n * 10 ** k, s: right.s } : { n: right.n, s: right.s - k });
  });
  return { options, index };
}

const estimate = (a: string, o: JOp, b: string, options: string[]): JProblem => ({ shape: "juku", type: "estimate", a, op: o, b, options });

const g9_2: Gen = (r) => {
  for (;;) {
    if (r.next() < 0.6) {
      // 2–3 digits × 2 digits (sometimes 3), like 398×51
      const ta = r.int(1, 9) * 10 ** r.int(1, 2);
      const tb = r.int(1, 9) * 10 ** (r.next() < 0.7 ? 1 : 2);
      const a = nearTo(r, ta);
      const b = nearTo(r, tb);
      const right = norm(decInt(ta * tb));
      const ratio = (a * b) / (ta * tb);
      if (ratio < 0.6 || ratio > 1.6) continue;
      const { options } = tenfoldOptions(r, right, decInt(1));
      return estimate(String(a), "×", String(b), options);
    }
    const tb = r.int(2, 9) * 10 ** r.int(1, 2);
    const q = r.int(2, 9) * 10 ** r.int(0, 2);
    const ta = tb * q;
    if (decValue(roundTop(String(ta))) !== ta) continue;
    const a = nearTo(r, ta);
    const b = nearTo(r, tb);
    const ratio = a / b / q;
    if (ratio < 0.6 || ratio > 1.6) continue;
    const { options } = tenfoldOptions(r, decInt(q), decInt(1));
    return estimate(String(a), "÷", String(b), options);
  }
};

/** a decimal with two significant digits between lo and hi (exclusive of round tenths) */
function twoSig(r: Rng, lo: number, hi: number): Dec {
  for (;;) {
    const x = r.int(Math.ceil(lo * 100), Math.floor(hi * 100));
    const d = norm({ n: x, s: 2 });
    if (String(d.n).replace(/0+$/, "").length === 2) return d;
  }
}

const g9_3: Gen = (r) => {
  if (r.next() < 0.6) {
    for (;;) {
      const k = r.int(0, 2);
      const target = 10 ** k;
      const b = r.next() < 0.7 ? twoSig(r, 0.11, 0.99) : twoSig(r, 1.1, 9.9);
      const o: JOp = r.next() < 0.6 ? "×" : "÷";
      const ideal = o === "×" ? target / decValue(b) : target * decValue(b);
      const raw = ideal * (0.85 + r.next() * 0.3);
      // three significant digits, one place after the point at most
      const a = norm({ n: Math.round(raw * 10), s: 1 });
      if (a.n <= 0) continue;
      const ra = roundTop(decText(a));
      const rb = roundTop(decText(b));
      const hint = o === "×" ? mulDec(ra, rb) : divDec(ra, rb, 3);
      if (!hint) continue;
      const x = o === "×" ? decValue(mulDec(a, b)) : decValue(a) / decValue(b);
      if (x / target < 0.6 || x / target > 1.6) continue;
      const { options } = tenfoldOptions(r, decInt(target), dec("0.1"));
      return estimate(decText(a), o, decText(b), options);
    }
  }
  const a = r.next() < 0.7 ? String(r.int(12, 99)) : D(r.int(12, 99), 1);
  const b = r.next() < 0.65 ? D(r.int(1, 9), 1) : D(r.int(11, 25), 1);
  return { shape: "juku", type: "compare", a, op: r.next() < 0.5 ? "×" : "÷", b };
};

const g9_4: Gen = (r) => ({ shape: "juku", type: "benchmark", item: r.pick(BENCHMARKS).id });
const g9_5: Gen = (r) => ({ shape: "juku", type: "plausible", item: r.pick(PLAUSIBLES).id });

const G9_6 = [g9_1, g9_2, g9_3, g9_4, g9_5];
const g9_6: Gen = (r) => r.pick(G9_6)(r);

export const JGENERATORS: Record<string, Gen> = {
  "6-1": g6_1,
  "6-2": g6_2,
  "6-3": g6_3,
  "6-4": g6_4,
  "6-5": g6_5,
  "6-6": g6_6,
  "6-7": g6_7,
  "6-8": g6_8,
  "7-1": g7_1,
  "7-2": g7_2,
  "7-3": g7_3,
  "7-4": g7_4,
  "7-5": g7_5,
  "7-6": g7_6,
  "7-7": g7_7,
  "8-1": g8_1,
  "8-2": g8_2,
  "8-3": g8_3,
  "8-4": g8_4,
  "8-5": g8_5,
  "8-6": g8_6,
  "8-7": g8_7,
  "9-1": g9_1,
  "9-2": g9_2,
  "9-3": g9_3,
  "9-4": g9_4,
  "9-5": g9_5,
  "9-6": g9_6,
};

// ---------------- enumeration (levels with enumerable: true) ----------------
const both = (a: string, b: string): JProblem[] => [op(a, "×", b), op(b, "×", a)];

const ENUMERATORS: Record<string, () => JProblem[]> = {
  "6-4": () =>
    [1, 3, 5, 7].flatMap((n): JProblem[] => [
      ...[0, 1, 2].map((w): JProblem => ({ shape: "juku", type: "fracToDec", w, n, d: 8 })),
      { shape: "juku", type: "decToFrac", v: decText(fracToDec({ n, d: 8 }) as Dec) },
    ]),
  "8-1": () => range(1, 9).flatMap((k) => both(PI, String(k))),
  "8-2": () =>
    range(2, 9).flatMap((d) => [...both(PI, String(d * 10)), op("31.4", "×", String(d)), op(PI, "×", String(d * 100)), op("314", "×", String(d))]),
  "8-3": () => PI_TWO_DIGITS.flatMap((k) => both(PI, String(k))),
  "8-4": () =>
    G8_4_K.flatMap(([ks]) => ks).flatMap((k): JProblem[] => [
      { shape: "juku", type: "missing", known: PI, product: piProduct(k), pos: "left" },
      { shape: "juku", type: "missing", known: PI, product: piProduct(k), pos: "right" },
      op(piProduct(k), "÷", PI),
    ]),
  "9-4": () => BENCHMARKS.map((b): JProblem => ({ shape: "juku", type: "benchmark", item: b.id })),
  "9-5": () => PLAUSIBLES.map((b): JProblem => ({ shape: "juku", type: "plausible", item: b.id })),
};

/** Every distinct problem (by its text) an enumerable level can produce; null for the others. */
export function enumerateJLevel(levelId: string): JProblem[] | null {
  if (!JLEVEL[levelId]?.enumerable) return null;
  const make = ENUMERATORS[levelId];
  if (!make) throw new Error(`no enumerator for enumerable level ${levelId}`);
  const seen = new Set<string>();
  return make().filter((p) => {
    const key = jText(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
