// Problem generators: a faithful port of reference_generators.py (g*_*).
// Same ranges, probability thresholds, rejection loops and swap probabilities, and the Rng is
// called in the same order as Python's random (random() → next, randint → int, choice → pick).
import curriculum from "./curriculum.json";
import { answerDigits, computeAnswer, display, factKey } from "./problem";
import type { BinOp, Problem, ProblemInstance } from "./problem";
import type { Rng } from "./rng";

type Gen = (r: Rng) => Problem;

/** 2-1〜2-4: the multiplication table(s) each level practises. */
export const TABLE_SETS: Record<string, readonly number[]> = {
  "2-1": [2, 5, 10],
  "2-2": [3, 4],
  "2-3": [6, 7],
  "2-4": [8, 9],
};

const bin = (a: number, op: BinOp, b: number): Problem => ({ shape: "binary", a, op, b });
const complementTo = (a: number, total: number): Problem => ({ shape: "complementTo", a, total });
const divRem = (dividend: number, divisor: number): Problem => ({ shape: "divRem", dividend, divisor });
const chain = (terms: number[], ops: ("+" | "-")[]): Problem => ({ shape: "chain", terms, ops });

/** _swap(r, a, op, b, ans, p): with probability p keep "a op b", else "b op a". */
function swap(r: Rng, a: number, op: BinOp, b: number, p = 0.5): Problem {
  return r.next() < p ? bin(a, op, b) : bin(b, op, a);
}

// ---------------- Stage 0 ----------------
const g0_1: Gen = (r) => complementTo(r.int(1, 9), 10);

const g0_2: Gen = (r) => {
  const b = r.int(1, 9);
  if (r.next() < 0.5) return bin(10, "+", b);
  return { shape: "decompose", n: 10 + b };
};

const g0_3: Gen = (r) => {
  const a = r.int(1, 10);
  if (r.next() < 0.5) return bin(a, "+", a);
  return { shape: "half", n: 2 * a };
};

const g0_4: Gen = (r) => {
  const t = r.next();
  if (t < 0.4) return bin(r.int(2, 99), "×", 10);
  if (t < 0.7) return bin(r.int(2, 9), "×", 100);
  return bin(r.int(2, 99) * 10, "÷", 10);
};

const g0_5: Gen = (r) => complementTo(r.int(1, 9) * 10, 100);

// ---------------- Stage 1 ----------------
const g1_1: Gen = (r) => {
  const a = r.int(0, 9);
  const b = r.pick([0, 1, 2]);
  return swap(r, a, "+", b, 0.6);
};

const g1_2: Gen = (r) => {
  for (;;) {
    const a = r.int(1, 9);
    const b = r.int(1, 9);
    if (a + b <= 10) return bin(a, "+", b);
  }
};

const g1_3: Gen = (r) => {
  const a = r.int(2, 8);
  const t = r.next();
  if (t < 0.34) return bin(a, "+", a);
  if (t < 0.67) return bin(a, "+", a + 1);
  return bin(a + 1, "+", a);
};

const g1_4: Gen = (r) => {
  for (;;) {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    if (a + b >= 11 && a + b <= 18) return bin(a, "+", b);
  }
};

const g1_5: Gen = (r) => {
  const a = r.int(0, 9);
  const b = r.int(0, 9);
  return bin(a, "+", b);
};

const g1_6: Gen = (r) => {
  const a = r.int(1, 10);
  const b = r.int(0, a);
  return bin(a, "-", b);
};

function borrowPair(r: Rng): [number, number] {
  for (;;) {
    const a = r.int(11, 18);
    const b = r.int(2, 9);
    if (a % 10 < b) return [a, b];
  }
}

const g1_7: Gen = (r) => {
  const [a, b] = borrowPair(r);
  return bin(a, "-", b);
};

const g1_8: Gen = (r) => {
  const [a, b] = borrowPair(r);
  return { shape: "missingAddend", b, total: a };
};

const g1_9: Gen = (r) => {
  for (;;) {
    const b = r.int(0, 9);
    const c = r.int(0, 9);
    if (b + c <= 18) return bin(b + c, "-", b);
  }
};

const g1_10: Gen = (r) => (r.next() < 0.5 ? g1_5(r) : g1_9(r));

// ---------------- Stage 2 ----------------
function tab(r: Rng, bases: readonly number[]): Problem {
  const a = r.int(1, 9);
  const b = r.pick(bases);
  return swap(r, a, "×", b);
}

