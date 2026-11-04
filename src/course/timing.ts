// Target times of any level: T = read × R + think × K + write × D (R is 1 for stages 0–5, so their
// targets are exactly those of src/domain/timing.ts).
import { LEVEL } from "@/domain/spec";
import { coeffsFor, round1, targetSec, type TimeOptions } from "@/domain/timing";
import { JLEVEL, readFactor } from "@/juku/spec";

export function levelTargetSec(levelId: string, star: 2 | 3, opts: TimeOptions = {}): number {
  const core = LEVEL[levelId];
  if (core) return targetSec(core, star, opts);
  const lv = JLEVEL[levelId];
  if (!lv) throw new Error(`unknown level ${levelId}`);
  const c = coeffsFor(star, opts);
  return round1(c.read * readFactor(lv) + c.think * lv.K + c.write * lv.D);
}

/** mixed sets: the average of each problem's level T */
export function mixedTargetSecAll(levelIds: string[], star: 2 | 3, opts: TimeOptions = {}): number {
  if (!levelIds.length) return 0;
  return round1(levelIds.reduce((a, id) => a + levelTargetSec(id, star, opts), 0) / levelIds.length);
}
