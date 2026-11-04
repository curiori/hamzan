import { ALL_LEVELS, COURSE_ERROR_TYPES } from "@/course/levels";
import { addDays, diffDays, type LocalDate } from "@/domain/dates";
import { statusOf } from "@/domain/progression";
import { LEVEL, LEVELS, SPEC, type LevelSpec } from "@/domain/spec";
import { SHOP } from "@/game/shop";
import type { FactStat, Profile } from "@/state/types";

// Numbers behind the parent dashboard (same rules as the web prototype's Dashboard).

/** a finished speed set outside the diagnosis and the starting checks: what the speed trend is drawn from */
const isTrendRecord = (s: Profile["sets"][number]) => s.mode === "S" && s.kind !== "placement" && s.kind !== "juku_check" && s.result !== "interrupted";

/** The last `weeks` weeks ending on `date`, oldest first. */
export function calendarDays(p: Profile, date: LocalDate, weeks = 5): { date: LocalDate; goal: boolean; practiced: boolean }[] {
  const practiced = new Set(p.sets.map((s) => s.date));
  const n = weeks * 7;
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(date, i - (n - 1));
    return { date: d, goal: !!p.sessions[d]?.goal, practiced: practiced.has(d) };
  });
}

/** Levels with a speed trend to show, in curriculum order (stages 0–9). */
export const speedLevels = (p: Profile): LevelSpec[] => ALL_LEVELS.filter((l) => p.sets.some((s) => s.levelId === l.id && isTrendRecord(s)));

/** Seconds per problem of the last speed sets of a level (interrupted and diagnosis sets left out). */
export function trendSeries(p: Profile, levelId: string, limit = 20): { date: string; sec: number; errors: number }[] {
  return p.sets
    .filter((s) => s.levelId === levelId && isTrendRecord(s))
    .slice(-limit)
    .map((s) => ({ date: s.date.slice(5), sec: s.perProblemSec, errors: s.errors }));
}

/** Facts with misses: most misses first, then the slowest last answer. */
export function weakFactsTop(p: Profile, n = 10): [string, FactStat][] {
  return Object.entries(p.facts)
    .filter(([, f]) => f.errors > 0)
    .sort((a, b) => b[1].errors - a[1].errors || (b[1].lastLatencyMs ?? 0) - (a[1].lastLatencyMs ?? 0))
    .slice(0, n);
}

/** Mistakes of the last `days` days by error type (the six of stages 0–5 and the two of stages 6–9); every type is present. */
export function errorCounts(p: Profile, date: LocalDate, days = 30): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(COURSE_ERROR_TYPES.map((t) => [t.id, 0]));
  for (const e of p.errors) if (diffDays(date, e.date) < days && e.type in counts) counts[e.type] += 1;
  return counts;
}

/** The key-speed test is old enough to measure again. */
export const retestDue = (p: Profile, date: LocalDate) =>
  !!p.writeTestedAt && diffDays(date, p.writeTestedAt) >= SPEC.timeModel.inputSpeedTest.retestAfterDays;

/** The stage to show open first: the one holding the first level below ★2. */
export function openStageId(p: Profile): number {
  const next = LEVELS.find((l) => !["star2", "mastered"].includes(statusOf(p.progress, l.id)));
  return (next ?? LEVEL["5-11"]).stage;
}

/** The seeds now, the seeds that came in over the last 7 days (today and the six before), and the shop items the child has. */
export function seedSummary(p: Profile, today: LocalDate): { seeds: number; week: number; bought: { id: string; name: string; count: number }[] } {
  const week = p.ledger
    .filter((e) => e.delta > 0 && diffDays(today, e.date) >= 0 && diffDays(today, e.date) < 7)
    .reduce((sum, e) => sum + e.delta, 0);
  const bought = SHOP.filter((i) => (p.inventory[i.id] ?? 0) > 0).map((i) => ({ id: i.id, name: i.name, count: p.inventory[i.id] }));
  return { seeds: p.wallet.seeds, week, bought };
}