const g2_1: Gen = (r) => tab(r, TABLE_SETS["2-1"]);
const g2_2: Gen = (r) => tab(r, TABLE_SETS["2-2"]);
const g2_3: Gen = (r) => tab(r, TABLE_SETS["2-3"]);
const g2_4: Gen = (r) => tab(r, TABLE_SETS["2-4"]);

const G2_5_A = [1, 2, 3, 4, 5, 6, 7, 8, 9, 6, 7, 8, 9];
const G2_5_B = [2, 3, 4, 5, 6, 7, 8, 9, 6, 7, 8, 9];

const g2_5: Gen = (r) => {
  const a = r.pick(G2_5_A);
  const b = r.pick(G2_5_B);
  return bin(a, "×", b);
};

const g2_6: Gen = (r) => {
  const a = r.int(2, 9);
  const b = r.int(2, 9);
  if (r.next() < 0.5) return { shape: "missingFactor", known: a, product: a * b, unknownPosition: "right" };
  return { shape: "missingFactor", known: b, product: a * b, unknownPosition: "left" };
};

const g2_7: Gen = (r) => {
  const d = r.int(2, 9);
  const q = r.int(1, 9);
  return bin(d * q, "÷", d);
};

const g2_8: Gen = (r) => {
  const d = r.int(2, 9);
  const q = r.int(1, 9);
  const m = r.int(1, d - 1);
  return divRem(d * q + m, d);
};

const g2_9: Gen = (r) => {
  const t = r.next();
  return t < 0.4 ? g2_5(r) : t < 0.8 ? g2_7(r) : g2_8(r);
};

// ---------------- Stage 3 ----------------
const g3_1: Gen = (r) => {
  const t = r.next();
  if (t < 0.25) {
    const a = r.int(1, 9) * 10;
    const b = r.int(1, 9) * 10;
    return bin(a, "+", b);
  }
  if (t < 0.5) {
    const a = r.int(2, 9) * 10;
    const b = r.int(1, a / 10 - 1) * 10;
    return bin(a, "-", b);
  }
  if (t < 0.75) {
    const a = r.int(1, 9) * 10;
    const b = r.int(1, 9);
    return swap(r, a, "+", b, 0.7);
  }
  const a = r.int(1, 9) * 10;
  const b = r.int(1, 9);
  return bin(a + b, "-", b);
};

const g3_2: Gen = (r) => {
  const want = r.next() < 0.7;
  for (;;) {
    const a = r.int(11, 98);
    const b = r.int(2, 9);
    if (((a % 10) + b >= 10) === want) return swap(r, a, "+", b, 0.8);
  }
};

const g3_3: Gen = (r) => {
  const want = r.next() < 0.7;
  for (;;) {
    const a = r.int(11, 99);
    const b = r.int(2, 9);
    if (a - b >= 10 && (a % 10 < b) === want) return bin(a, "-", b);
  }
};

const g3_4: Gen = (r) => {
  const tens = r.int(1, 9) * 10;
  const a = tens + (r.next() < 0.85 ? r.int(1, 9) : 0);
  const t = r.int(1, 9) * 10;
  if (r.next() < 0.5 && a - t >= 10) return bin(a, "-", t);
  return swap(r, a, "+", t, 0.7);
};

const g3_5: Gen = (r) => {
  const want = r.next() < 0.6;
  for (;;) {
    const a = r.int(11, 99);
    const b = r.int(11, 99);
    if (a % 10 && b % 10 && ((a % 10) + (b % 10) >= 10) === want) return bin(a, "+", b);
  }
};

const g3_6: Gen = (r) => {
  const want = r.next() < 0.6;
  for (;;) {
    const a = r.int(21, 99);
    const b = r.int(11, a - 1);
    if (b % 10 && a % 10 !== b % 10 && (a % 10 < b % 10) === want) return bin(a, "-", b);
  }
};

const g3_7: Gen = (r) => {
  let a: number;
  if (r.next() < 0.8) {
    const tens = r.int(1, 9) * 10;
    a = tens + r.int(1, 9);
  } else {
    a = r.int(1, 9) * 10;
  }
  if (r.next() < 0.6) return bin(100, "-", a);
  return complementTo(a, 100);
};

