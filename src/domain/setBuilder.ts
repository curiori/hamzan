// Building practice sets (rules.setGeneration).
import { GENERATORS, enumerateLevel, makeInstance } from "./generators";
import { LEVEL, SPEC } from "./spec";
import { mulberry32, seedOf, type Rng } from "./rng";
import { display, factKey, type Problem, type ProblemInstance } from "./problem";

interface PoolEntry {
  problem: Problem;
  key: string;
  weight: number;
}

const poolCache = new Map<string, PoolEntry[]>();

/** Every problem of an enumerable level, weighted by how often its generator produces it (keeps e.g. "6〜9の段を多めに"). */
export function basePool(levelId: string): PoolEntry[] | null {
  if (!LEVEL[levelId]?.enumerable) return null;
  const cached = poolCache.get(levelId);
  if (cached) return cached;
  const all = enumerateLevel(levelId);
  if (!all?.length) return null;
  const counts = new Map<string, number>();
  const r = mulberry32(seedOf("pool", levelId));
  for (let i = 0; i < 30000; i++) {
    const d = display(GENERATORS[levelId](r));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const min = Math.min(...counts.values());
  const pool = all.map((p) => ({ problem: p, key: factKey(p), weight: counts.get(display(p)) ?? min }));
  poolCache.set(levelId, pool);
  return pool;
}

/** Number of distinct facts (commuted problems count once). */
export function distinctFacts(levelId: string): number | null {
  const pool = basePool(levelId);
  return pool ? new Set(pool.map((e) => e.key)).size : null;
}

function drawFromPool(r: Rng, pool: PoolEntry[], n: number, weak: Set<string>, used: Set<string>): Problem[] {
  const w = SPEC.rules.setGeneration.weakFactWeight;
  const out: Problem[] = [];
  let round = new Set<string>(used);
  let last: string | null = null;
  while (out.length < n) {
    let cand = pool.filter((e) => !round.has(e.key));
    if (!cand.length) {
      // fewer distinct facts than the set size: start a new round (never the same fact twice in a row)
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

function drawGenerated(r: Rng, levelId: string, n: number, used: Set<string>): Problem[] {
  const out: Problem[] = [];
  for (let tries = 0; out.length < n && tries < n * 300; tries++) {
    const p = GENERATORS[levelId](r);
    const k = factKey(p);
    if (used.has(k)) continue;
    used.add(k);
    out.push(p);
  }
  while (out.length < n) out.push(GENERATORS[levelId](r));
  return out;
}

function drawLevel(r: Rng, levelId: string, n: number, weak: Set<string>, used: Set<string>): ProblemInstance[] {
  const pool = basePool(levelId);
  const problems = pool ? drawFromPool(r, pool, n, weak, used) : drawGenerated(r, levelId, n, used);
  return problems.map((p) => makeInstance(levelId, p));
}

/** One level's set. No duplicate or commuted duplicate (7×6 / 6×7) while the level has enough distinct facts. */
export function buildSet(levelId: string, n: number, seed: number, weak: Set<string> = new Set()): ProblemInstance[] {
  return drawLevel(mulberry32(seed), levelId, n, weak, new Set());
}

/** Several levels mixed together (stage checks, review mix, challenge). `counts[i]` problems from levelIds[i]. */
export function buildMixed(levelIds: string[], counts: number[], seed: number, weak: Set<string> = new Set()): ProblemInstance[] {
  const r = mulberry32(seed);
  const used = new Set<string>();
  const out = levelIds.flatMap((id, i) => drawLevel(r, id, counts[i], weak, used));
  return r.shuffle(out);
}

/** Spread n problems over levels as evenly as possible (extra problems go to random levels). */
export function spread(levelIds: string[], n: number, seed: number): number[] {
  const r = mulberry32(seed);
  const base = Math.floor(n / levelIds.length);
  const counts = levelIds.map(() => base);
  r.shuffle(levelIds.map((_, i) => i))
    .slice(0, n - base * levelIds.length)
    .forEach((i) => {
      counts[i] += 1;
    });
  return counts;
}

/** Warm-up: yesterday's mistakes first, then facts from the given enumerable levels. */
export function buildWarmup(levelIds: string[], missed: ProblemInstance[], seed: number, n = 60): ProblemInstance[] {
  const r = mulberry32(seed);
  const used = new Set<string>();
  const first = r.shuffle(missed.filter((m) => !used.has(m.factKey) && used.add(m.factKey)));
  const rest: ProblemInstance[] = [];
  const pools = levelIds.filter((id) => LEVEL[id]?.enumerable);
  for (let i = 0; rest.length < n - first.length && pools.length && i < n * 4; i++) {
    const id = r.pick(pools);
    rest.push(...drawLevel(r, id, 1, new Set(), new Set()));
  }
  return [...first, ...rest].slice(0, n);
}
