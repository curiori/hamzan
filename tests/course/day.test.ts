import { describe, expect, test } from "bun:test";
import { coreSlotOn, planDay } from "../../src/course/day";
import { addDays } from "../../src/domain/dates";
import { freshProgress, type ProgressMap } from "../../src/domain/progression";
import { planDailySession } from "../../src/domain/session";
import { LEVEL, LEVELS } from "../../src/domain/spec";
import { JLEVEL } from "../../src/juku/spec";
import { emptyJuku, openUnit, type JukuState } from "../../src/juku/track";

const D = "2026-11-04";
const spec = (id: string) => LEVEL[id] ?? JLEVEL[id];
const withLevels = (levels: Record<string, Partial<ReturnType<typeof freshProgress>>>): ProgressMap =>
  Object.fromEntries(Object.entries(levels).map(([id, lp]) => [id, { ...freshProgress(spec(id)), ...lp }]));
const args = (progress: ProgressMap, juku: JukuState, extra: Partial<Parameters<typeof planDay>[0]> = {}) => ({
  progress,
  reviews: [],
  stageChecks: {},
  date: D,
  unlockAll: false,
  juku,
  ...extra,
});

describe("today's practice with 塾の単元", () => {
  test("with no unit open the day is exactly the stage 0–5 plan", () => {
    const cases: ProgressMap[] = [{}, withLevels(Object.fromEntries(["0-1", "0-2", "0-3", "0-4", "0-5"].map((id) => [id, { star2At: D }])))];
    for (const progress of cases) {
      const reviews = [{ levelId: "0-1", intervalIndex: 0, dueDate: D, consecutiveFails: 0 }];
      expect(planDay(args(progress, emptyJuku(), { reviews }))).toEqual(planDailySession({ progress, reviews, stageChecks: {}, date: D, unlockAll: false }));
    }
  });

  test("an opened unit takes one of the two main sets, first; the other is the stage 0–5 set of the day", () => {
    const juku = openUnit(emptyJuku(), "pi-cylinder", D, {});
    const reviews = [{ levelId: "0-1", intervalIndex: 0, dueDate: D, consecutiveFails: 0 }];
    expect(planDay(args({}, juku, { reviews }))).toEqual([
      { kind: "warmup" },
      { kind: "juku", slot: "frontier" },
      { kind: "slot", slot: coreSlotOn(D) },
      { kind: "review", levelIds: ["0-1"] },
    ]);
  });

  test("the stage 0–5 set moves on one day and practises ★3 the next", () => {
    expect([coreSlotOn(D), coreSlotOn(addDays(D, 1)), coreSlotOn(addDays(D, 2))]).toEqual(
      coreSlotOn(D) === "frontier" ? ["frontier", "pending", "frontier"] : ["pending", "frontier", "pending"],
    );
  });

  test("a stage 0–5 stage check keeps its place next to the juku set", () => {
    const progress = withLevels(Object.fromEntries(["0-1", "0-2", "0-3", "0-4", "0-5"].map((id) => [id, { star2At: D }])));
    const juku = openUnit(emptyJuku(), "pi-cylinder", D, progress);
    expect(planDay(args(progress, juku))).toEqual([{ kind: "warmup" }, { kind: "juku", slot: "frontier" }, { kind: "stageCheck", stage: 0 }]);
  });

  test("a juku stage whose levels all have ★2 gets its stage check in the juku set", () => {
    const progress = withLevels(Object.fromEntries(["est-round", "est-magnitude", "est-decimal", "est-benchmark", "est-plausible", "est-mix"].map((id) => [id, { star2At: D, mode: "S" }])));
    const juku: JukuState = { open: { "review-g4": D, "toward-g5": D }, checks: [] };
    expect(planDay(args(progress, juku))[1]).toEqual({ kind: "stageCheck", stage: 9 });
  });

  test("when stages 0–5 have nothing left, both main sets go to the units", () => {
    const progress = withLevels(Object.fromEntries(LEVELS.map((l) => [l.id, { star2At: D, masteredAt: D, mode: "S" }])));
    const stageChecks = Object.fromEntries([0, 1, 2, 3, 4, 5].map((s) => [s, { date: D, passed: true }]));
    const juku = openUnit(emptyJuku(), "pi-cylinder", D, progress);
    expect(planDay(args(progress, juku, { stageChecks })).filter((p) => p.kind !== "warmup")).toEqual([
      { kind: "juku", slot: "frontier" },
      { kind: "juku", slot: "pending" },
    ]);
  });

  test("units with nothing to practise leave the day as it was", () => {
    const progress = withLevels(Object.fromEntries(["pi-table", "pi-shift", "pi-two-digit", "pi-divide"].map((id) => [id, { star2At: D, masteredAt: D, mode: "S" }])));
    const juku: JukuState = { open: { "pi-cylinder": D }, checks: [] };
    expect(planDay(args(progress, juku))).toEqual(planDailySession({ progress, reviews: [], stageChecks: {}, date: D, unlockAll: false }));
  });
});
