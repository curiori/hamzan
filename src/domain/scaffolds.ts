// Scaffolds: steps / memo per scaffoldKind (a port of reference_scaffolds.py scaffold()) and the
// H-mode hint lines built from each kind's curriculum.json "hint" template.
//
// Hint templates below mirror curriculum.json scaffoldKinds[kind].hint, rewritten for a 1st grader
// (hiragana words, full-width operators, half-width digits): "→" separates lines, "[i]" is a blank
// filled with steps[i] (a later "[i]" shows the already-filled value), "{name}" is a number.
// The problem itself is never repeated as a line.
import curriculum from "./curriculum.json";
import { TABLE_SETS } from "./generators";
import type { BinOp, HintLine, HintToken, Problem, Scaffold, StepValue } from "./problem";

const KIND: Record<string, string> = Object.fromEntries(curriculum.levels.map((l) => [l.id, l.scaffoldKind]));

type Vars = Record<string, number | string>;

interface Built {
  steps: StepValue[];
  memo: number[];
  lines: HintLine[];
}

const ANSWER_ONLY = "こたえ [0]";

function hint(template: string, vars: Vars): HintLine[] {
  return template.split("→").map((line) =>
    line.split(/(\[\d+\])/).flatMap((part): HintToken[] => {
      const blank = /^\[(\d+)\]$/.exec(part);
      if (blank) return [{ t: "blank", step: Number(blank[1]) }];
      const v = part
        .replace(/\{(\w+)\}/g, (_, name: string) => {
          if (!(name in vars)) throw new Error(`hint template variable {${name}} is missing`);
          return String(vars[name]);
        })
        .trim();
      return v ? [{ t: "text", v }] : [];
    }),
  );
}

function done(steps: StepValue[], template: string, vars: Vars = {}, memo: number[] = []): Built {
  return { steps, memo, lines: hint(template, vars) };
}

// ---------- helpers (reference_scaffolds.py) ----------
/** number of trailing zeros */
function tz(x: number): number {
  let n = 0;
  while (x && x % 10 === 0) {
    x /= 10;
    n++;
  }
  return n;
}

/** non-zero place values from the top: 236 → [200, 30, 6], 305 → [300, 5] */
function placeParts(x: number): number[] {
  const s = String(x);
  return [...s].flatMap((d, i) => (d === "0" ? [] : [Number(d) * 10 ** (s.length - i - 1)]));
}

/** R when x is 1〜2 below a round number (x%10 in 8,9 → next ten; x≥100 and x%100 ≥ 98 → next hundred). */
function nearRound(x: number): number | null {
  if (x >= 100 && x % 100 >= 98) return (Math.floor(x / 100) + 1) * 100;
  if (x % 10 === 8 || x % 10 === 9) return (Math.floor(x / 10) + 1) * 10;
  return null;
}

function mustNearRound(x: number): number {
  const r = nearRound(x);
  if (r === null) throw new Error(`${x} is not 1〜2 below a round number`);
  return r;
}

const idiv = (a: number, b: number) => Math.floor(a / b);
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);

/** binary problems (and divRem as dividend ÷ divisor), like Python's parse() */
function operands(p: Problem): { a: number; op: BinOp; b: number } {
  if (p.shape === "binary") return { a: p.a, op: p.op, b: p.b };
  if (p.shape === "divRem") return { a: p.dividend, op: "÷", b: p.divisor };
  throw new Error(`expected a two-number problem, got ${p.shape}`);
}

// ---------- kinds ----------
const MULT_FROM_KNOWN: Record<number, { steps: (x: number) => number[]; hint: string }> = {
  3: { steps: (x) => [x * 2, x * 3], hint: "{x}×2＝[0] → [0]＋{x}＝[1]" },
  4: { steps: (x) => [x * 2, x * 4], hint: "{x}×2＝[0] → [0]×2＝[1]" },
  6: { steps: (x) => [x * 5, x * 6], hint: "{x}×5＝[0] → [0]＋{x}＝[1]" },
  7: { steps: (x) => [x * 5, x * 2, x * 7], hint: "{x}×5＝[0] → {x}×2＝[1] → [0]＋[1]＝[2]" },
  8: { steps: (x) => [x * 4, x * 8], hint: "{x}×4＝[0] → [0]×2＝[1]" },
  9: { steps: (x) => [x * 10, x * 9], hint: "{x}×10＝[0] → [0]－{x}＝[1]" },
};

