// Judging answers of stages 6–9 and naming the mistake (juku.json errorTypes and errorTypeOrder).
import type { ErrorTypeId } from "@/domain/errors";
import { cmpDec, dec, decText, decValue, eqDec, fracEq, gcd, improperOf, mulDec, decInt, parseDec, powerOfTenRatio, shiftDec, subDec, addDec, divDec, type Dec } from "./num";
import { jAnswer, type JAnswer, type JInstance, type JProblem } from "./problem";
import { JLEVEL, JSPEC, type JErrorTypeId } from "./spec";
import { SPEED } from "./units";

export type JudgeNote = "reduce" | "mixed";

/** Shown with the right answer when a fraction has the right value in the wrong form. */
export const JUDGE_NOTE_TEXT: Record<JudgeNote, string> = {
  reduce: "やくぶん できるよ",
  mixed: "たいぶんすうに しよう",
};

const decOf = (a: JAnswer): Dec | null => (a.kind === "dec" ? parseDec(a.v) : null);

/** The same value, whatever the form (15.70 and 15.7; 6/8 and 3/4). */
export function jSameValue(expected: JAnswer, given: JAnswer): boolean {
  switch (expected.kind) {
    case "dec": {
      const g = decOf(given);
      const e = decOf(expected);
      return !!g && !!e && eqDec(g, e);
    }
    case "frac":
      return given.kind === "frac" && given.d > 0 && fracEq(improperOf(given), improperOf(expected));
    case "pair":
      return given.kind === "pair" && given.a === expected.a && given.b === expected.b;
    case "choice":
      return given.kind === "choice" && given.i === expected.i;
    case "tf":
      return given.kind === "tf" && given.v === expected.v;
  }
}

/** Right answer, or the form a fraction still needs (unreduced, or improper where a mixed number is asked). */
export function jJudge(expected: JAnswer, given: JAnswer): { correct: boolean; note: JudgeNote | null } {
  if (!jSameValue(expected, given)) return { correct: false, note: null };
  if (expected.kind !== "frac" || given.kind !== "frac") return { correct: true, note: null };
  if (gcd(given.n, given.d) !== 1 && given.n !== 0) return { correct: false, note: "reduce" };
  if (expected.mixed && given.n >= given.d) return { correct: false, note: "mixed" };
  return { correct: true, note: null };
}

// ---------------- mistakes ----------------
/** the answer a child gets by counting an hour as 100 minutes (and a minute as 100 seconds) */
function hundredAnswer(p: JProblem): JAnswer | null {
  if (p.type === "time") {
    const a = dec(p.a);
    if (p.kind === "hToM" || p.kind === "mToS") return { kind: "dec", v: decText(mulDec(a, decInt(100))) };
    if (p.kind === "mToH") return { kind: "dec", v: decText(addDec(a, shiftDec(decInt(p.b ?? 0), -2))) };
    const n = decValue(a);
    return { kind: "pair", a: Math.floor(n / 100), b: n % 100, units: [{ v: "" }, { v: "" }] };
  }
  if (p.type === "speed") {
    // 60 → 100 and 3600 → 10000
    const per = (u: "kmh" | "mmin" | "msec") => (u === "kmh" ? 1 : u === "mmin" ? 100 : 10000);
    const mph = mulDec(dec(p.v), decInt(SPEED[p.from].metres * per(p.from)));
    const v = divDec(mph, decInt(SPEED[p.to].metres * per(p.to)));
    return v ? { kind: "dec", v: decText(v) } : null;
  }
  if (p.type === "trip" && p.su === "kmh") {
    const hours = shiftDec(decInt(p.mins), -2);
    if (p.ask === "dist") return { kind: "dec", v: decText(mulDec(dec(p.speed), hours)) };
    if (p.ask === "speed") {
      const v = divDec(dec(p.dist), hours);
      return v ? { kind: "dec", v: decText(v) } : null;
    }
  }
  return null;
}

