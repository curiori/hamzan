import { describe, expect, test } from "bun:test";
import { COURSE } from "@/course/course";
import { COURSE_ERROR_TYPES } from "@/course/levels";
import type { ErrorTypeId } from "@/domain/errors";
import type { Problem } from "@/domain/problem";
import { freshProgress } from "@/domain/progression";
import { ERROR_TYPES } from "@/domain/spec";
import { calendarDays, errorCounts, openStageId, retestDue, seedSummary, speedLevels, trendSeries, waitingChecks, weakFactsTop } from "@/features/parent/dashboard-data";
import type { LedgerEntry } from "@/game/economy";
import { newProfile } from "@/state/profile";
import type { FactStat, Profile, SetAttempt } from "@/state/types";

const base = (): Profile => newProfile("たろう", 3, { now: 0, random: () => 0.5 });
const problem = { shape: "binary", a: 7, b: 8, op: "+" } as Problem;
const set = (patch: Partial<SetAttempt>): SetAttempt => ({
  id: `s${Math.random()}`,
  kind: "main",
  levelId: "1-1",
  mode: "S",
  date: "2026-10-01",
  startedAt: 0,
  n: 30,
  errors: 0,
  perProblemSec: 1.5,
  target2: 2,
  target3: 1.2,
  result: "star2",
  ...patch,
});
const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}`;

describe("calendarDays", () => {
  test("covers five weeks ending today with goal and practice flags", () => {
    const p = { ...base(), sets: [set({ date: day(28) })], sessions: { [day(27)]: { plan: [], done: 0, goal: true } } };
    const days = calendarDays(p, day(29));
    expect(days).toHaveLength(35);
    expect(days[0].date).toBe("2026-09-25");
    expect(days[34]).toEqual({ date: day(29), goal: false, practiced: false });
    expect(days.find((d) => d.date === day(28))).toEqual({ date: day(28), goal: false, practiced: true });
    expect(days.find((d) => d.date === day(27))?.goal).toBe(true);
  });
});

describe("speed records", () => {
  test("trendSeries keeps the last 20 S sets of a level and skips interrupted and placement sets", () => {
    const sets = [
      ...Array.from({ length: 22 }, (_, i) => set({ date: day(i + 1), perProblemSec: i, errors: i % 3 })),
      set({ date: day(23), result: "interrupted" }),
      set({ date: day(24), kind: "placement" }),
      set({ date: day(25), mode: "H" }),
      set({ date: day(26), levelId: "1-2" }),
    ];
    const t = trendSeries({ ...base(), sets }, "1-1");
    expect(t).toHaveLength(20);
    expect(t[0]).toEqual({ date: "10-03", sec: 2, errors: 2 });
    expect(t[19].date).toBe("10-22");
  });
  test("speedLevels lists levels with S sets outside the diagnosis, in curriculum order", () => {
    const p = { ...base(), sets: [set({ levelId: "1-2" }), set({ levelId: "0-1" }), set({ levelId: "1-1", kind: "placement" }), set({ levelId: "2-1", mode: "H" })] };
    expect(speedLevels(p).map((l) => l.id)).toEqual(["0-1", "1-2"]);
  });
  test("a level whose speed sets were all interrupted has no trend and is not listed", () => {
    const p = { ...base(), sets: [set({ levelId: "2-3", result: "interrupted" }), set({ levelId: "1-2" })] };
    expect(trendSeries(p, "2-3")).toEqual([]);
    expect(speedLevels(p).map((l) => l.id)).toEqual(["1-2"]);
  });
});

describe("mistakes", () => {
  test("errorCounts counts mistakes of the last 30 days by type", () => {
    const e = (date: string, type: ErrorTypeId) => ({ date, levelId: "1-1", factKey: "k", type, problem });
    const p = { ...base(), errors: [e(day(29), "carry"), e("2026-09-30", "carry"), e("2026-09-29", "fact"), e(day(10), "remainder")] };
    const c = errorCounts(p, day(29));
    expect(c.carry).toBe(2);
    expect(c.fact).toBe(0);
    expect(c.remainder).toBe(1);
    // the six types of stages 0–5 and the two of stages 6–9, every one present
    expect(Object.keys(c).sort()).toEqual(COURSE_ERROR_TYPES.map((t) => t.id).sort());
    expect(Object.keys(c)).toEqual(expect.arrayContaining([...ERROR_TYPES.map((t) => t.id), "reduce", "time60"]));
    expect([c.reduce, c.time60]).toEqual([0, 0]);
  });
  test("weakFactsTop sorts facts with misses by misses, then by the last time", () => {
    const f = (errors: number, lastLatencyMs: number | null): FactStat => ({
      levelId: "1-1",
      problem,
      attempts: 5,
      errors,
      errorDates: [],
      lastErrorDate: null,
      lastSlowDate: null,
      lastLatencyMs,
      lastSeen: day(1),
    });
    const p = { ...base(), facts: { a: f(1, 900), b: f(3, 100), c: f(1, 2000), d: f(0, 5000) } };
    expect(weakFactsTop(p, 2).map(([k]) => k)).toEqual(["b", "c"]);
    expect(weakFactsTop(p).map(([k]) => k)).toEqual(["b", "c", "a"]);
    // facts of levels this version does not have stay in the records but are not shown
    const gone = { ...p, facts: { ...p.facts, e: { ...f(9, 100), levelId: "future-1" } } };
    expect(weakFactsTop(gone).map(([k]) => k)).toEqual(["b", "c", "a"]);
  });
});

describe("progress in the one course", () => {
  test("the stage shown open is the one holding the first level below ★2, in course order", () => {
    const p = base();
    expect(openStageId(p)).toBe(0);
    const done = Object.fromEntries(COURSE.levels.filter((l) => l.order < COURSE.level["pi-shift"].order).map((l) => [l.id, { ...freshProgress(l), star2At: day(1) }]));
    expect(openStageId({ ...p, progress: done })).toBe(8);
  });

  test("the levels waiting for their check are listed in course order", () => {
    const p = { ...base(), course: { version: 2, seen: [], checks: ["pi-table", "future-1", "frac-mixed"] } };
    expect(waitingChecks(p)).toEqual(["frac-mixed", "pi-table"]);
  });
});

describe("retestDue", () => {
  test("the key-speed test is due again after the configured days", () => {
    expect(retestDue(base(), day(29))).toBe(false);
    expect(retestDue({ ...base(), writeTestedAt: day(28) }, day(29))).toBe(false);
    expect(retestDue({ ...base(), writeTestedAt: "2026-01-01" }, day(29))).toBe(true);
  });
});

describe("seeds", () => {
  const entry = (date: string, delta: number, ref?: string): LedgerEntry => ({ at: 0, date, delta, reason: delta > 0 ? "set" : "buy", ...(ref ? { ref } : {}) });

  test("seedSummary shows the wallet, the last 7 days and what was bought", () => {
    const p: Profile = {
      ...base(),
      wallet: { ...base().wallet, seeds: 75 },
      ledger: [entry(day(21), 30), entry(day(28), 20), entry(day(29), 15), entry(day(29), -60, "ball")],
      inventory: { ball: 1, carrot: 2, apple: 0 },
    };
    expect(seedSummary(p, day(29))).toEqual({
      seeds: 75,
      week: 35,
      bought: [
        { id: "ball", name: "ころころボール", count: 1 },
        { id: "carrot", name: "にんじん", count: 2 },
      ],
    });
  });

  test("the 7 days are today and the six days before it", () => {
    const p: Profile = { ...base(), ledger: [entry(day(22), 7), entry(day(23), 6), entry(day(30), 100)] };
    expect(seedSummary(p, day(29)).week).toBe(6);
    expect(seedSummary(base(), day(29))).toEqual({ seeds: 0, week: 0, bought: [] });
  });
});
