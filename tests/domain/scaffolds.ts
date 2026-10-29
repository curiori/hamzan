// Scaffold tests. Per level, 2,000 generated problems (mulberry32(fixed seed)):
//   - kind comes from the level; the last step matches the answer (reference_scaffolds.py final_matches),
//   - hintLines: blanks reference valid step indices, first uses appear in step order 0,1,2,…,
//     every step is referenced, text is hiragana / half-width digits / full-width operators only,
//     no line repeats the problem, and every line with an equation is arithmetically true once the
//     blanks are filled with the steps,
//   - curriculum.json scaffoldKinds[*].examples reproduce (PARTIAL_QUOTIENT skipped like the Python test).
// Plus: steps / memo equal reference_scaffolds.py scaffold() on CPython-generated problems.
// run (from the project root): bun run tests/domain/scaffolds.ts
import { GENERATORS } from "../../src/domain/generators.ts";
import { hintLines, scaffoldOf } from "../../src/domain/scaffolds.ts";
import { mulberry32 } from "../../src/domain/rng.ts";
import {
  answerText,
  computeAnswer,
  display,
  parseDisplay,
  stepText,
  type HintLine,
  type Problem,
  type StepValue,
} from "../../src/domain/problem.ts";
import { Checker, KIND, LEVELS, SCAFFOLD_KINDS, evalArith, finalMatches, pythonReference, renderLines } from "./common.ts";

const N = 2000;
const SEED = 11;
const c = new Checker("scaffolds");
const MEMO_KINDS = new Set(["JUMP_ADD", "JUMP_SUB", "PARTIAL_PRODUCT", "PARTIAL_QUOTIENT", "TEENS_PRODUCT"]);
const isVisual = (kind: string) => kind.startsWith("VISUAL") || kind === "NONE";
const ALLOWED_TEXT = /^[\u3041-\u3096 0-9＋－×÷＝（）？OK]+$/u;
const KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

/** Truth of one filled-in hint line; null when the line has nothing to compute. */
function lineTruth(text: string, answer: string): boolean | null {
  let x = text.replace(/（[^）]*[ぁ-んA-Za-z][^）]*）/gu, "").trim();
  let m = /^(\d+)\s*÷\s*(\d+)\s*＝\s*(\d+)\s*あまり\s*(\d+)$/.exec(x);
  if (m) return Number(m[3]) * Number(m[2]) + Number(m[4]) === Number(m[1]) && Number(m[4]) < Number(m[2]);
  m = /^(\d+)から\s*(\d+)までは\s*(\d+)$/.exec(x);
  if (m) return Number(m[2]) - Number(m[1]) === Number(m[3]);
  m = /^(\d+)\s*に\s*0を\s*(\d+)\s*こ\s*つけて\s*(\d+)$/.exec(x);
  if (m) return Number(m[1]) * 10 ** Number(m[2]) === Number(m[3]);
  m = /^(\d+)は\s*(\d+)の\s*なんばいくらい？\s*(\d+)$/.exec(x);
  if (m) return Number(m[2]) * Number(m[3]) === Number(m[1]);
  m = /^こたえ\s*(.+)$/.exec(x);
  if (m) return m[1].replace(/\s+/g, "") === answer;
  m = /^あまり\s*(\d+)$/.exec(x);
  if (m) return answer.endsWith(`あまり${m[1]}`);
  if (!x.includes("＝")) return null;
  x = x.replace(/^.*[ぁ-ん]\s*/u, "");
  const [l, r] = x.split("＝");
  return evalArith(l) === evalArith(r);
}

/** "n×n＝ □0 | □0 ＋n＝ □1" — the structure of a hint with the numbers hidden */
const signature = (lines: HintLine[]) =>
  lines.map((ln) => ln.map((t) => (t.t === "text" ? t.v.replace(/\d+/g, "n") : `□${t.step}`)).join(" ")).join(" | ");

