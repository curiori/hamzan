// Generator tests. Per level, 2,000 problems from mulberry32(fixed seed):
//   - answers verified independently from the display string (like reference_generators.py _self_test),
//   - display/parse round trip, shape listed in curriculum.json, makeInstance fields,
//   - every range / exclusion of the Python g*_* function,
//   - ratio conditions within ±5 points,
//   - enumerable levels: every generated problem is in enumerateLevel(), no duplicates, and the
//     enumeration equals the generator's exact support (exhaustive search over every Rng outcome).
// Plus: on a CPython-compatible Rng (pyrng.ts) the generators reproduce reference_generators.py
// problem-for-problem (same ranges, branches and Rng call order).
// run (from the project root): bun run tests/domain/generators.ts
import { readFileSync } from "node:fs";
import { GENERATORS, TABLE_SETS, enumerateLevel, makeInstance } from "../../src/domain/generators.ts";
import { mulberry32, type Rng } from "../../src/domain/rng.ts";
import {
  answerText,
  computeAnswer,
  display,
  factKey,
  parseDisplay,
  type Problem,
} from "../../src/domain/problem.ts";
import { Checker, LEVELS, pythonReference, selfTestAnswer } from "./common.ts";
import { pyRandom } from "./pyrng.ts";

const N = 2000;
const SEED = 20261028;
const c = new Checker("generators");

// ---------------- helpers ----------------
type Bin = Extract<Problem, { shape: "binary" }>;
const range = (lo: number, hi: number, step = 1) => {
  const out: number[] = [];
  for (let v = lo; v <= hi; v += step) out.push(v);
  return out;
};
const inR = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi;
const tens = (v: number, lo = 10, hi = 90) => v % 10 === 0 && inR(v, lo, hi);
const bin = (p: Problem, op?: Bin["op"]): Bin | null => (p.shape === "binary" && (!op || p.op === op) ? p : null);
const either = (a: number, b: number, f: (v: number) => boolean, g: (v: number) => boolean) => (f(a) && g(b)) || (f(b) && g(a));
const twoDigitNonRound = (v: number) => inR(v, 11, 89) && v % 10 !== 0; // randint(1, 8) * 10 + randint(1, 9)
const nearRoundSet = (lo: number, hi: number) => new Set(range(lo, hi).flatMap((k) => [10 * k - 1, 10 * k - 2]));
const NR19 = nearRoundSet(1, 9);
const NR28 = nearRoundSet(2, 8);
const NR210 = nearRoundSet(2, 10);
const H = new Set([1, 2, 3, 4].flatMap((k) => [100 * k - 1, 100 * k - 2]));
const exactDiv = (p: Problem, d: (v: number) => boolean, q: (v: number) => boolean) => {
  const b = bin(p, "÷");
  return !!b && d(b.b) && b.a % b.b === 0 && q(b.a / b.b);
};
const tz = (x: number) => {
  let n = 0;
  while (x && x % 10 === 0) {
    x /= 10;
    n++;
  }
  return n;
};
const permutations = <T,>(xs: T[]): T[][] =>
  xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));