const g3_8: Gen = (r) => {
  const f = r.int(2, 9);
  const digit = r.int(2, 9);
  const t = digit * (r.next() < 0.6 ? 10 : 100);
  return swap(r, t, "×", f, 0.6);
};

const g3_9: Gen = (r) => {
  const a = r.int(11, 19);
  const b = r.int(2, 9);
  return swap(r, a, "×", b, 0.6);
};

const g3_10: Gen = (r) => {
  const tens = r.int(2, 9) * 10;
  const a = tens + r.int(1, 9);
  const b = r.int(2, 9);
  return swap(r, a, "×", b, 0.7);
};

const g3_11: Gen = (r) => {
  const d = r.int(2, 9);
  const digit = r.int(1, 9);
  const q = digit * (r.next() < 0.6 ? 10 : 100);
  return bin(d * q, "÷", d);
};

const g3_12: Gen = (r) => {
  for (;;) {
    const d = r.int(2, 9);
    const q = r.int(11, 49);
    if (d * q <= 99 && (d * q) % 10) return bin(d * q, "÷", d);
  }
};

const g3_13: Gen = (r) => {
  for (;;) {
    const d = r.int(2, 9);
    const q = r.int(10, 49);
    const m = r.int(1, d - 1);
    const n = d * q + m;
    if (n <= 99) return divRem(n, d);
  }
};

const G3_14 = [g3_2, g3_3, g3_4, g3_5, g3_6, g3_7, g3_8, g3_9, g3_10, g3_11, g3_12, g3_13];
const g3_14: Gen = (r) => r.pick(G3_14)(r);

// ---------------- Stage 4 ----------------
const g4_1: Gen = (r) => {
  const a = r.int(101, 999);
  const b = r.int(11, 99);
  return swap(r, a, "+", b, 0.8);
};

const g4_2: Gen = (r) => {
  const a = r.int(101, 999);
  const b = r.int(11, 99);
  return bin(a, "-", b);
};

const g4_3: Gen = (r) => {
  const a = r.int(101, 899);
  const b = r.int(101, 899);
  return bin(a, "+", b);
};

const g4_4: Gen = (r) => {
  const a = r.int(201, 999);
  const b = r.int(101, a - 1);
  return bin(a, "-", b);
};

const g4_5: Gen = (r) => {
  let a: number;
  if (r.next() < 0.8) {
    const h = r.int(1, 9) * 100;
    const t = r.int(0, 9) * 10;
    a = h + t + r.int(1, 9);
  } else {
    const h = r.int(1, 9) * 100;
    a = h + r.int(1, 9) * 10;
  }
  if (r.next() < 0.6) return bin(1000, "-", a);
  return complementTo(a, 1000);
};

/** two-digit number whose ones digit is not 0: randint(1, 8) * 10 + randint(1, 9) */
function twoDigitNonRound(r: Rng): number {
  const tens = r.int(1, 8) * 10;
  return tens + r.int(1, 9);
}

const g4_6: Gen = (r) => {
  const t = r.next();
  if (t < 0.4) {
    const x = twoDigitNonRound(r);
    const terms = [x, r.int(11, 99), 100 - x];
    r.shuffle(terms);
    return chain(terms, ["+", "+"]);
  }
  if (t < 0.7) {
    const a = r.int(50, 99);
    const b = r.int(21, 49);
    const c = b - 10 * r.int(1, Math.floor((b - 11) / 10));
    return chain([a, b, c], ["-", "+"]);
  }
  const x = twoDigitNonRound(r);
  const y = twoDigitNonRound(r);
  const w = r.int(1, 8) * 10 + (10 - (y % 10));
  const terms = [x, y, 100 - x, w];
  r.shuffle(terms);
  return chain(terms, ["+", "+", "+"]);
};

const G4_7_ZEROS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 1],
  [1, 2],
];

const g4_7: Gen = (r) => {
  const a = r.int(2, 9);
  const b = r.int(2, 9);
  const [m, n] = r.pick(G4_7_ZEROS);
  return bin(a * 10 ** m, "×", b * 10 ** n);
};

const g4_8: Gen = (r) => {
  const a = r.int(101, 999);
  const b = r.int(2, 9);
  return swap(r, a, "×", b, 0.8);
};

const g4_9: Gen = (r) => {
  for (;;) {
    const d = r.int(2, 9);
    const q = r.int(20, 199);
    if (d * q >= 100 && d * q <= 999) return bin(d * q, "÷", d);
  }
};