function checkHint(lid: string, p: Problem, steps: StepValue[], lines: HintLine[], answer: string): void {
  const d = display(p);
  const where = () => `${lid} ${d} ${renderLines(lines)} steps=${JSON.stringify(steps)}`;
  c.ok(lines.length > 0, "hint has lines", where);
  const firstUse: number[] = [];
  let bad = false;
  for (const ln of lines) {
    for (const t of ln) {
      if (t.t === "blank") {
        if (!Number.isInteger(t.step) || t.step < 0 || t.step >= steps.length) bad = true;
        else if (!firstUse.includes(t.step)) firstUse.push(t.step);
      } else {
        c.ok(t.v.length > 0 && t.v === t.v.trim(), "text token trimmed", where);
        c.ok(!KANJI.test(t.v), "no kanji", () => `${lid} "${t.v}"`);
        c.ok(ALLOWED_TEXT.test(t.v), "hiragana / half-width digits / full-width operators only", () => `${lid} "${t.v}"`);
      }
    }
    const asText = ln.map((t) => (t.t === "text" ? t.v : "□")).join("");
    c.ok(asText !== `${d}□` && asText !== d, "no line repeats the problem", where);
    let truth: boolean | null = null;
    const filled = ln.map((t) => (t.t === "text" ? t.v : stepText(steps[t.step]))).join(" ");
    try {
      truth = lineTruth(filled, answer);
    } catch (e) {
      c.ok(false, "line arithmetic parses", () => `${where()} "${filled}" ${String(e)}`);
      continue;
    }
    if (truth !== null) c.ok(truth, "line arithmetic true with steps filled in", () => `${where()} → "${filled}"`);
  }
  c.ok(!bad, "blank indices valid", where);
  c.ok(firstUse.every((s, i) => s === i), "blanks first used in step order", where);
  c.ok(firstUse.length === steps.length, "every step referenced", where);
}

// ---------------- generated problems ----------------
const variants = new Map<string, Map<string, string>>();
const memoRows: string[] = [];
for (const lv of LEVELS) {
  const lid = lv.id;
  const r = mulberry32(SEED);
  let emptyMemo = 0;
  for (let i = 0; i < N; i++) {
    const p = GENERATORS[lid](r);
    const answer = answerText(computeAnswer(p));
    const s = scaffoldOf(lid, p);
    const lines = hintLines(lid, p);
    c.ok(s.kind === KIND[lid], "kind from the level", () => `${lid}: ${s.kind}`);
    c.ok(finalMatches(s.kind, s.steps, answer), "last step matches the answer", () => `${lid} ${display(p)} ${answer} ${JSON.stringify(s.steps)}`);
    c.ok(s.memo.every((m) => typeof m === "number") && s.memo.length <= 2, "memo: ≤2 numbers", () => `${lid} ${display(p)} ${JSON.stringify(s.memo)}`);
    c.ok(MEMO_KINDS.has(s.kind) || s.memo.length === 0, "memo only for memo kinds", () => `${lid} ${s.kind}`);
    if (!s.memo.length) emptyMemo++;
    if (isVisual(s.kind)) {
      c.ok(s.steps.length === 0 && s.memo.length === 0 && lines.length === 0, "VISUAL_*/NONE → no steps, no lines", () => `${lid} ${display(p)}`);
      continue;
    }
    c.ok(s.steps.length > 0, "steps present", () => `${lid} ${display(p)}`);
    checkHint(lid, p, s.steps, lines, answer);
    const byKind = variants.get(s.kind) ?? new Map<string, string>();
    variants.set(s.kind, byKind);
    const sig = signature(lines);
    if (!byKind.has(sig)) byKind.set(sig, `${lid} ${display(p)}  ${renderLines(lines)}  steps=${s.steps.map(stepText).join(",")}`);
  }
  if (lv.modes.includes("M")) memoRows.push(`${lid} ${lv.scaffoldKind}: ${(100 - (100 * emptyMemo) / N).toFixed(1)}% with memo`);
}
const usedKinds = new Set(LEVELS.map((l) => l.scaffoldKind).filter((k) => !isVisual(k)));
c.ok([...usedKinds].every((k) => variants.has(k)), "every scaffold kind exercised", () => [...usedKinds].filter((k) => !variants.has(k)).join(","));