// ---------------- range / exclusion validators (one per Python function) ----------------
const V: Record<string, (p: Problem) => boolean> = {
  "0-1": (p) => p.shape === "complementTo" && p.total === 10 && inR(p.a, 1, 9),
  "0-2": (p) => (p.shape === "binary" && p.op === "+" && p.a === 10 && inR(p.b, 1, 9)) || (p.shape === "decompose" && inR(p.n, 11, 19)),
  "0-3": (p) => (p.shape === "binary" && p.op === "+" && p.a === p.b && inR(p.a, 1, 10)) || (p.shape === "half" && p.n % 2 === 0 && inR(p.n, 2, 20)),
  "0-4": (p) => {
    const b = bin(p);
    if (!b) return false;
    if (b.op === "×" && b.b === 10) return inR(b.a, 2, 99);
    if (b.op === "×" && b.b === 100) return inR(b.a, 2, 9);
    return b.op === "÷" && b.b === 10 && b.a % 10 === 0 && inR(b.a / 10, 2, 99);
  },
  "0-5": (p) => p.shape === "complementTo" && p.total === 100 && tens(p.a),
  "1-1": (p) => {
    const b = bin(p, "+");
    return !!b && either(b.a, b.b, (v) => inR(v, 0, 9), (v) => inR(v, 0, 2));
  },
  "1-2": (p) => {
    const b = bin(p, "+");
    return !!b && inR(b.a, 1, 9) && inR(b.b, 1, 9) && b.a + b.b <= 10;
  },
  "1-3": (p) => {
    const b = bin(p, "+");
    return !!b && ((b.a === b.b && inR(b.a, 2, 8)) || (b.b === b.a + 1 && inR(b.a, 2, 8)) || (b.a === b.b + 1 && inR(b.b, 2, 8)));
  },
  "1-4": (p) => {
    const b = bin(p, "+");
    return !!b && inR(b.a, 2, 9) && inR(b.b, 2, 9) && inR(b.a + b.b, 11, 18);
  },
  "1-5": (p) => {
    const b = bin(p, "+");
    return !!b && inR(b.a, 0, 9) && inR(b.b, 0, 9);
  },
  "1-6": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.a, 1, 10) && inR(b.b, 0, b.a);
  },
  "1-7": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.a, 11, 18) && inR(b.b, 2, 9) && b.a % 10 < b.b;
  },
  "1-8": (p) => p.shape === "missingAddend" && inR(p.total, 11, 18) && inR(p.b, 2, 9) && p.total % 10 < p.b,
  "1-9": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.b, 0, 9) && inR(b.a - b.b, 0, 9);
  },
  "1-10": (p) => V["1-5"](p) || V["1-9"](p),
  "2-1": (p) => tableOk(p, "2-1"),
  "2-2": (p) => tableOk(p, "2-2"),
  "2-3": (p) => tableOk(p, "2-3"),
  "2-4": (p) => tableOk(p, "2-4"),
  "2-5": (p) => {
    const b = bin(p, "×");
    return !!b && inR(b.a, 1, 9) && inR(b.b, 2, 9);
  },
  "2-6": (p) => p.shape === "missingFactor" && inR(p.known, 2, 9) && p.product % p.known === 0 && inR(p.product / p.known, 2, 9),
  "2-7": (p) => exactDiv(p, (d) => inR(d, 2, 9), (q) => inR(q, 1, 9)),
  "2-8": (p) =>
    p.shape === "divRem" && inR(p.divisor, 2, 9) && inR(Math.floor(p.dividend / p.divisor), 1, 9) && inR(p.dividend % p.divisor, 1, p.divisor - 1),
  "2-9": (p) => V["2-5"](p) || V["2-7"](p) || V["2-8"](p),
  "3-1": (p) => {
    const b = bin(p);
    if (!b) return false;
    if (b.op === "+") return (tens(b.a) && tens(b.b)) || either(b.a, b.b, (v) => tens(v), (v) => inR(v, 1, 9));
    if (b.op === "-") return (tens(b.a, 20, 90) && tens(b.b) && b.b <= b.a - 10) || (inR(b.b, 1, 9) && tens(b.a - b.b));
    return false;
  },
  "3-2": (p) => {
    const b = bin(p, "+");
    return !!b && either(b.a, b.b, (v) => inR(v, 11, 98), (v) => inR(v, 2, 9));
  },
  "3-3": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.a, 11, 99) && inR(b.b, 2, 9) && b.a - b.b >= 10;
  },
  "3-4": (p) => {
    const b = bin(p);
    if (!b) return false;
    if (b.op === "-") return inR(b.a, 10, 99) && tens(b.b) && b.a - b.b >= 10;
    return b.op === "+" && either(b.a, b.b, (v) => inR(v, 10, 99), (v) => tens(v));
  },
  "3-5": (p) => {
    const b = bin(p, "+");
    return !!b && inR(b.a, 11, 99) && inR(b.b, 11, 99) && b.a % 10 !== 0 && b.b % 10 !== 0;
  },
  "3-6": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.a, 21, 99) && inR(b.b, 11, b.a - 1) && b.b % 10 !== 0 && b.a % 10 !== b.b % 10;
  },
  "3-7": (p) => {
    const x = complementOf(p, 100);
    return x !== null && ((inR(x, 11, 99) && x % 10 !== 0) || tens(x));
  },
  "3-8": (p) => {
    const b = bin(p, "×");
    const t = (v: number) => tens(v, 20, 90) || (v % 100 === 0 && inR(v, 200, 900));
    return !!b && either(b.a, b.b, t, (v) => inR(v, 2, 9));
  },
  "3-9": (p) => {
    const b = bin(p, "×");
    return !!b && either(b.a, b.b, (v) => inR(v, 11, 19), (v) => inR(v, 2, 9));
  },
  "3-10": (p) => {
    const b = bin(p, "×");
    return !!b && either(b.a, b.b, (v) => inR(v, 21, 99) && v % 10 !== 0, (v) => inR(v, 2, 9));
  },
  "3-11": (p) => exactDiv(p, (d) => inR(d, 2, 9), (q) => tens(q) || (q % 100 === 0 && inR(q, 100, 900))),
  "3-12": (p) => exactDiv(p, (d) => inR(d, 2, 9), (q) => inR(q, 11, 49)) && (p as Bin).a <= 99 && (p as Bin).a % 10 !== 0,
  "3-13": (p) =>
    p.shape === "divRem" &&
    inR(p.divisor, 2, 9) &&
    inR(Math.floor(p.dividend / p.divisor), 10, 49) &&
    inR(p.dividend % p.divisor, 1, p.divisor - 1) &&
    p.dividend <= 99,
  "3-14": (p) => ["3-2", "3-3", "3-4", "3-5", "3-6", "3-7", "3-8", "3-9", "3-10", "3-11", "3-12", "3-13"].some((id) => V[id](p)),
  "4-1": (p) => {
    const b = bin(p, "+");
    return !!b && either(b.a, b.b, (v) => inR(v, 101, 999), (v) => inR(v, 11, 99));
  },
  "4-2": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.a, 101, 999) && inR(b.b, 11, 99);
  },
  "4-3": (p) => {
    const b = bin(p, "+");
    return !!b && inR(b.a, 101, 899) && inR(b.b, 101, 899);
  },
  "4-4": (p) => {
    const b = bin(p, "-");
    return !!b && inR(b.a, 201, 999) && inR(b.b, 101, b.a - 1);
  },
  "4-5": (p) => {
    const x = complementOf(p, 1000);
    return x !== null && inR(x, 101, 999) && (x % 10 !== 0 || Math.floor(x / 10) % 10 !== 0);
  },
  "4-6": (p) => {
    if (p.shape !== "chain") return false;
    const t = p.terms;
    if (t.length === 3 && p.ops.join() === "-,+") {
      const [a, b, cc] = t;
      return inR(a, 50, 99) && inR(b, 21, 49) && (b - cc) % 10 === 0 && inR((b - cc) / 10, 1, Math.floor((b - 11) / 10));
    }
    if (t.length === 3 && p.ops.join() === "+,+")
      return permutations(t).some(([x, y, z]) => twoDigitNonRound(x) && z === 100 - x && inR(y, 11, 99));
    if (t.length === 4 && p.ops.join() === "+,+,+")
      return permutations(t).some(
        ([x, y, z, w]) => twoDigitNonRound(x) && z === 100 - x && twoDigitNonRound(y) && (w - (10 - (y % 10))) % 10 === 0 && inR((w - (10 - (y % 10))) / 10, 1, 8),
      );
    return false;
  },
  "4-7": (p) => {
    const b = bin(p, "×");
    if (!b) return false;
    const m = tz(b.a);
    const n = tz(b.b);
    const ok = (m === 1 && n === 1) || (m === 2 && n === 1) || (m === 1 && n === 2);
    return ok && inR(b.a / 10 ** m, 2, 9) && inR(b.b / 10 ** n, 2, 9);
  },
  "4-8": (p) => {
    const b = bin(p, "×");
    return !!b && either(b.a, b.b, (v) => inR(v, 101, 999), (v) => inR(v, 2, 9));
  },
  "4-9": (p) => exactDiv(p, (d) => inR(d, 2, 9), (q) => inR(q, 20, 199)) && inR((p as Bin).a, 100, 999),
  "4-10": (p) => p.shape === "divRem" && inR(p.divisor, 2, 9) && inR(p.dividend, 100, 999) && p.dividend % p.divisor !== 0,
  "4-11": (p) => exactDiv(p, (d) => tens(d, 20, 90), (q) => inR(q, 2, 90)) && (p as Bin).a % 100 === 0 && inR((p as Bin).a, 200, 9900),
  "4-12": (p) => ["4-1", "4-2", "4-3", "4-4", "4-5", "4-6", "4-7", "4-8", "4-9", "4-10", "4-11"].some((id) => V[id](p)),
  "5-1": (p) => {
    const b = bin(p);
    if (!b) return false;
    if (b.op === "+") return either(b.a, b.b, (v) => inR(v, 11, 89), (v) => NR19.has(v)) || (inR(b.a, 101, 799) && H.has(b.b));
    if (b.op === "-") return (NR28.has(b.b) && inR(b.a, b.b + 5, 99)) || (H.has(b.b) && inR(b.a - b.b, 101, 799));
    return b.op === "×" && either(b.a, b.b, (v) => NR210.has(v), (v) => inR(v, 3, 9));
  },
  "5-2": (p) => {
    const b = bin(p, "-");
    if (!b) return false;
    const twoDigit = inR(b.b % 10, 7, 9) && inR(Math.floor(b.b / 10), 1, 8) && inR(b.a, b.b + 11, b.b + 80);
    const near = range(1, 9).some((i) => {
      const base = b.a - i;
      const okBase = (base % 100 === 0 && inR(base / 100, 2, 99)) || (base % 1000 === 0 && inR(base / 1000, 2, 9));
      return okBase && inR(base - b.b, 1, 9);
    });
    return twoDigit || near;
  },
  "5-3": (p) => {
    const b = bin(p, "-");
    return !!b && [90, 180, 360].includes(b.a) && inR(b.b, 11, b.a - 11);
  },
  "5-4": (p) => {
    const b = bin(p, "×");
    if (!b) return false;
    const ok = (m: number, o: number) =>
      (m === 5 && inR(o, 12, 98)) || (m === 25 && inR(o, 12, 96)) || (m === 50 && o % 2 === 0 && inR(o, 12, 98));
    return ok(b.a, b.b) || ok(b.b, b.a);
  },
  "5-5": (p) => exactDiv(p, (d) => d === 5, (q) => inR(q, 7, 99)) || exactDiv(p, (d) => d === 25, (q) => inR(q, 4, 99)),
  "5-6": (p) => {
    const b = bin(p, "×");
    return !!b && either(b.a, b.b, (v) => inR(v, 12, 98), (v) => [9, 99, 11].includes(v));
  },
  "5-7": (p) => {
    const b = bin(p, "×");
    return !!b && either(b.a, b.b, (v) => v % 2 === 0 && inR(v, 12, 48), (v) => v % 10 === 5 && inR(v, 15, 95));
  },
  "5-8": (p) => {
    const b = bin(p, "×");
    return !!b && inR(b.a, 11, 19) && inR(b.b, 11, 19);
  },
  "5-9": (p) => exactDiv(p, (d) => [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 26, 27, 29].includes(d), (q) => inR(q, 2, 9)),
  "5-10": (p) => p.shape === "divisibility" && [2, 3, 4, 5, 6, 8, 9].includes(p.k) && inR(p.n, 100, 9999),
  "5-11": (p) => ["5-1", "5-2", "5-3", "5-4", "5-5", "5-6", "5-7", "5-8", "5-9", "5-10", "4-6", "4-11"].some((id) => V[id](p)),
};