/** the leading number of an option ("分速80m" → 80) */
function optionNumber(o: string): Dec | null {
  const m = /(\d+(?:\.\d+)?)/.exec(o);
  return m ? parseDec(m[1]) : null;
}

function isCarry(given: Dec, correct: Dec): boolean {
  const diff = subDec(given, correct);
  const abs = diff.n < 0 ? { n: -diff.n, s: diff.s } : diff;
  // a difference of 10^k above the last place of the right answer
  for (let k = -(correct.s - 1); k <= 3; k++) if (eqDec(abs, k >= 0 ? decInt(10 ** k) : { n: 1, s: -k })) return true;
  return false;
}

const SIMILAR: [string, string][] = [
  ["6", "0"],
  ["1", "7"],
];

function isTransposition(given: Dec, correct: Dec): boolean {
  const g = decText(given);
  const c = decText(correct);
  if (g === c || g.length !== c.length) return false;
  if ([...g].sort().join("") === [...c].sort().join("")) return true;
  const diffs = [...g].map((ch, i) => [ch, c[i]] as const).filter(([x, y]) => x !== y);
  return diffs.length === 1 && SIMILAR.some(([x, y]) => (diffs[0][0] === x && diffs[0][1] === y) || (diffs[0][0] === y && diffs[0][1] === x));
}

export type JMistake = ErrorTypeId | JErrorTypeId;

export function jClassifyError(inst: JInstance, given: JAnswer, sameFactErrorsIn14Days: number): JMistake {
  const expected = inst.answer;
  const g = decOf(given);
  const e = decOf(expected);
  const checks: Record<string, () => boolean> = {
    reduce: () => expected.kind === "frac" && jJudge(expected, given).note !== null,
    time60: () => {
      const h = hundredAnswer(inst.problem);
      return !!h && !jSameValue(expected, h) && jSameValue(h, given);
    },
    placeValue: () => {
      if (g && e) return powerOfTenRatio(g, e) !== null;
      if (expected.kind === "choice" && given.kind === "choice") {
        const x = optionNumber(expected.options[given.i] ?? "");
        const y = optionNumber(expected.options[expected.i] ?? "");
        return !!x && !!y && powerOfTenRatio(x, y) !== null;
      }
      return false;
    },
    carry: () => !!g && !!e && cmpDec(g, e) !== 0 && isCarry(g, e),
    transposition: () => !!g && !!e && isTransposition(g, e),
    fact: () => sameFactErrorsIn14Days >= 2 || (JLEVEL[inst.levelId]?.K ?? 2) <= 1,
    procedure: () => true,
  };
  for (const id of JSPEC.errorTypeOrder) if (checks[id]?.()) return id as JMistake;
  return "procedure";
}

/** The unit fact to show with a right answer after a moved decimal point in a unit problem. */
export function unitFactFor(p: JProblem): string | null {
  if (p.type !== "convert") return null;
  const k = Math.round(Math.log10(decValue(dec(jAnswerValue(p))) / decValue(dec(p.v))));
  const [big, small] = k >= 0 ? [p.from, p.to] : [p.to, p.from];
  return `1${big}＝${10 ** Math.abs(k)}${small}`;
}

const jAnswerValue = (p: JProblem) => {
  const a = jAnswer(p);
  return a.kind === "dec" ? a.v : "0";
};

/** A short line shown under the right answer: the form a fraction needs, the unit fact, or 60 minutes in an hour. */
export function jRevealNote(inst: JInstance, given: JAnswer | null): string | null {
  if (!given) return null;
  const j = jJudge(inst.answer, given);
  if (j.note) return JUDGE_NOTE_TEXT[j.note];
  const mistake = jClassifyError(inst, given, 0);
  if (mistake === "time60") {
    const p = inst.problem;
    return p.type === "time" && (p.kind === "mToS" || p.kind === "sToMS") ? "1ぷんは 60びょう" : "1じかんは 60ぷん";
  }
  if (mistake === "placeValue") return unitFactFor(inst.problem);
  return null;
}