// ---------------- curriculum.json examples ----------------
const exampleRows: string[] = [];
const pqNotes: string[] = [];
for (const [kind, spec] of Object.entries(SCAFFOLD_KINDS)) {
  for (const ex of spec.examples ?? []) {
    const firstLevel = LEVELS.find((l) => l.scaffoldKind === kind)?.id ?? "";
    const lid = ex.level ?? firstLevel;
    const text = ex.problem.endsWith("？") || ex.problem.includes("□") ? ex.problem : `${ex.problem}＝`;
    const p0 = parseDisplay(text);
    const p: Problem = p0.shape === "binary" && p0.op === "÷" && p0.a % p0.b ? { shape: "divRem", dividend: p0.a, divisor: p0.b } : p0;
    const s = scaffoldOf(lid, p);
    const lines = hintLines(lid, p);
    checkHint(lid, p, s.steps, lines, answerText(computeAnswer(p)));
    exampleRows.push(`${kind.padEnd(17)} ${lid.padEnd(4)} ${ex.problem.padEnd(14)} ${renderLines(lines)}`);
    if (kind === "PARTIAL_QUOTIENT") {
      const asText = s.steps.map(stepText);
      const same = JSON.stringify(asText) === JSON.stringify(ex.steps.map(String));
      if (!same) pqNotes.push(`${ex.problem}: curriculum ${JSON.stringify(ex.steps)} vs reference_scaffolds.py/TS ${JSON.stringify(s.steps)}`);
      continue; // skipped exactly like reference_scaffolds.py _self_test
    }
    c.ok(Bun.deepEquals(s.steps, ex.steps, true), "curriculum example steps", () => `${kind} ${lid} ${ex.problem}: ${JSON.stringify(s.steps)} vs ${JSON.stringify(ex.steps)}`);
    if (ex.memo) c.ok(Bun.deepEquals(s.memo, ex.memo, true), "curriculum example memo", () => `${kind} ${ex.problem}: ${JSON.stringify(s.memo)} vs ${JSON.stringify(ex.memo)}`);
  }
}

// ---------------- CPython cross-check of steps / memo ----------------
const PY_N = 1000;
const PY_SEEDS = [11, 3];
const py = pythonReference(PY_N, PY_SEEDS, true);
let pyLine = "CPython cross-check skipped (python3 not available)";
if (py) {
  let same = 0;
  let total = 0;
  for (const lv of LEVELS) {
    for (const seed of PY_SEEDS) {
      for (const row of py.levels[lv.id][String(seed)]) {
        const [q, a, kind, steps, memo] = row as [string, string, string, StepValue[], number[]];
        const s = scaffoldOf(lv.id, parseDisplay(q, a));
        total++;
        if (c.ok(s.kind === kind && Bun.deepEquals(s.steps, steps, true) && Bun.deepEquals(s.memo, memo, true), "same steps/memo as reference_scaffolds.py", () => `${lv.id} ${q}: ${JSON.stringify(s)} vs ${JSON.stringify({ kind, steps, memo })}`))
          same++;
      }
    }
  }
  pyLine = `CPython cross-check: ${same}/${total} scaffolds identical to reference_scaffolds.py scaffold() (random.Random(${PY_SEEDS.join("), random.Random(")}), ${PY_N} per level)`;
}

console.log("hint line variants seen (one example each):");
for (const [kind, byKind] of variants) for (const row of byKind.values()) console.log(`  ${kind.padEnd(17)} ${row}`);
console.log("\ncurriculum.json examples → hint lines:");
console.log(exampleRows.map((r) => `  ${r}`).join("\n"));
if (pqNotes.length) console.log(`\nPARTIAL_QUOTIENT examples skipped (as in reference_scaffolds.py); they differ from the reference steps:\n  ${pqNotes.join("\n  ")}`);
console.log(`\nM-mode levels, share of problems that have memo values:\n  ${memoRows.join("\n  ")}`);
console.log(`\n${pyLine}`);
c.finish();