function tableOk(p: Problem, lid: string): boolean {
  const b = bin(p, "×");
  const set = TABLE_SETS[lid];
  return !!b && either(b.a, b.b, (v) => inR(v, 1, 9), (v) => set.includes(v));
}

/** x of "total－x＝" or "xと□でtotal" */
function complementOf(p: Problem, total: number): number | null {
  if (p.shape === "complementTo" && p.total === total) return p.a;
  if (p.shape === "binary" && p.op === "-" && p.a === total) return p.b;
  return null;
}

// ---------------- ratio conditions (expected %, ±5 points) ----------------
interface Ratio {
  name: string;
  expected: number;
  of: (p: Problem) => boolean;
  among?: (p: Problem) => boolean;
}
const B = (p: Problem) => p as Bin;
const isOp = (p: Problem, op: Bin["op"]) => p.shape === "binary" && p.op === op;
const share = (name: string, expected: number, of: (p: Problem) => boolean, among?: (p: Problem) => boolean): Ratio => ({ name, expected, of, among });
const keptOrder = (lid: string) =>
  share(
    "order a×b (table factor right)",
    50,
    (p) => TABLE_SETS[lid].includes(B(p).b),
    (p) => TABLE_SETS[lid].includes(B(p).a) !== TABLE_SETS[lid].includes(B(p).b),
  );
