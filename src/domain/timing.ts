// T = read + think × K + write × D (seconds per problem), rounded to 0.1 s.
import { LEVEL, SPEC, type Coeffs, type LevelSpec } from "./spec";

export interface TimeOptions {
  /** write_child (sec / digit) from the input-speed test; replaces write for ★2 and ★3 */
  writeChild?: number | null;
  /** parent-adjusted coefficients (advanced setting) */
  override?: { star2: Coeffs; star3: Coeffs } | null;
}

export const round1 = (x: number) => Math.round(x * 10) / 10;

export function coeffsFor(star: 2 | 3, opts: TimeOptions = {}): Coeffs {
  const base = opts.override ? (star === 2 ? opts.override.star2 : opts.override.star3) : star === 2 ? SPEC.timeModel.star2 : SPEC.timeModel.star3;
  return opts.writeChild ? { ...base, write: opts.writeChild } : base;
}

export function targetSec(level: LevelSpec, star: 2 | 3, opts: TimeOptions = {}): number {
  const c = coeffsFor(star, opts);
  return round1(c.read + c.think * level.K + c.write * level.D);
}

/** Mixed sets (stage check, review mix): the average of each problem's level T. */
export function mixedTargetSec(levelIds: string[], star: 2 | 3, opts: TimeOptions = {}): number {
  if (!levelIds.length) return 0;
  const sum = levelIds.reduce((a, id) => a + targetSec(LEVEL[id], star, opts), 0);
  return round1(sum / levelIds.length);
}

/** Whole-set guide shown to people: T × n rounded up to 5 seconds. */
export const setTargetDisplaySec = (t: number, n: number) => Math.ceil((t * n) / 5) * 5;

/** Input-speed test: median seconds per digit, clamped to clampSec. */
export function writeChildFrom(perDigitSec: number[]): number {
  const [lo, hi] = SPEC.timeModel.inputSpeedTest.clampSec;
  const s = [...perDigitSec].sort((a, b) => a - b);
  if (!s.length) return lo;
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return Math.round(Math.min(hi, Math.max(lo, median)) * 100) / 100;
}
