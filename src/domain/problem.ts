// Problem / Answer model shared by generators, scaffolds, the set builder and the UI.
// Display strings follow curriculum.json "problemShapes" (full-width operators, half-width digits).

export type BinOp = "+" | "-" | "×" | "÷";
export type ChainOp = "+" | "-";

export type Problem =
  | { shape: "binary"; a: number; op: BinOp; b: number }
  | { shape: "complementTo"; a: number; total: number }
  | { shape: "decompose"; n: number }
  | { shape: "half"; n: number }
  | { shape: "missingAddend"; b: number; total: number }
  | { shape: "missingFactor"; known: number; product: number; unknownPosition: "left" | "right" }
  | { shape: "divRem"; dividend: number; divisor: number }
  | { shape: "chain"; terms: number[]; ops: ChainOp[] }
  | { shape: "divisibility"; n: number; k: number };

export type Answer =
  | { kind: "number"; value: number }
  | { kind: "divRem"; quotient: number; remainder: number }
  | { kind: "bool"; value: boolean };

/** A value the child types into one hint blank: numbers, ○/× and "q あまり r". */
export type StepValue = number | boolean | { quotient: number; remainder: number };

export interface Scaffold {
  kind: string;
  steps: StepValue[];
  memo: number[];
}

/** One hint line; blanks point at steps[step]. A step may be referenced more than once. */
export type HintToken = { t: "text"; v: string } | { t: "blank"; step: number };
export type HintLine = HintToken[];

export interface ProblemInstance {
  levelId: string;
  problem: Problem;
  answer: Answer;
  /** digits per input field (divRem: [quotient digits, remainder digits]) */
  answerDigits: number[];
  factKey: string;
  /** 2-1〜2-4: the factor that belongs to the level's table */
  tableFactor?: number;
}

const OP_FW: Record<BinOp, string> = { "+": "＋", "-": "－", "×": "×", "÷": "÷" };
const FW_OP: Record<string, BinOp> = { "＋": "+", "－": "-", "×": "×", "÷": "÷" };

export function display(p: Problem): string {
  switch (p.shape) {
    case "binary":
      return `${p.a}${OP_FW[p.op]}${p.b}＝`;
    case "complementTo":
      return `${p.a}と□で${p.total}`;
    case "decompose":
      return `${p.n}は10と□`;
    case "half":
      return `${p.n}の半分＝`;
    case "missingAddend":
      return `${p.b}＋□＝${p.total}`;
    case "missingFactor":
      return p.unknownPosition === "right" ? `${p.known}×□＝${p.product}` : `□×${p.known}＝${p.product}`;
    case "divRem":
      return `${p.dividend}÷${p.divisor}＝`;
    case "chain":
      return p.terms.map((t, i) => (i === 0 ? `${t}` : `${OP_FW[p.ops[i - 1]]}${t}`)).join("") + "＝";
    case "divisibility":
      return `${p.n}は${p.k}の倍数？`;
  }
}

const num = (value: number): Answer => ({ kind: "number", value });

export function computeAnswer(p: Problem): Answer {
  switch (p.shape) {
    case "binary":
      return num(p.op === "+" ? p.a + p.b : p.op === "-" ? p.a - p.b : p.op === "×" ? p.a * p.b : p.a / p.b);
    case "complementTo":
      return num(p.total - p.a);
    case "decompose":
      return num(p.n - 10);
    case "half":
      return num(p.n / 2);
    case "missingAddend":
      return num(p.total - p.b);
    case "missingFactor":
      return num(p.product / p.known);
    case "divRem":
      return { kind: "divRem", quotient: Math.floor(p.dividend / p.divisor), remainder: p.dividend % p.divisor };
    case "chain": {
      let v = p.terms[0];
      p.ops.forEach((o, i) => {
        v = o === "+" ? v + p.terms[i + 1] : v - p.terms[i + 1];
      });
      return num(v);
    }
    case "divisibility":
      return { kind: "bool", value: p.n % p.k === 0 };
  }
}

export const digitsOf = (v: number) => String(Math.abs(Math.trunc(v))).length;

export function answerDigits(a: Answer): number[] {
  if (a.kind === "number") return [digitsOf(a.value)];
  if (a.kind === "divRem") return [digitsOf(a.quotient), digitsOf(a.remainder)];
  return [1];
}

/** Dedupe / weakness key. ＋ and × put the smaller number first (mul:6x7); others keep their order. */
export function factKey(p: Problem): string {
  switch (p.shape) {
    case "binary": {
      if (p.op === "+" || p.op === "×") {
        const [x, y] = p.a <= p.b ? [p.a, p.b] : [p.b, p.a];
        return p.op === "+" ? `add:${x}+${y}` : `mul:${x}x${y}`;
      }
      return p.op === "-" ? `sub:${p.a}-${p.b}` : `div:${p.a}/${p.b}`;
    }
    case "complementTo":
      return `cmp:${p.a}/${p.total}`;
    case "decompose":
      return `dec:${p.n}`;
    case "half":
      return `half:${p.n}`;
    case "missingAddend":
      return `madd:${p.b}/${p.total}`;
    case "missingFactor":
      return `mfac:${p.known}/${p.product}`;
    case "divRem":
      return `divrem:${p.dividend}/${p.divisor}`;
    case "chain":
      return "chain:" + p.terms.map((t, i) => (i === 0 ? `${t}` : `${p.ops[i - 1]}${t}`)).join("");
    case "divisibility":
      return `mult:${p.n}/${p.k}`;
  }
}

