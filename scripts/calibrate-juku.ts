// Recomputes D (the average of what is written for an answer) and approxDistinctProblems for every level of
// src/juku/juku.json from its generator, keeping the file's layout. Run after changing a generator:
//   bun run scripts/calibrate-juku.ts
// tests/juku/generators.test.ts fails when a D in juku.json drifts more than 0.2 from its generator.
import { readFileSync, writeFileSync } from "node:fs";
import { mulberry32 } from "../src/domain/rng";
import { JGENERATORS, enumerateJLevel } from "../src/juku/generators";
import { jAnswer, jFactKey, jWriteUnits } from "../src/juku/problem";
import { JLEVELS } from "../src/juku/spec";

const PATH = new URL("../src/juku/juku.json", import.meta.url);
const N = 40000;

let text = readFileSync(PATH, "utf8");
for (const lv of JLEVELS) {
  const r = mulberry32(99);
  const keys = new Set<string>();
  let written = 0;
  for (let i = 0; i < N; i++) {
    const p = JGENERATORS[lv.id](r);
    written += jWriteUnits(jAnswer(p));
    keys.add(jFactKey(p));
  }
  const d = Math.round((written / N) * 10) / 10;
  const distinct = enumerateJLevel(lv.id)?.length ?? keys.size;
  const start = text.indexOf(`"id": "${lv.id}"`);
  const next = text.indexOf(`"id": "`, start + 5);
  const end = next < 0 ? text.length : next;
  const block = text
    .slice(start, end)
    .replace(/"D": [\d.]+/, `"D": ${d}`)
    .replace(/"approxDistinctProblems": \d+/, `"approxDistinctProblems": ${distinct}`);
  text = text.slice(0, start) + block + text.slice(end);
  console.log(`${lv.id.padEnd(4)} D ${String(lv.D).padStart(4)} → ${String(d).padStart(4)}   distinct ${lv.approxDistinctProblems} → ${distinct}`);
}
writeFileSync(PATH, text);