const RATIOS: Record<string, Ratio[]> = {
  "0-2": [share("decompose (nは10と□)", 50, (p) => p.shape === "decompose")],
  "0-3": [share("halves (nの半分)", 50, (p) => p.shape === "half")],
  "0-4": [
    share("a×10", 40, (p) => isOp(p, "×") && B(p).b === 10),
    share("a×100", 30, (p) => isOp(p, "×") && B(p).b === 100),
    share("(10a)÷10", 30, (p) => isOp(p, "÷")),
  ],
  "1-1": [share("order a＋b kept", 60, (p) => B(p).a >= 3, (p) => Math.max(B(p).a, B(p).b) >= 3)],
  "1-3": [
    share("a＋a", 34, (p) => B(p).a === B(p).b),
    share("a＋(a+1)", 33, (p) => B(p).b === B(p).a + 1),
    share("(a+1)＋a", 33, (p) => B(p).a === B(p).b + 1),
  ],
  "1-10": [share("＋ (1-5)", 50, (p) => isOp(p, "+"))],
  "2-1": [keptOrder("2-1")],
  "2-2": [keptOrder("2-2")],
  "2-3": [keptOrder("2-3")],
  "2-4": [keptOrder("2-4")],
  "2-5": [share("a in 6〜9 (8/13)", (8 / 13) * 100, (p) => B(p).a >= 6), share("b in 6〜9 (8/12)", (8 / 12) * 100, (p) => B(p).b >= 6)],
  "2-6": [share("a×□＝p", 50, (p) => p.shape === "missingFactor" && p.unknownPosition === "right")],
  "2-9": [
    share("× (2-5)", 40, (p) => isOp(p, "×")),
    share("÷ exact (2-7)", 40, (p) => isOp(p, "÷")),
    share("あまり (2-8)", 20, (p) => p.shape === "divRem"),
  ],
  "3-1": [
    share("何十＋何十", 25, (p) => isOp(p, "+") && B(p).a % 10 === 0 && B(p).b % 10 === 0),
    share("何十－何十", 25, (p) => isOp(p, "-") && B(p).b % 10 === 0),
    share("何十＋1桁", 25, (p) => isOp(p, "+") && (B(p).a % 10 !== 0 || B(p).b % 10 !== 0)),
    share("何十何－1桁", 25, (p) => isOp(p, "-") && B(p).b % 10 !== 0),
  ],
  "3-2": [
    share("carry", 70, (p) => (Math.max(B(p).a, B(p).b) % 10) + Math.min(B(p).a, B(p).b) >= 10),
    share("order 2桁＋1桁", 80, (p) => B(p).a >= 10),
  ],
  "3-3": [share("borrow", 70, (p) => B(p).a % 10 < B(p).b)],
  "3-4": [
    share("ones digit of a not 0", 85, (p) => B(p).a % 10 !== 0 || B(p).b % 10 !== 0),
    share("subtraction (½·36/81)", 50 * (36 / 81), (p) => isOp(p, "-")),
    share("order a＋t kept", 70, (p) => B(p).a % 10 !== 0, (p) => isOp(p, "+") && (B(p).a % 10 !== 0) !== (B(p).b % 10 !== 0)),
  ],
  "3-5": [share("carry", 60, (p) => (B(p).a % 10) + (B(p).b % 10) >= 10)],
  "3-6": [share("borrow", 60, (p) => B(p).a % 10 < B(p).b % 10)],
  "3-7": [share("ones digit not 0", 80, (p) => (complementOf(p, 100) ?? 0) % 10 !== 0), share("100－a form", 60, (p) => p.shape === "binary")],
  "3-8": [
    share("何十 (not 何百)", 60, (p) => Math.max(B(p).a, B(p).b) < 100),
    share("order t×f", 60, (p) => B(p).a >= 10),
  ],
  "3-9": [share("order 十いくつ×1桁", 60, (p) => B(p).a >= 10)],
  "3-10": [share("order 2桁×1桁", 70, (p) => B(p).a >= 10)],
  "3-11": [share("quotient 何十", 60, (p) => B(p).a / B(p).b < 100)],
  "4-1": [share("order 3桁＋2桁", 80, (p) => B(p).a >= 100)],
  "4-5": [share("ones digit not 0", 80, (p) => (complementOf(p, 1000) ?? 0) % 10 !== 0), share("1000－a form", 60, (p) => p.shape === "binary")],
  "4-6": [
    share("3 terms ＋", 40, (p) => p.shape === "chain" && p.terms.length === 3 && p.ops[0] === "+"),
    share("a－b＋c", 30, (p) => p.shape === "chain" && p.ops[0] === "-"),
    share("4 terms ＋", 30, (p) => p.shape === "chain" && p.terms.length === 4),
  ],
  "4-7": [
    share("0s (1,1)", 100 / 3, (p) => tz(B(p).a) === 1 && tz(B(p).b) === 1),
    share("0s (2,1)", 100 / 3, (p) => tz(B(p).a) === 2),
    share("0s (1,2)", 100 / 3, (p) => tz(B(p).b) === 2),
  ],
  "4-8": [share("order 3桁×1桁", 80, (p) => B(p).a >= 100)],
  "5-1": [
    share("2桁＋(何十の手前)", 30, (p) => isOp(p, "+") && Math.max(B(p).a, B(p).b) < 100),
    share("2桁－(何十の手前)", 25, (p) => isOp(p, "-") && B(p).a < 100),
    share("3桁±(何百の手前)", 20, (p) => (isOp(p, "+") || isOp(p, "-")) && Math.max(B(p).a, B(p).b) >= 100),
    share("(何十の手前)×1桁", 25, (p) => isOp(p, "×")),
  ],
  "5-2": [share("ひく数の一の位が7〜9 (2桁)", 60, (p) => B(p).b < 100)],
  "5-3": [share("90－a", 20, (p) => B(p).a === 90), share("180－a", 40, (p) => B(p).a === 180), share("360－a", 40, (p) => B(p).a === 360)],
  "5-4": [
    share("×5", 40, (p) => Math.min(...[B(p).a, B(p).b].filter((v) => [5, 25, 50].includes(v))) === 5),
    share("×25", 35, (p) => Math.min(...[B(p).a, B(p).b].filter((v) => [5, 25, 50].includes(v))) === 25),
    share("×50", 25, (p) => Math.min(...[B(p).a, B(p).b].filter((v) => [5, 25, 50].includes(v))) === 50),
  ],
  "5-5": [share("÷5", 60, (p) => B(p).b === 5)],
  "5-6": [share("order 2桁×m", 80, (p) => inR(B(p).a, 12, 98))],
  "5-7": [share("order even×(…5)", 50, (p) => B(p).a % 2 === 0)],
  "5-9": [share("13・17・19・23・29 (doubled)", 50, (p) => [13, 17, 19, 23, 29].includes(B(p).b))],
  "5-10": [share("multiples (○)", 50, (p) => p.shape === "divisibility" && p.n % p.k === 0)],
};

