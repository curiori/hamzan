import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { planDay } from "../../src/course/plan";
import { planDailySession } from "../../src/domain/session";
import { CORE, D, mastered, passedBefore, randomRecords, withLevels } from "./records";

const review = { levelId: "0-1", intervalIndex: 0, dueDate: D, consecutiveFails: 0 };

describe("today's plan", () => {
  test("over stages 0–5 without checks it is exactly src/domain's plan", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rec = randomRecords(CORE, seed);
      for (const unlockAll of [false, true])
        expect(planDay({ ...rec, date: D, unlockAll, checks: [], course: CORE })).toEqual(planDailySession({ ...rec, date: D, unlockAll }));
    }
  });

  test("levels waiting for a check take one of the two main sets, right after the warm-up", () => {
    const { "frac-mixed": _waiting, ...progress } = passedBefore(COURSE, "5-3");
    const stageChecks = Object.fromEntries(COURSE.stages.map((s) => [s.id, { date: D, passed: true }]));
    expect(planDay({ progress, reviews: [review], stageChecks, date: D, unlockAll: false, checks: ["frac-mixed"] })).toEqual([
      { kind: "warmup" },
      { kind: "check" },
      { kind: "slot", slot: "frontier" },
      { kind: "review", levelIds: ["0-1"] },
    ]);
  });

  test("with a check, a due stage check is the other main set", () => {
    const progress = withLevels(COURSE, Object.fromEntries(COURSE.stage[0].levelIds.map((id) => [id, mastered()])));
    expect(planDay({ progress, reviews: [], stageChecks: {}, date: D, unlockAll: false, checks: ["frac-mixed"] })).toEqual([
      { kind: "warmup" },
      { kind: "check" },
      { kind: "stageCheck", stage: 0 },
    ]);
  });

  test("with a check and nothing to move on to, the other main set aims at ★3, or there is none", () => {
    const others = COURSE.levels.filter((l) => l.id !== "est-mix");
    const allPassed = withLevels(COURSE, Object.fromEntries(others.map((l) => [l.id, { star2At: D, mode: "S" as const, practiced: true }])));
    const checks = Object.fromEntries(COURSE.stages.map((s) => [s.id, { date: D, passed: true }]));
    expect(planDay({ progress: allPassed, reviews: [], stageChecks: checks, date: D, unlockAll: false, checks: ["est-mix"] })).toEqual([
      { kind: "warmup" },
      { kind: "check" },
      { kind: "slot", slot: "pending" },
    ]);
    const allMastered = withLevels(COURSE, Object.fromEntries(others.map((l) => [l.id, mastered()])));
    expect(planDay({ progress: allMastered, reviews: [], stageChecks: checks, date: D, unlockAll: false, checks: ["est-mix"] })).toEqual([
      { kind: "warmup" },
      { kind: "check" },
    ]);
  });

  test("a check list whose levels all have ★2 adds no check", () => {
    const progress = withLevels(COURSE, { "frac-mixed": mastered() });
    expect(planDay({ progress, reviews: [], stageChecks: {}, date: D, unlockAll: false, checks: ["frac-mixed"] }).some((p) => p.kind === "check")).toBe(false);
  });
});