const g4_10: Gen = (r) => {
  for (;;) {
    const d = r.int(2, 9);
    const n = r.int(100, 999);
    if (n % d) return divRem(n, d);
  }
};

const g4_11: Gen = (r) => {
  for (;;) {
    const d = r.int(2, 9) * 10;
    const q = r.int(2, 90);
    const n = d * q;
    if (n % 100 === 0 && n >= 200 && n <= 9900) return bin(n, "÷", d);
  }
};

const G4_12 = [g4_1, g4_2, g4_3, g4_4, g4_5, g4_6, g4_7, g4_8, g4_9, g4_10, g4_11];
const g4_12: Gen = (r) => r.pick(G4_12)(r);

// ---------------- Stage 5 ----------------
/** _near_round: 1〜2 below a multiple of ten in [lo_tens*10, hi_tens*10]. */
function nearRound(r: Rng, loTens: number, hiTens: number): number {
  const tens = r.int(loTens, hiTens) * 10;
  return tens - r.pick([1, 2]);
}

const g5_1: Gen = (r) => {
  const t = r.next();
  if (t < 0.3) {
    const a = r.int(11, 89);
    const b = nearRound(r, 1, 9);
    return swap(r, a, "+", b, 0.8);
  }
  if (t < 0.55) {
    const b = nearRound(r, 2, 8);
    const a = r.int(b + 5, 99);
    return bin(a, "-", b);
  }
  if (t < 0.75) {
    const a = r.int(101, 799);
    const hundreds = r.int(1, 4) * 100;
    const b = hundreds - r.pick([1, 2]);
    if (r.next() < 0.5) return bin(a, "+", b);
    return bin(a + b, "-", b);
  }
  const a = nearRound(r, 2, 10);
  const b = r.int(3, 9);
  return swap(r, a, "×", b, 0.8);
};

const g5_2: Gen = (r) => {
  if (r.next() < 0.6) {
    const tens = r.int(1, 8) * 10;
    const b = tens + r.pick([7, 8, 9]);
    const a = r.int(b + 11, b + 80);
    return bin(a, "-", b);
  }
  const base = r.next() < 0.6 ? r.int(2, 99) * 100 : r.int(2, 9) * 1000;
  const a = base + r.int(1, 9);
  const b = base - r.int(1, 9);
  return bin(a, "-", b);
};

const G5_3_TOTALS = [90, 180, 180, 360, 360];

const g5_3: Gen = (r) => {
  const t = r.pick(G5_3_TOTALS);
  for (;;) {
    const a = r.int(11, t - 11);
    if (a % 10 || r.next() < 0.2) return bin(t, "-", a);
  }
};

const g5_4: Gen = (r) => {
  const t = r.next();
  if (t < 0.4) return swap(r, r.int(12, 98), "×", 5, 0.8);
  if (t < 0.75) {
    const a = r.next() < 0.7 ? r.int(3, 24) * 4 : r.int(12, 96);
    return swap(r, a, "×", 25, 0.8);
  }
  return swap(r, r.int(6, 49) * 2, "×", 50, 0.8);
};

const g5_5: Gen = (r) => {
  if (r.next() < 0.6) {
    const q = r.int(7, 99);
    return bin(5 * q, "÷", 5);
  }
  const q = r.int(4, 99);
  return bin(25 * q, "÷", 25);
};

const g5_6: Gen = (r) => {
  const a = r.int(12, 98);
  const m = r.pick([9, 99, 11]);
  return swap(r, a, "×", m, 0.8);
};

const g5_7: Gen = (r) => {
  const a = r.int(6, 24) * 2;
  const b = r.int(1, 9) * 10 + 5;
  return swap(r, a, "×", b);
};

const g5_8: Gen = (r) => {
  const a = r.int(11, 19);
  const b = r.int(11, 19);
  return bin(a, "×", b);
};

const G5_9_DIVISORS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 26, 27, 29, 13, 17, 19, 23, 29];

const g5_9: Gen = (r) => {
  const d = r.pick(G5_9_DIVISORS);
  const q = r.int(2, 9);
  return bin(d * q, "÷", d);
};

const G5_10_K = [2, 3, 4, 5, 6, 8, 9];

const g5_10: Gen = (r) => {
  const k = r.pick(G5_10_K);
  const want = r.next() < 0.5;
  for (;;) {
    const n = r.int(100, 9999);
    if ((n % k === 0) === want) return { shape: "divisibility", n, k };
  }
};