/** JUMP_ADD / JUMP_SUB: running totals, one line per non-zero place of the moving number. */
function jump(start: number, parts: number[], opText: "＋" | "－"): Built {
  const steps: number[] = [];
  let cur = start;
  for (const part of parts) {
    cur = opText === "＋" ? cur + part : cur - part;
    steps.push(cur);
  }
  const memo = steps.slice(0, -1).slice(0, 2);
  if (steps.length === 0) return { steps, memo, lines: [] };
  // one place only (356＋30): the single line would just restate the problem
  if (steps.length === 1) return done(steps, ANSWER_ONLY, {}, memo);
  const lines = parts.map((part, i) => (i === 0 ? `${start}${opText}${part}＝[0]` : `[${i - 1}]${opText}${part}＝[${i}]`));
  return done(steps, lines.join(" → "), {}, memo);
}

function partialQuotient(n: number, d: number): Built {
  const steps: StepValue[] = [];
  const quotients: number[] = [];
  const chunks: { pv: number; amount: number; before: number }[] = [];
  let rem = n;
  let qsum = 0;
  for (const pv of [100, 10, 1]) {
    const c = idiv(rem, d * pv);
    if (c > 0) {
      chunks.push({ pv, amount: c * d * pv, before: rem });
      quotients.push(c * pv);
      qsum += c * pv;
      rem -= c * d * pv;
    }
  }
  steps.push(...quotients);
  const memo = quotients.slice(0, 2);
  if (rem) steps.push(rem);
  steps.push(rem ? { quotient: qsum, remainder: rem } : qsum);

  // [800÷4＝ □] [120÷4＝ □] [21÷4＝ □ あまり □] [こたえ □]; the ones chunk shows what is left
  // (chunk + remainder). Without a ones chunk the remainder gets its own line [あまり □].
  const remIdx = chunks.length;
  const last = chunks.length - 1;
  const remInLastLine = rem > 0 && last >= 0 && chunks[last].pv === 1;
  let remLine = rem > 0 && !remInLastLine;
  const lines = chunks.map((ch, i) => {
    const withRem = i === last && remInLastLine;
    const shown = withRem ? ch.before : ch.amount;
    if (shown === n) {
      // a single chunk would restate the problem: ask d×□ instead
      if (withRem) remLine = true;
      return `${d}×[${i}]＝${ch.amount}`;
    }
    return withRem ? `${shown}÷${d}＝[${i}] あまり [${remIdx}]` : `${shown}÷${d}＝[${i}]`;
  });
  if (remLine) lines.push(`あまり [${remIdx}]`);
  lines.push(`こたえ [${steps.length - 1}]`);
  return done(steps, lines.join(" → "), {}, memo);
}

function pairFirst(p: Problem): Built {
  if (p.shape !== "chain") throw new Error(`PAIR_FIRST expects a chain, got ${p.shape}`);
  const { terms, ops } = p;
  if (ops.every((o) => o === "+")) {
    const findPair = (mod: number): [number, number] | null => {
      for (let i = 0; i < terms.length; i++)
        for (let j = i + 1; j < terms.length; j++) if ((terms[i] + terms[j]) % mod === 0) return [i, j];
      return null;
    };
    const pair = findPair(100) ?? findPair(10);
    if (!pair) throw new Error(`no pair making a round number in ${terms.join("+")}`);
    const [i, j] = pair;
    const first = `${terms[i]}＋${terms[j]}＝[0]`;
    const rest = terms.filter((_, k) => k !== i && k !== j);
    if (rest.length === 2 && sum(rest) % 10 === 0)
      return done([terms[i] + terms[j], sum(rest), sum(terms)], `${first} → ${rest[0]}＋${rest[1]}＝[1] → [0]＋[1]＝[2]`);
    return done([terms[i] + terms[j], sum(terms)], `${first} → [0]＋${rest.join("＋")}＝[1]`);
  }
  // a－b＋c: put －b＋c together
  const [x, y, z] = terms;
  return done([y - z, x - y + z], "{y}－{z}＝[0] → {x}－[0]＝[1]", { x, y, z });
}

