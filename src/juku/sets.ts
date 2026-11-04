// Building sets for stages 6–9, with the rules of src/domain/setBuilder.ts (rules.setGeneration): no fact twice
// while the level has enough facts, never the same fact twice in a row, weak facts weighted ×2 on enumerable levels.
import { mulberry32, seedOf, type Rng } from "@/domain/rng";
import { SPEC } from "@/domain/spec";
import { JGENERATORS, enumerateJLevel } from "./generators";
import { jFactKey, jText, makeJInstance, type JInstance, type JProblem } from "./problem";
import { JLEVEL } from "./spec";

interface PoolEntry {
  problem: JProblem;
  key: string;
  weight: number;
}

const poolCache = new Map<string, PoolEntry[]>();

/** Every problem of an enumerable level, weighted by how often its generator gives it. */
export function jBasePool(levelId: string): PoolEntry[] | null {
  if (!JLEVEL[levelId]?.enumerable) return null;
  const cached = poolCache.get(levelId);
  if (cached) return cached;
  const all = enumerateJLevel(levelId);
  if (!all?.length) return null;
  const counts = new Map<string, number>();
  const r = mulberry32(seedOf("pool", levelId));
  for (let i = 0; i < 30000; i++) {
    const t = jText(JGENERATORS[levelId](r));
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const min = Math.min(...counts.values());
  const pool = all.map((p) => ({ problem: p, key: jFactKey(p), weight: counts.get(jText(p)) ?? min }));
  poolCache.set(levelId, pool);
  return pool;
}

function drawFromPool(r: Rng, pool: PoolEntry[], n: number, weak: Set<string>, used: Set<string>): JProblem[] {
  const w = SPEC.rules.setGeneration.weakFactWeight;
  const out: JProblem[] = [];
  let round = new Set<string>(used);
  let last: string | null = null;
  while (out.length < n) {
    let cand = pool.filter((e) => !round.has(e.key));
    if (!cand.length) {
      round = new Set();
      cand = pool;
    }
    const choices = cand.length > 1 ? cand.filter((e) => e.key !== last) : cand;
    const weightOf = (e: PoolEntry) => e.weight * (weak.has(e.key) ? w : 1);
    let x = r.next() * choices.reduce((a, e) => a + weightOf(e), 0);
    let pick = choices[choices.length - 1];
    for (const e of choices) {
      x -= weightOf(e);
      if (x <= 0) {
        pick = e;
        break;
      }
    }
    out.push(pick.problem);
    round.add(pick.key);
    used.add(pick.key);
    last = pick.key;
  }
  return out;
}

function drawGenerated(r: Rng, levelId: string, n: number, used: Set<string>): JProblem[] {
  const out: JProblem[] = [];
  for (let tries = 0; out.length < n && tries < n * 300; tries++) {
    const p = JGENERATORS[levelId](r);
    const k = jFactKey(p);
    if (used.has(k)) continue;
    used.add(k);
    out.push(p);
  }
  while (out.length < n) out.push(JGENERATORS[levelId](r));
  return out;
}

export function jDrawLevel(r: Rng, levelId: string, n: number, weak: Set<string>, used: Set<string>): JInstance[] {
  const pool = jBasePool(levelId);
  const problems = pool ? drawFromPool(r, pool, n, weak, used) : drawGenerated(r, levelId, n, used);
  return problems.map((p) => makeJInstance(levelId, p));
}

/** One level's set from its seed. */
export function jBuildSet(levelId: string, n: number, seed: number, weak: Set<string> = new Set()): JInstance[] {
  return jDrawLevel(mulberry32(seed), levelId, n, weak, new Set());
}
