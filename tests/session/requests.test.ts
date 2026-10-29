import { describe, expect, test } from "bun:test";
import { addDays } from "../../src/domain/dates";
import { miniLevel, startPlacement } from "../../src/domain/placement";
import { freshProgress } from "../../src/domain/progression";
import { planDailySession } from "../../src/domain/session";
import { LEVEL, RULE_NUMBERS, SPEC, STAGES } from "../../src/domain/spec";
import { challengePlan, levelPlan, nextSessionPlan, placementPlan, sessionPartPlan } from "../../src/session/requests";
import { newProfile } from "../../src/state/profile";
import type { SessionDay } from "../../src/state/types";

const DATE = "2026-10-29";
const NOW = Date.UTC(2026, 9, 29, 3);
const fresh = () => ({ ...newProfile("t", 4, { id: "p1", now: NOW }), placementDone: true, placementSeen: true });

describe("session requests", () => {
  test("the first part of a day is a warm-up of warmup.seconds", () => {
    const p = fresh();
    const day: SessionDay = {
      plan: planDailySession({ progress: p.progress, reviews: p.reviews, stageChecks: p.stageChecks, date: DATE, unlockAll: false }),
      done: 0,
      goal: false,
    };
    const { plan, skipped } = nextSessionPlan(day, p, DATE, false);
    expect(skipped).toEqual([]);
    expect(plan?.ctx.kind).toBe("warmup");
    expect(plan?.ctx.sessionPart).toBe(0);
    expect(plan?.req.warmupSec).toBe(SPEC.rules.dailySession.warmup.seconds);
    expect(plan?.req.problems.length).toBeGreaterThan(0);
  });

  test("a stage check that was already done is skipped", () => {
    const p = fresh();
    p.stageChecks[0] = { date: DATE, passed: true };
    const day: SessionDay = { plan: [{ kind: "stageCheck", stage: 0 }, { kind: "slot", slot: "frontier" }], done: 0, goal: false };
    const { plan, skipped } = nextSessionPlan(day, p, DATE, false);
    expect(skipped).toEqual([0]);
    expect(plan?.ctx).toMatchObject({ kind: "main", sessionPart: 1, inSession: true });
  });

  test("every session part carries the date of its session", () => {
    const p = fresh();
    p.reviews = [{ levelId: "0-1", intervalIndex: 0, dueDate: DATE, consecutiveFails: 0 }];
    const parts = [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }, { kind: "stageCheck", stage: 0 }, { kind: "review", levelIds: ["0-1"] }] as const;
    parts.forEach((part, i) => expect(sessionPartPlan(part, i, p, DATE, false)?.ctx.sessionDate).toBe(DATE));
    expect(levelPlan(p, "1-1", "S", DATE, "extra").ctx.sessionDate).toBeUndefined();
  });

  test("a review part with no matching review items is skipped", () => {
    const p = fresh();
    const day: SessionDay = { plan: [{ kind: "review", levelIds: ["1-1"] }], done: 0, goal: false };
    expect(nextSessionPlan(day, p, DATE, false)).toEqual({ plan: null, skipped: [0] });
  });

  test("levelPlan uses the fixed seed on the first S days", () => {
    const p = fresh();
    p.progress["1-1"] = { ...freshProgress(LEVEL["1-1"]), mode: "S" };
    const a = levelPlan(p, "1-1", "S", DATE, "extra", undefined, 1);
    const b = levelPlan(p, "1-1", "S", addDays(DATE, 1), "extra", undefined, 2);
    expect(a.ctx.fixed).toBe(true);
    expect(a.ctx.inSession).toBe(false);
    expect(a.req.problems.length).toBe(LEVEL["1-1"].setSize);
    expect(b.req.problems.map((x) => x.factKey)).toEqual(a.req.problems.map((x) => x.factKey));
  });

  test("challengePlan draws weeklyChallenge.problems from mastered levels", () => {
    const p = fresh();
    for (const id of ["0-1", "0-2"]) p.progress[id] = { ...freshProgress(LEVEL[id]), mode: "S", star2At: DATE, masteredAt: DATE };
    const plan = challengePlan(p, DATE);
    expect(plan.ctx.kind).toBe("challenge");
    expect(plan.req.problems.length).toBe(SPEC.rules.dailySession.weeklyChallenge.problems);
    for (const inst of plan.req.problems) expect(["0-1", "0-2"]).toContain(inst.levelId);
  });

  test("short placement asks at most 6 problems in a stage check", () => {
    const p = { ...fresh(), placementDone: false, placement: startPlacement(4) };
    const sc = STAGES[p.placement.stage].stageCheck;
    expect(placementPlan(p, DATE, true)?.req.problems.length).toBe(Math.min(6, sc.problems));
    expect(placementPlan(p, DATE, false)?.req.problems.length).toBe(sc.problems);
    expect(placementPlan(p, DATE, false)?.ctx).toMatchObject({ kind: "placement", placementPhase: "stageCheck", levelId: null });
  });

  test("a mini check asks miniCheckProblems of the stage's current level", () => {
    const st = { ...startPlacement(4), phase: "mini" as const, miniIndex: 1 };
    const plan = placementPlan({ ...fresh(), placementDone: false, placement: st }, DATE, false);
    expect(plan?.ctx).toMatchObject({ kind: "placement", placementPhase: "mini", levelId: miniLevel(st) });
    expect(plan?.req.problems.length).toBe(RULE_NUMBERS.miniCheckProblems);
  });

  test("placementPlan is null without an open diagnosis", () => {
    expect(placementPlan(fresh(), DATE, false)).toBeNull();
    const done = { ...startPlacement(4), phase: "done" as const };
    expect(placementPlan({ ...fresh(), placement: done }, DATE, false)).toBeNull();
  });
});
