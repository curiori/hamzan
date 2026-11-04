// Sets of any level. Stages 0–5 keep the exact sets of src/domain/setBuilder.ts (same seeds, same problems).
import type { ProblemInstance } from "@/domain/problem";
import { mulberry32, seedOf } from "@/domain/rng";
import { buildMixed, buildSet, buildWarmup } from "@/domain/setBuilder";
import { jBuildSet, jDrawLevel } from "@/juku/sets";
import { isJukuLevel } from "./levels";
import { isJukuInstance, type CourseInstance } from "./problems";

export function buildLevelSet(levelId: string, n: number, seed: number, weak: Set<string> = new Set()): CourseInstance[] {
  return isJukuLevel(levelId) ? jBuildSet(levelId, n, seed, weak) : buildSet(levelId, n, seed, weak);
}

/** Several levels mixed (stage checks, review, challenge): counts[i] problems of levelIds[i], shuffled. */
export function buildMixedSet(levelIds: string[], counts: number[], seed: number, weak: Set<string> = new Set()): CourseInstance[] {
  if (!levelIds.some(isJukuLevel)) return buildMixed(levelIds, counts, seed, weak);
  const core = levelIds.map((id, i) => [id, counts[i]] as const).filter(([id]) => !isJukuLevel(id));
  const r = mulberry32(seed);
  const used = new Set<string>();
  const juku = levelIds.flatMap((id, i) => (isJukuLevel(id) ? jDrawLevel(r, id, counts[i], weak, used) : []));
  const coreSet = core.length
    ? buildMixed(
        core.map(([id]) => id),
        core.map(([, n]) => n),
        seedOf(seed, "core"),
        weak,
      )
    : [];
  return r.shuffle<CourseInstance>([...coreSet, ...juku]);
}

/** Warm-up: yesterday's stage 6–9 mistakes first, then the warm-up of src/domain (its mistakes and facts). */
export function buildWarmupSet(levelIds: string[], missed: CourseInstance[], seed: number, n: number): CourseInstance[] {
  const coreMissed = missed.filter((m): m is ProblemInstance => !isJukuInstance(m));
  const jukuMissed = missed.filter(isJukuInstance);
  if (!jukuMissed.length) return buildWarmup(levelIds, coreMissed, seed, n);
  const r = mulberry32(seedOf(seed, "juku"));
  const seen = new Set<string>();
  const first = r.shuffle(jukuMissed.filter((m) => !seen.has(m.factKey) && !!seen.add(m.factKey)));
  return [...first, ...buildWarmup(levelIds, coreMissed, seed, Math.max(0, n - first.length))].slice(0, n);
}
