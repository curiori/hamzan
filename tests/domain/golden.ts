// Golden test: every sample of reference_samples.json (1,757) must
//   - parse to a Problem whose display() round-trips exactly,
//   - have answerText(computeAnswer(p)) === answer,
//   - give scaffoldOf(level, p) with the same kind / steps / memo.
// run (from the project root): bun run tests/domain/golden.ts
import { readFileSync } from "node:fs";
import { scaffoldOf, hintLines } from "../../src/domain/scaffolds.ts";
import { makeInstance } from "../../src/domain/generators.ts";
import {
  answerText,
  computeAnswer,
  display,
  parseDisplay,
  type StepValue,
} from "../../src/domain/problem.ts";
import { Checker, KIND } from "./common.ts";

interface Sample {
  problem: string;
  answer: string;
  scaffoldKind: string;
  steps: StepValue[];
  memo: number[];
}

const data = JSON.parse(readFileSync(new URL("./reference/reference_samples.json", import.meta.url), "utf8")) as { samples: Record<string, Sample[]> };
const c = new Checker("golden");

let total = 0;
let full = 0;
const perLevel: string[] = [];
for (const [lid, samples] of Object.entries(data.samples)) {
  let lvOk = 0;
  for (const s of samples) {
    total++;
    let ok = true;
    let p;
    try {
      p = parseDisplay(s.problem, s.answer);
    } catch (e) {
      c.ok(false, "parse", () => `${lid} ${s.problem}: ${String(e)}`);
      continue;
    }
    ok = c.ok(display(p) === s.problem, "display round-trip", () => `${lid} ${s.problem} → ${display(p)}`) && ok;
    const ans = answerText(computeAnswer(p));
    ok = c.ok(ans === s.answer, "answer", () => `${lid} ${s.problem} expected ${s.answer} got ${ans}`) && ok;
    ok = c.ok(KIND[lid] === s.scaffoldKind, "level kind", () => `${lid}: curriculum ${KIND[lid]} vs sample ${s.scaffoldKind}`) && ok;
    const sc = scaffoldOf(lid, p);
    ok = c.ok(sc.kind === s.scaffoldKind, "scaffold kind", () => `${lid} ${s.problem}: ${sc.kind} vs ${s.scaffoldKind}`) && ok;
    ok = c.ok(Bun.deepEquals(sc.steps, s.steps, true), "steps", () => `${lid} ${s.problem}: ${JSON.stringify(sc.steps)} vs ${JSON.stringify(s.steps)}`) && ok;
    ok = c.ok(Bun.deepEquals(sc.memo, s.memo, true), "memo", () => `${lid} ${s.problem}: ${JSON.stringify(sc.memo)} vs ${JSON.stringify(s.memo)}`) && ok;
    // the instance and hint lines must build for every golden problem as well
    const inst = makeInstance(lid, p);
    ok = c.ok(answerText(inst.answer) === s.answer, "instance answer", () => `${lid} ${s.problem}`) && ok;
    const lines = hintLines(lid, p);
    const refs = new Set(lines.flatMap((ln) => ln.flatMap((t) => (t.t === "blank" ? [t.step] : []))));
    ok = c.ok(refs.size === sc.steps.length && [...refs].every((i) => i >= 0 && i < sc.steps.length), "hint blanks", () => `${lid} ${s.problem}`) && ok;
    if (ok) {
      full++;
      lvOk++;
    }
  }
  perLevel.push(`${lid}:${lvOk}/${samples.length}`);
}

console.log(perLevel.join("  "));
console.log(`\ngolden samples fully matching (display, answer, kind, steps, memo): ${full}/${total}`);
c.ok(total === 1757, "sample count", () => `expected 1757 samples, found ${total}`);
c.finish();