// ---------------- exact support: exhaustive search over every Rng outcome ----------------
// random() is only ever compared with the thresholds used in reference_generators.py, so one
// representative per interval between thresholds covers every branch.
const thresholds = [...new Set([...readFileSync(new URL("./reference/reference_generators.py", import.meta.url), "utf8").matchAll(/<\s*(0\.\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
const cuts = [0, ...thresholds, 1];
const FLOATS = cuts.slice(0, -1).map((lo, i) => (lo + cuts[i + 1]) / 2);
const EXHAUSTED = new Error("call cap");

/** All problems reachable with at most `cap` Rng calls (rejection loops: one pass suffices). */
function exactSupport(gen: (r: Rng) => Problem, cap: number): Map<string, Problem> {
  const out = new Map<string, Problem>();
  const stack: number[][] = [[]];
  while (stack.length) {
    const path = stack.pop() as number[];
    let pos = 0;
    const choose = (n: number): number => {
      if (pos >= cap) throw EXHAUSTED;
      if (pos < path.length) return path[pos++];
      for (let alt = n - 1; alt >= 1; alt--) stack.push([...path, alt]);
      path.push(0);
      pos++;
      return 0;
    };
    const rng: Rng = {
      next: () => FLOATS[choose(FLOATS.length)],
      int: (lo, hi) => lo + choose(hi - lo + 1),
      pick: (xs) => xs[choose(xs.length)],
      shuffle: (xs) => {
        for (let i = xs.length - 1; i > 0; i--) {
          const j = choose(i + 1);
          [xs[i], xs[j]] = [xs[j], xs[i]];
        }
        return xs;
      },
    };
    try {
      const p = gen(rng);
      out.set(display(p), p);
    } catch (e) {
      if (e !== EXHAUSTED) throw e;
    }
  }
  return out;
}

// ---------------- run ----------------
const digitsOf = (v: number) => String(Math.abs(v)).length;
const levelIds = LEVELS.map((l) => l.id);
c.ok(Object.keys(GENERATORS).length === 61 && levelIds.every((id) => typeof GENERATORS[id] === "function"), "61 generators", () => Object.keys(GENERATORS).join(","));
console.log(`random() thresholds found in reference_generators.py: ${thresholds.join(", ")}`);

const ratioRows: string[] = [];
const enumRows: string[] = [];
for (const lv of LEVELS) {
  const lid = lv.id;
  const gen = GENERATORS[lid];
  const r = mulberry32(SEED);
  const problems: Problem[] = [];
  const shapes = new Set(lv.problemShapes);
  for (let i = 0; i < N; i++) {
    const p = gen(r);
    problems.push(p);
    const d = display(p);
    const ans = computeAnswer(p);
    const at = answerText(ans);
    c.ok(selfTestAnswer(d, at), "answer (independent)", () => `${lid} ${d} ${at}`);
    c.ok(shapes.has(p.shape), "shape listed in curriculum", () => `${lid} ${p.shape} not in ${[...shapes]}`);
    c.ok(p.shape !== "binary" || p.op !== "÷" || p.a % p.b === 0, "binary ÷ exact", () => `${lid} ${d}`);
    const back = parseDisplay(d, at);
    c.ok(display(back) === d && Bun.deepEquals(back, p, true), "parse/display round trip", () => `${lid} ${d} → ${JSON.stringify(back)} vs ${JSON.stringify(p)}`);
    c.ok(V[lid](p), "ranges/exclusions", () => `${lid} ${d}`);
    const inst = makeInstance(lid, p);
    const digits = ans.kind === "number" ? [digitsOf(ans.value)] : ans.kind === "divRem" ? [digitsOf(ans.quotient), digitsOf(ans.remainder)] : [1];
    c.ok(
      inst.levelId === lid && inst.problem === p && Bun.deepEquals(inst.answer, ans) && Bun.deepEquals(inst.answerDigits, digits) && inst.factKey === factKey(p),
      "makeInstance",
      () => `${lid} ${d} ${JSON.stringify(inst)}`,
    );
    const set = TABLE_SETS[lid];
    if (set && p.shape === "binary") {
      const inSet = [p.a, p.b].filter((v) => set.includes(v));
      c.ok(inst.tableFactor === Math.max(...inSet), "tableFactor", () => `${lid} ${d} → ${inst.tableFactor}`);
    } else {
      c.ok(inst.tableFactor === undefined, "no tableFactor outside 2-1〜2-4", () => `${lid} ${d}`);
    }
  }

  for (const ratio of RATIOS[lid] ?? []) {
    const pool = ratio.among ? problems.filter(ratio.among) : problems;
    const got = (100 * pool.filter(ratio.of).length) / pool.length;
    const ok = c.ok(Math.abs(got - ratio.expected) <= 5, "ratio ±5", () => `${lid} ${ratio.name}: ${got.toFixed(1)}% vs ${ratio.expected.toFixed(1)}%`);
    ratioRows.push(`${ok ? "ok " : "BAD"} ${lid.padEnd(5)} ${ratio.name.padEnd(30)} ${got.toFixed(1).padStart(5)}% (expected ${ratio.expected.toFixed(1)}%, n=${pool.length})`);
  }

  const en = enumerateLevel(lid);
  if (!lv.enumerable) {
    c.ok(en === null, "non-enumerable → null", () => lid);
    continue;
  }
  if (!c.ok(Array.isArray(en), "enumerable → array", () => lid) || !en) continue;
  const keys = en.map(display);
  const keySet = new Set(keys);
  c.ok(keySet.size === keys.length, "enumeration has no duplicates", () => `${lid}: ${keys.length - keySet.size} duplicates`);
  const missing = problems.map(display).filter((d) => !keySet.has(d));
  c.ok(missing.length === 0, "generated ⊆ enumeration", () => `${lid}: ${missing.slice(0, 5).join(" ")}`);
  c.ok(en.every((p) => V[lid](p) && selfTestAnswer(display(p), answerText(computeAnswer(p)))), "enumerated problems valid", () => lid);
  const support = exactSupport(gen, 4);
  const notGen = keys.filter((k) => !support.has(k));
  const notEnum = [...support.keys()].filter((k) => !keySet.has(k));
  c.ok(notGen.length === 0 && notEnum.length === 0, "enumeration == exact generator support", () => `${lid}: never generated ${notGen.slice(0, 5)} / not enumerated ${notEnum.slice(0, 5)}`);
  c.ok(en.every((p) => Bun.deepEquals(p, support.get(display(p)), true)), "enumerated objects == generated objects", () => lid);
  const sampled = new Set(problems.map(display)).size;
  enumRows.push(
    `${lid.padEnd(5)} enumerateLevel=${String(en.length).padStart(4)}  approxDistinctProblems=${String(lv.approxDistinctProblems).padStart(4)}  exactSupport=${String(support.size).padStart(4)}  distinct in 2,000 draws=${String(sampled).padStart(4)}${en.length === lv.approxDistinctProblems ? "" : "  (differs)"}`,
  );
}

console.log("\nratio conditions (2,000 problems per level, mulberry32(20261028)):");
console.log(ratioRows.join("\n"));
console.log("\nenumerable levels:");
console.log(enumRows.join("\n"));

// ---------------- CPython cross-check: identical problem sequences ----------------
const PY_N = 1000;
const PY_SEEDS = [1, 20261028];
const py = pythonReference(PY_N, PY_SEEDS, false);
if (!py) {
  console.log("\nCPython cross-check skipped (python3 not available)");
} else {
  const rr = pyRandom(py.rng.seed);
  const tsRng = {
    random: [rr.next(), rr.next(), rr.next()],
    randint: [rr.int(1, 9999), rr.int(1, 9999), rr.int(1, 9999)],
    choice: [rr.pick([1, 2, 3, 4, 5, 6, 7]), rr.pick([1, 2, 3, 4, 5, 6, 7]), rr.pick([1, 2, 3, 4, 5, 6, 7])],
    shuffle: rr.shuffle([1, 2, 3, 4, 5]),
  };
  c.ok(Bun.deepEquals(tsRng, { random: py.rng.random, randint: py.rng.randint, choice: py.rng.choice, shuffle: py.rng.shuffle }), "pyRandom == random.Random", () => `${JSON.stringify(tsRng)} vs ${JSON.stringify(py.rng)}`);
  let same = 0;
  let total = 0;
  const badLevels: string[] = [];
  for (const lid of levelIds) {
    for (const seed of PY_SEEDS) {
      const rows = py.levels[lid][String(seed)];
      const r = pyRandom(seed);
      let lvSame = 0;
      for (const [q, a] of rows) {
        const p = GENERATORS[lid](r);
        total++;
        if (c.ok(display(p) === q && answerText(computeAnswer(p)) === a, "same sequence as reference_generators.py", () => `${lid} seed ${seed}: ${display(p)} vs ${q}`)) {
          same++;
          lvSame++;
        }
      }
      if (lvSame !== rows.length) badLevels.push(`${lid}/${seed}`);
    }
  }
  console.log(
    `\nCPython cross-check: ${same}/${total} problems identical to reference_generators.py (random.Random(seed), seeds ${PY_SEEDS.join(", ")}, ${PY_N} per level)${badLevels.length ? ` — mismatching: ${badLevels.join(" ")}` : ""}`,
  );
}

c.finish();