function compensation(p: Problem, levelId: string): Built {
  const { a, op, b } = operands(p);
  if (levelId === "5-6") {
    const mult = a === 9 || a === 11 || a === 99 ? a : b;
    const o = mult === a ? b : a;
    if (mult === 9) return done([o * 10, o * 9], "{o}×10＝[0] → [0]－{o}＝[1]", { o });
    if (mult === 99) return done([o * 100, o * 99], "{o}×100＝[0] → [0]－{o}＝[1]", { o });
    if (mult === 11) return done([o * 10, o * 11], "{o}×10＝[0] → [0]＋{o}＝[1]", { o });
    throw new Error(`5-6 expects ×9, ×99 or ×11: ${a}${op}${b}`);
  }
  if (op === "+") {
    const cands = [a, b].filter((v) => nearRound(v) !== null);
    if (!cands.length) throw new Error(`no number near a round number in ${a}+${b}`);
    const x = Math.max(...cands);
    const other = a + b - x;
    const R = mustNearRound(x);
    return done([other + R, a + b], "{other}＋{R}＝[0] → [0]－{e}＝[1]", { other, R, e: R - x });
  }
  if (op === "-") {
    const R = mustNearRound(b);
    return done([a - R, a - b], "{a}－{R}＝[0] → [0]＋{e}＝[1]", { a, R, e: R - b });
  }
  const [x, k] = a >= 10 ? [a, b] : [b, a];
  const R = mustNearRound(x);
  return done([R * k, (R - x) * k, a * b], "{R}×{k}＝[0] → {e}×{k}＝[1] → [0]－[1]＝[2]", { R, k, e: R - x });
}