const G5_11 = [g5_1, g5_2, g5_3, g5_4, g5_5, g5_6, g5_7, g5_8, g5_9, g5_10, g4_6, g4_11];
const g5_11: Gen = (r) => r.pick(G5_11)(r);

export const GENERATORS: Record<string, (r: Rng) => Problem> = {
  "0-1": g0_1,
  "0-2": g0_2,
  "0-3": g0_3,
  "0-4": g0_4,
  "0-5": g0_5,
  "1-1": g1_1,
  "1-2": g1_2,
  "1-3": g1_3,
  "1-4": g1_4,
  "1-5": g1_5,
  "1-6": g1_6,
  "1-7": g1_7,
  "1-8": g1_8,
  "1-9": g1_9,
  "1-10": g1_10,
  "2-1": g2_1,
  "2-2": g2_2,
  "2-3": g2_3,
  "2-4": g2_4,
  "2-5": g2_5,
  "2-6": g2_6,
  "2-7": g2_7,
  "2-8": g2_8,
  "2-9": g2_9,
  "3-1": g3_1,
  "3-2": g3_2,
  "3-3": g3_3,
  "3-4": g3_4,
  "3-5": g3_5,
  "3-6": g3_6,
  "3-7": g3_7,
  "3-8": g3_8,
  "3-9": g3_9,
  "3-10": g3_10,
  "3-11": g3_11,
  "3-12": g3_12,
  "3-13": g3_13,
  "3-14": g3_14,
  "4-1": g4_1,
  "4-2": g4_2,
  "4-3": g4_3,
  "4-4": g4_4,
  "4-5": g4_5,
  "4-6": g4_6,
  "4-7": g4_7,
  "4-8": g4_8,
  "4-9": g4_9,
  "4-10": g4_10,
  "4-11": g4_11,
  "4-12": g4_12,
  "5-1": g5_1,
  "5-2": g5_2,
  "5-3": g5_3,
  "5-4": g5_4,
  "5-5": g5_5,
  "5-6": g5_6,
  "5-7": g5_7,
  "5-8": g5_8,
  "5-9": g5_9,
  "5-10": g5_10,
  "5-11": g5_11,
};

export function makeInstance(levelId: string, problem: Problem): ProblemInstance {
  const answer = computeAnswer(problem);
  const inst: ProblemInstance = {
    levelId,
    problem,
    answer,
    answerDigits: answerDigits(answer),
    factKey: factKey(problem),
  };
  const set: readonly number[] | undefined = TABLE_SETS[levelId];
  if (set && problem.shape === "binary" && problem.op === "×") {
    const inSet = [problem.a, problem.b].filter((v) => set.includes(v));
    if (inSet.length) inst.tableFactor = Math.max(...inSet);
  }
  return inst;
}

// ---------------- Enumeration (levels with enumerable: true) ----------------
function range(lo: number, hi: number, step = 1): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi; v += step) out.push(v);
  return out;
}

/** Both orders, as produced by _swap. */
const bothOrders = (a: number, op: BinOp, b: number): Problem[] => [bin(a, op, b), bin(b, op, a)];

const pairs = (xs: readonly number[], ys: readonly number[]): [number, number][] =>
  xs.flatMap((x) => ys.map((y): [number, number] => [x, y]));

const BORROW_PAIRS = pairs(range(11, 18), range(2, 9)).filter(([a, b]) => a % 10 < b);
const tabAll = (bases: readonly number[]): Problem[] => pairs(range(1, 9), bases).flatMap(([a, b]) => bothOrders(a, "×", b));
const e1_5 = (): Problem[] => pairs(range(0, 9), range(0, 9)).map(([a, b]) => bin(a, "+", b));
const e1_9 = (): Problem[] => pairs(range(0, 9), range(0, 9)).map(([b, c]) => bin(b + c, "-", b));
const TENS_OR_HUNDREDS = [...range(10, 90, 10), ...range(100, 900, 100)];