export function sameAnswer(a: Answer, b: Answer): boolean {
  if (a.kind === "number" && b.kind === "number") return a.value === b.value;
  if (a.kind === "divRem" && b.kind === "divRem") return a.quotient === b.quotient && a.remainder === b.remainder;
  if (a.kind === "bool" && b.kind === "bool") return a.value === b.value;
  return false;
}

export function sameStep(a: StepValue, b: StepValue): boolean {
  if (typeof a === "object" && typeof b === "object") return a.quotient === b.quotient && a.remainder === b.remainder;
  return a === b;
}

/** "42", "13あまり1", "○" / "×" — the reference answer strings. */
export function answerText(a: Answer): string {
  if (a.kind === "number") return String(a.value);
  if (a.kind === "divRem") return `${a.quotient}あまり${a.remainder}`;
  return a.value ? "○" : "×";
}

export function stepText(v: StepValue): string {
  if (typeof v === "boolean") return v ? "○" : "×";
  if (typeof v === "object") return `${v.quotient}あまり${v.remainder}`;
  return String(v);
}

/** Inverse of display(): turns a reference display string back into a Problem (used by golden tests). */
export function parseDisplay(text: string, answer?: string): Problem {
  let m: RegExpExecArray | null;
  if ((m = /^(\d+)と□で(\d+)$/.exec(text))) return { shape: "complementTo", a: +m[1], total: +m[2] };
  if ((m = /^(\d+)は10と□$/.exec(text))) return { shape: "decompose", n: +m[1] };
  if ((m = /^(\d+)の半分＝$/.exec(text))) return { shape: "half", n: +m[1] };
  if ((m = /^(\d+)＋□＝(\d+)$/.exec(text))) return { shape: "missingAddend", b: +m[1], total: +m[2] };
  if ((m = /^(\d+)×□＝(\d+)$/.exec(text))) return { shape: "missingFactor", known: +m[1], product: +m[2], unknownPosition: "right" };
  if ((m = /^□×(\d+)＝(\d+)$/.exec(text))) return { shape: "missingFactor", known: +m[1], product: +m[2], unknownPosition: "left" };
  if ((m = /^(\d+)は(\d+)の倍数？$/.exec(text))) return { shape: "divisibility", n: +m[1], k: +m[2] };
  const body = text.replace(/＝$/, "");
  const nums = (body.match(/\d+/g) ?? []).map(Number);
  const ops = (body.match(/[＋－×÷]/g) ?? []).map((c) => FW_OP[c]);
  if (nums.length >= 3) return { shape: "chain", terms: nums, ops: ops as ChainOp[] };
  if (ops[0] === "÷" && answer?.includes("あまり")) return { shape: "divRem", dividend: nums[0], divisor: nums[1] };
  return { shape: "binary", a: nums[0], op: ops[0], b: nums[1] };
}

// ---------- reading aloud (screen readers): 「なな たす はち は」 ----------
const ONES = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
const TENS = ["", "じゅう", "にじゅう", "さんじゅう", "よんじゅう", "ごじゅう", "ろくじゅう", "ななじゅう", "はちじゅう", "きゅうじゅう"];
const HUNDREDS = ["", "ひゃく", "にひゃく", "さんびゃく", "よんひゃく", "ごひゃく", "ろっぴゃく", "ななひゃく", "はっぴゃく", "きゅうひゃく"];
const THOUSANDS = ["", "せん", "にせん", "さんぜん", "よんせん", "ごせん", "ろくせん", "ななせん", "はっせん", "きゅうせん"];

function yomi4(n: number): string {
  return THOUSANDS[Math.floor(n / 1000) % 10] + HUNDREDS[Math.floor(n / 100) % 10] + TENS[Math.floor(n / 10) % 10] + ONES[n % 10];
}

export function yomi(n: number): string {
  if (n === 0) return "ぜろ";
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  return (man ? yomi4(man) + "まん" : "") + (rest ? yomi4(rest) : "");
}

const OP_YOMI: Record<BinOp, string> = { "+": "たす", "-": "ひく", "×": "かける", "÷": "わる" };

export function speech(p: Problem): string {
  switch (p.shape) {
    case "binary":
      return `${yomi(p.a)} ${OP_YOMI[p.op]} ${yomi(p.b)} は`;
    case "divRem":
      return `${yomi(p.dividend)} わる ${yomi(p.divisor)} は`;
    case "complementTo":
      return `${yomi(p.a)} と なにで ${yomi(p.total)}`;
    case "decompose":
      return `${yomi(p.n)} は じゅう と なに`;
    case "half":
      return `${yomi(p.n)} の はんぶん は`;
    case "missingAddend":
      return `${yomi(p.b)} たす なに は ${yomi(p.total)}`;
    case "missingFactor":
      return p.unknownPosition === "right"
        ? `${yomi(p.known)} かける なに は ${yomi(p.product)}`
        : `なに かける ${yomi(p.known)} は ${yomi(p.product)}`;
    case "chain":
      return p.terms.map((t, i) => (i === 0 ? yomi(t) : `${OP_YOMI[p.ops[i - 1]]} ${yomi(t)}`)).join(" ") + " は";
    case "divisibility":
      return `${yomi(p.n)} は ${yomi(p.k)} の ばいすう？`;
  }
}

/** 7325 → 七千三百二十五 (PIN reset challenge). */
export function kanjiNumber(n: number): string {
  const K = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const unit = (d: number, u: string) => (d === 0 ? "" : d === 1 ? u : K[d] + u);
  return (
    unit(Math.floor(n / 1000) % 10, "千") +
    unit(Math.floor(n / 100) % 10, "百") +
    unit(Math.floor(n / 10) % 10, "十") +
    K[n % 10]
  );
}