const BUILDERS: Record<string, (p: Problem, levelId: string) => Built> = {
  NEAR_DOUBLE: (p) => {
    const { a, b } = operands(p);
    const s = Math.min(a, b);
    return a === b ? done([2 * s], ANSWER_ONLY) : done([2 * s, 2 * s + 1], "{s}＋{s}＝[0] → [0]＋1＝[1]", { s });
  },
  MAKE_TEN: (p) => {
    const { a, b } = operands(p);
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const need = 10 - big;
    return done([need, small - need, 10 + small - need], "{big}＋[0]＝10 → 10＋[1]＝[2]", { big });
  },
  SUB_FROM_TEN: (p) => {
    const { a, b } = operands(p);
    return done([10 - b, 10 - b + (a - 10)], "10－{b}＝[0] → [0]＋{rest}＝[1]", { b, rest: a - 10 });
  },
  MULT_FROM_KNOWN: (p, levelId) => {
    const { a, b } = operands(p);
    const set: readonly number[] | undefined = TABLE_SETS[levelId];
    if (!set) throw new Error(`no multiplication table for level ${levelId}`);
    const inSet = [a, b].filter((v) => set.includes(v));
    if (!inSet.length) throw new Error(`${a}×${b} has no factor from the ${levelId} table`);
    const t = Math.max(...inSet);
    const x = a === t ? b : a;
    const spec = MULT_FROM_KNOWN[t];
    if (!spec) throw new Error(`MULT_FROM_KNOWN has no rule for the ${t} table`);
    return done(spec.steps(x), spec.hint, { x });
  },
  REMAINDER: (p) => {
    const { a: n, b: d } = operands(p);
    const q = idiv(n, d);
    return done([q, d * q, n - d * q], "{d}×[0]＝[1]（{n}をこえない いちばん おおきい かず） → {n}－[1]＝[2]（あまり）", { d, n });
  },
  ZERO_ADDSUB: (p) => {
    const { a, op, b } = operands(p);
    const plus = op === "+";
    if (a % 10 === 0 && b % 10 === 0) {
      const core = plus ? idiv(a, 10) + idiv(b, 10) : idiv(a, 10) - idiv(b, 10);
      return done([core, core * 10], "{x}{op}{y}＝[0] → [0]に 0を1こ つけて [1]", { x: idiv(a, 10), y: idiv(b, 10), op: plus ? "＋" : "－" });
    }
    return done([plus ? a + b : a - b], ANSWER_ONLY);
  },
  TENS_ONLY: (p) => {
    const { a, op, b } = operands(p);
    if (op === "+") {
      const [base, t] = b % 10 === 0 ? [a, b] : [b, a];
      const x = idiv(base, 10);
      const y = idiv(t, 10);
      return done([x + y, base + t], "じゅうのくらいだけ {x}＋{y}＝[0] → こたえ [1]", { x, y });
    }
    const x = idiv(a, 10);
    const y = idiv(b, 10);
    return done([x - y, a - b], "じゅうのくらいだけ {x}－{y}＝[0] → こたえ [1]", { x, y });
  },
  ZERO_MUL: (p) => {
    const { a, b } = operands(p);
    const za = tz(a);
    const zb = tz(b);
    const ca = idiv(a, 10 ** za);
    const cb = idiv(b, 10 ** zb);
    return done([ca * cb, za + zb, a * b], "{ca}×{cb}＝[0] → 0は あわせて [1]こ → [0]に 0を[1]こ つけて [2]", { ca, cb });
  },
  ZERO_DIV: (p) => {
    const { a, b } = operands(p);
    const q = idiv(a, b);
    const k = tz(q);
    const head = idiv(a, 10 ** k);
    return done([idiv(head, b), q], "{head}÷{d}＝[0] → [0]に 0を{k}こ つけて [1]", { head, d: b, k });
  },
  ZERO_CANCEL_DIV: (p) => {
    const { a, b } = operands(p);
    const n = idiv(a, 10);
    const d = idiv(b, 10);
    return done([idiv(n, d)], "0を1こずつ けすと {n}÷{d}＝[0]", { n, d });
  },
  NEXT_TEN_ADD: (p) => {
    const { a, b } = operands(p);
    const [A, B] = a >= 10 ? [a, b] : [b, a];
    const ones = A % 10;
    if (ones + B >= 10) {
      const need = 10 - ones;
      const next = A - ones + 10;
      return done([need, B - need, A + B], "{A}＋[0]＝{next} → {next}＋[1]＝[2]", { A, next });
    }
    return done([ones + B, A + B], "いちのくらい {ones}＋{B}＝[0] → こたえ [1]", { ones, B });
  },
  NEXT_TEN_SUB: (p) => {
    const { a, b } = operands(p);
    const ones = a % 10;
    if (ones === 0) return done([10 - b, a - b], "10－{b}＝[0] → {r}＋[0]＝[1]", { b, r: a - 10 });
    if (ones < b) return done([ones, b - ones, a - b], "{a}－[0]＝{t} → {t}－[1]＝[2]", { a, t: a - ones });
    return done([ones - b, a - b], "いちのくらい {ones}－{b}＝[0] → こたえ [1]", { ones, b });
  },
  JUMP_ADD: (p) => {
    const { a, b } = operands(p);
    return jump(Math.max(a, b), placeParts(Math.min(a, b)), "＋");
  },
  JUMP_SUB: (p) => {
    const { a, b } = operands(p);
    return jump(a, placeParts(b), "－");
  },
  COMPLEMENT: (p) => {
    let total: number;
    let x: number;
    if (p.shape === "complementTo") {
      total = p.total;
      x = p.a;
    } else {
      ({ a: total, b: x } = operands(p));
    }
    const z = Math.min(tz(x), tz(total));
    const width = String(idiv(total, 10 ** z)).length - 1;
    const digits = [...String(idiv(x, 10 ** z)).padStart(width, "0")].map(Number);
    const lastDigit = digits.length - 1;
    const steps = digits.map((d, i) => (i < lastDigit ? 9 - d : 10 - d));
    const lines = digits.map((d, i) => (i < lastDigit ? `9－${d}＝[${i}]` : `10－${d}＝[${i}]`));
    lines.push(`こたえ [${digits.length}]`);
    return done([...steps, total - x], lines.join(" → "));
  },
  PARTIAL_PRODUCT: (p) => {
    const { a, b } = operands(p);
    const [m, k] = a >= 10 ? [a, b] : [b, a];
    const parts = placeParts(m);
    const pps = parts.map((part) => part * k);
    if (pps.length === 1) return done([m * k], ANSWER_ONLY);
    const memo = pps.length === 2 ? [...pps] : [pps[0], pps[0] + pps[1]];
    const lines = parts.map((part, i) => `${part}×${k}＝[${i}]`);
    lines.push(`${pps.map((_, i) => `[${i}]`).join("＋")}＝[${pps.length}]`);
    return done([...pps, m * k], lines.join(" → "), {}, memo);
  },
  PARTIAL_QUOTIENT: (p) => {
    const { a, b } = operands(p);
    return partialQuotient(a, b);
  },
  PAIR_FIRST: pairFirst,
  COMPENSATION: compensation,
  CONSTANT_DIFF: (p) => {
    const { a, b } = operands(p);
    const B = Math.ceil((b + 1) / 100) * 100;
    if (a - b <= 18 && b < B && B <= a)
      return done([B - b, a - B, a - b], "{b}から {B}までは [0] → {B}から {a}までは [1] → [0]＋[1]＝[2]", { a, b, B });
    const s = 10 - (b % 10);
    return done([a + s, b + s, a - b], "りょうほうに {s}を たす → [0]－[1]＝[2]", { s });
  },
  TIMES_5_25_50: (p) => {
    const { a, b } = operands(p);
    const special = [a, b].filter((v) => v === 5 || v === 25 || v === 50);
    if (!special.length) throw new Error(`${a}×${b} has no ×5, ×25 or ×50`);
    const m = Math.min(...special);
    const o = idiv(a * b, m);
    if (m === 5) return done([o * 10, o * 5], "{o}×10＝[0] → [0]÷2＝[1]", { o });
    return done([o * 100, o * m], m === 25 ? "{o}×100＝[0] → [0]÷4＝[1]" : "{o}×100＝[0] → [0]÷2＝[1]", { o });
  },
  DIV_5_25: (p) => {
    const { a: n, b } = operands(p);
    if (b === 5) return done([n * 2, idiv(n, 5)], "{n}×2＝[0] → [0]÷10＝[1]", { n });
    return done([n * 4, idiv(n, 25)], "{n}×4＝[0] → [0]÷100＝[1]", { n });
  },
  DOUBLE_HALVE: (p) => {
    const { a, b } = operands(p);
    const f = a % 10 === 5 ? a : b;
    const e = f === a ? b : a;
    return done([idiv(e, 2), f * 2, a * b], "{e}÷2＝[0] → {f}×2＝[1] → [0]×[1]＝[2]", { e, f });
  },
  TEENS_PRODUCT: (p) => {
    const { a, b } = operands(p);
    const x = a - 10;
    const y = b - 10;
    const steps = [(a + y) * 10, x * y, a * b];
    return done(steps, "（{a}＋{y}）×10＝[0] → {x}×{y}＝[1] → [0]＋[1]＝[2]", { a, x, y }, steps.slice(0, 2));
  },
  ESTIMATE_DIVIDE: (p) => {
    const { a: n, b: d } = operands(p);
    const q = idiv(n, d);
    return done([q, d * q], "{n}は {d}の なんばいくらい？ [0] → {d}×[0]＝[1]（{n}に なれば OK）", { n, d });
  },
  DIVISIBILITY_RULE: (p) => {
    if (p.shape !== "divisibility") throw new Error(`DIVISIBILITY_RULE expects a divisibility problem, got ${p.shape}`);
    const { n, k } = p;
    const ok = n % k === 0;
    if (k === 2 || k === 5) return done([n % 10, ok], "いちのくらいは [0] → {k}の ばいすう？ [1]", { k });
    if (k === 4) return done([n % 100, ok], "したの 2けたは [0] → 4の ばいすう？ [1]");
    if (k === 8) return done([n % 1000, ok], "したの 3けたは [0] → 8の ばいすう？ [1]");
    if (k === 3 || k === 9) return done([sum([...String(n)].map(Number)), ok], "かくくらいの かずを たすと [0] → {k}の ばいすう？ [1]", { k });
    return done([n % 2 === 0, n % 3 === 0, n % 6 === 0], "2の ばいすう？ [0] → 3の ばいすう？ [1] → 6の ばいすう？ [2]");
  },
};

function build(levelId: string, p: Problem): Built & { kind: string } {
  const kind = KIND[levelId];
  if (!kind) throw new Error(`unknown level ${levelId}`);
  if (kind.startsWith("VISUAL") || kind === "NONE") return { kind, steps: [], memo: [], lines: [] };
  const builder = BUILDERS[kind];
  if (!builder) throw new Error(`unknown scaffoldKind ${kind}`);
  return { kind, ...builder(p, levelId) };
}

/** Steps and memo of the level's scaffoldKind (the kind comes from the level: 7×9 is t=7 in 2-3, t=9 in 2-4). */
export function scaffoldOf(levelId: string, p: Problem): Scaffold {
  const { kind, steps, memo } = build(levelId, p);
  return { kind, steps, memo };
}

/** H-mode hint lines shown under the problem; blanks point at scaffoldOf(...).steps. VISUAL_* / NONE → []. */
export function hintLines(levelId: string, p: Problem): HintLine[] {
  return build(levelId, p).lines;
}