const ENUMERATORS: Record<string, () => Problem[]> = {
  "0-1": () => range(1, 9).map((a) => complementTo(a, 10)),
  "0-2": () => range(1, 9).flatMap((b): Problem[] => [bin(10, "+", b), { shape: "decompose", n: 10 + b }]),
  "0-3": () => range(1, 10).flatMap((a): Problem[] => [bin(a, "+", a), { shape: "half", n: 2 * a }]),
  "0-5": () => range(10, 90, 10).map((a) => complementTo(a, 100)),
  "1-1": () => pairs(range(0, 9), [0, 1, 2]).flatMap(([a, b]) => bothOrders(a, "+", b)),
  "1-2": () => pairs(range(1, 9), range(1, 9)).filter(([a, b]) => a + b <= 10).map(([a, b]) => bin(a, "+", b)),
  "1-3": () => range(2, 8).flatMap((a) => [bin(a, "+", a), bin(a, "+", a + 1), bin(a + 1, "+", a)]),
  "1-4": () =>
    pairs(range(2, 9), range(2, 9))
      .filter(([a, b]) => a + b >= 11 && a + b <= 18)
      .map(([a, b]) => bin(a, "+", b)),
  "1-5": e1_5,
  "1-6": () => range(1, 10).flatMap((a) => range(0, a).map((b) => bin(a, "-", b))),
  "1-7": () => BORROW_PAIRS.map(([a, b]) => bin(a, "-", b)),
  "1-8": () => BORROW_PAIRS.map(([a, b]): Problem => ({ shape: "missingAddend", b, total: a })),
  "1-9": e1_9,
  "1-10": () => [...e1_5(), ...e1_9()],
  "2-1": () => tabAll(TABLE_SETS["2-1"]),
  "2-2": () => tabAll(TABLE_SETS["2-2"]),
  "2-3": () => tabAll(TABLE_SETS["2-3"]),
  "2-4": () => tabAll(TABLE_SETS["2-4"]),
  "2-5": () => pairs(range(1, 9), range(2, 9)).map(([a, b]) => bin(a, "×", b)),
  "2-6": () =>
    pairs(range(2, 9), range(2, 9)).flatMap(([a, b]): Problem[] => [
      { shape: "missingFactor", known: a, product: a * b, unknownPosition: "right" },
      { shape: "missingFactor", known: b, product: a * b, unknownPosition: "left" },
    ]),
  "2-7": () => pairs(range(2, 9), range(1, 9)).map(([d, q]) => bin(d * q, "÷", d)),
  "3-7": () =>
    [...pairs(range(1, 9), range(1, 9)).map(([t, o]) => t * 10 + o), ...range(10, 90, 10)].flatMap((a) => [
      bin(100, "-", a),
      complementTo(a, 100),
    ]),
  "3-9": () => pairs(range(11, 19), range(2, 9)).flatMap(([a, b]) => bothOrders(a, "×", b)),
  "3-11": () => pairs(range(2, 9), TENS_OR_HUNDREDS).map(([d, q]) => bin(d * q, "÷", d)),
  "3-12": () =>
    pairs(range(2, 9), range(11, 49))
      .filter(([d, q]) => d * q <= 99 && (d * q) % 10 !== 0)
      .map(([d, q]) => bin(d * q, "÷", d)),
  "4-7": () => pairs(range(2, 9), range(2, 9)).flatMap(([a, b]) => G4_7_ZEROS.map(([m, n]) => bin(a * 10 ** m, "×", b * 10 ** n))),
  "4-11": () =>
    pairs(range(20, 90, 10), range(2, 90))
      .filter(([d, q]) => (d * q) % 100 === 0 && d * q >= 200 && d * q <= 9900)
      .map(([d, q]) => bin(d * q, "÷", d)),
  "5-5": () => [...range(7, 99).map((q) => bin(5 * q, "÷", 5)), ...range(4, 99).map((q) => bin(25 * q, "÷", 25))],
  "5-8": () => pairs(range(11, 19), range(11, 19)).map(([a, b]) => bin(a, "×", b)),
  "5-9": () => pairs([...new Set(G5_9_DIVISORS)], range(2, 9)).map(([d, q]) => bin(d * q, "÷", d)),
};

const ENUMERABLE = new Set(curriculum.levels.filter((l) => l.enumerable).map((l) => l.id));

/**
 * Every distinct problem (by display()) the level's generator can produce, both orders where it swaps.
 * null for levels that curriculum.json does not mark `enumerable`.
 */
export function enumerateLevel(levelId: string): Problem[] | null {
  if (!ENUMERABLE.has(levelId)) return null;
  const make = ENUMERATORS[levelId];
  if (!make) throw new Error(`no enumerator for enumerable level ${levelId}`);
  const seen = new Set<string>();
  return make().filter((p) => {
    const key = display(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
