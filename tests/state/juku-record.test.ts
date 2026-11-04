import { describe, expect, test } from "bun:test";
import { buildLevelSet } from "../../src/course/sets";
import { freshProgress } from "../../src/domain/progression";
import { applyPlacementResult, startPlacement, type PlacementState } from "../../src/domain/placement";
import { scheduleOnMastery } from "../../src/domain/review";
import { JLEVEL } from "../../src/juku/spec";
import { emptyJuku, openUnit } from "../../src/juku/track";
import { jukuCheckPlan, sessionPartPlan } from "../../src/session/requests";
import { newProfile } from "../../src/state/profile";
import { recordSet } from "../../src/state/record-set";
import type { Profile, ProblemResult, SetRun } from "../../src/state/types";

const DATE = "2026-11-04";
const NOW = Date.UTC(2026, 10, 4, 3);
const ctx = { date: DATE, now: NOW };

function child(): Profile {
  return { ...newProfile("さくら", 4, { id: "p1", now: NOW }), placementDone: true, placementSeen: true };
}

const answered = (levelId: string, n: number, opts: { wrongFirst?: boolean; latencyMs?: number } = {}): ProblemResult[] =>
  buildLevelSet(levelId, n, 5).map((inst, i) => {
    const wrong = !!opts.wrongFirst && i === 0;
    return { inst, correct: !wrong, given: wrong ? { kind: "dec", v: "1" } : null, latencyMs: opts.latencyMs ?? 1000 };
  });

describe("recordSet with 塾の単元", () => {
  test("a clean check set gives ★2 (not counted for rewards) and keeps the juku part open for the next level", () => {
    const p = child();
    p.juku = openUnit(emptyJuku(), "pi-cylinder", DATE, {});
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "juku", slot: "frontier" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const plan = sessionPartPlan(p.sessions[DATE].plan[1], 1, p, DATE, false);
    expect(plan?.ctx).toMatchObject({ kind: "juku_check", levelId: "8-1", unitId: "pi-cylinder", inSession: true });
    expect(plan?.req.problems.length).toBe(5);
    const run: SetRun = { kind: "juku_check", mode: "S", levelId: "8-1", unitId: "pi-cylinder", results: answered("8-1", 5), interrupted: false, activeSec: 5, sessionPart: 1, sessionDate: DATE };
    const { profile, summary } = recordSet(p, run, ctx);
    expect(profile.progress["8-1"]).toMatchObject({ star2At: DATE, mode: "S", practiced: true });
    expect(summary.jukuCheck).toEqual({ levelId: "8-1", passed: true, unitDone: false, startLevel: null, startMode: null });
    expect(profile.sessions[DATE].done).toBe(1);
    expect(profile.rewardBaseline?.star2).toBe(1);
    // seeds like the diagnosis: one per right answer, no bonus for finishing
    expect(summary.seeds.total).toBe(5);
    expect(sessionPartPlan(profile.sessions[DATE].plan[1], 1, profile, DATE, false)?.ctx.levelId).toBe("8-2");
  });

  test("a stumble starts that level in hint mode and ends the unit's check for today", () => {
    const p = child();
    p.juku = openUnit(openUnit(emptyJuku(), "pi-cylinder", DATE, {}), "speed-units", DATE, {});
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "juku", slot: "frontier" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const run: SetRun = { kind: "juku_check", mode: "S", levelId: "8-1", unitId: "pi-cylinder", results: answered("8-1", 5, { wrongFirst: true }), interrupted: false, activeSec: 5, sessionPart: 1, sessionDate: DATE };
    const { profile, summary } = recordSet(p, run, ctx);
    expect(summary.jukuCheck).toEqual({ levelId: "8-1", passed: false, unitDone: true, startLevel: "8-1", startMode: "H" });
    expect(profile.juku?.checks).toEqual(["speed-units"]);
    expect(profile.sessions[DATE].done).toBe(2);
    expect(profile.errors.map((e) => e.levelId)).toEqual(["8-1"]);
  });

  test("an interrupted check changes nothing and the check goes on next time", () => {
    const p = child();
    p.juku = openUnit(emptyJuku(), "pi-cylinder", DATE, {});
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "juku", slot: "frontier" }], done: 1, goal: false };
    const run: SetRun = { kind: "juku_check", mode: "S", levelId: "8-1", unitId: "pi-cylinder", results: answered("8-1", 5), interrupted: true, activeSec: 5, sessionPart: 1, sessionDate: DATE };
    const { profile } = recordSet(p, run, ctx);
    expect([profile.progress["8-1"], profile.juku, profile.sessions[DATE].done]).toEqual([undefined, p.juku, 1]);
  });

  test("a juku level set is judged like any level: ★2, mastery and the review schedule", () => {
    const p = child();
    p.juku = { open: { "pi-cylinder": DATE }, checks: [] };
    p.progress["8-1"] = { ...freshProgress(JLEVEL["8-1"]), mode: "S", practiced: true, star3Dates: ["2026-11-03"], star2At: "2026-11-03" };
    const run: SetRun = { kind: "main", mode: "S", levelId: "8-1", results: answered("8-1", 20, { latencyMs: 500 }), interrupted: false, activeSec: 10 };
    const { profile, summary } = recordSet(p, run, ctx);
    expect(summary.result).toBe("star3");
    expect(summary.events).toContain("mastered");
    expect(profile.reviews).toEqual([scheduleOnMastery("8-1", DATE)]);
  });

  test("a wrong unreduced fraction is recorded as 約分・形", () => {
    const p = child();
    const inst = buildLevelSet("6-2", 1, 3)[0];
    const given = inst.answer.kind === "frac" ? { ...inst.answer, n: inst.answer.n * 2, d: inst.answer.d * 2 } : null;
    const run: SetRun = { kind: "extra", mode: "S", levelId: "6-2", results: [{ inst, correct: false, given, latencyMs: 2000 }], interrupted: false, activeSec: 2 };
    expect(recordSet(p, run, ctx).profile.errors[0].type).toBe("reduce");
  });

  test("the end of the diagnosis keeps what the child has in 塾の単元", () => {
    const p = child();
    p.progress["8-1"] = { ...freshProgress(JLEVEL["8-1"]), star2At: DATE, masteredAt: DATE, mode: "S" };
    p.reviews = [scheduleOnMastery("8-1", DATE)];
    p.stageChecks[8] = { date: DATE, passed: false };
    const st: PlacementState = { ...startPlacement(4), phase: "mini", stage: 2, miniIndex: 8 };
    p.placement = st;
    p.placementDone = false;
    const run: SetRun = { kind: "placement", mode: "S", levelId: "2-9", placementPhase: "mini", results: answered("2-9", 5, { wrongFirst: true }), interrupted: false, activeSec: 30 };
    const { profile } = recordSet(p, run, ctx);
    expect(profile.placementDone).toBe(true);
    expect(profile.progress["8-1"].masteredAt).toBe(DATE);
    expect(profile.reviews.some((r) => r.levelId === "8-1")).toBe(true);
    expect(profile.stageChecks[8]).toEqual({ date: DATE, passed: false });
    const applied = applyPlacementResult(profile.placement as PlacementState, DATE);
    for (const [id, lp] of Object.entries(applied.progress)) expect(profile.progress[id]).toEqual(lp);
  });

  test("a juku stage check uses the juku levels and their targets", () => {
    const p = child();
    const plan = sessionPartPlan({ kind: "stageCheck", stage: 8 }, 1, p, DATE, false);
    expect(plan?.req.problems.length).toBe(12);
    expect(plan?.req.problems.every((x) => x.levelId.startsWith("8-"))).toBe(true);
    const run: SetRun = { kind: "stage_check", mode: "S", levelId: null, stage: 8, results: (plan?.req.problems ?? []).map((inst) => ({ inst, correct: true, given: null, latencyMs: 1500 })), interrupted: false, activeSec: 20 };
    const { profile, summary } = recordSet(p, run, ctx);
    expect(summary.stageCheck).toEqual({ stage: 8, passed: true });
    expect(profile.stageChecks[8]?.passed).toBe(true);
  });

  test("jukuCheckPlan asks five speed problems of the checked level", () => {
    const plan = jukuCheckPlan(child(), "speed-units", "7-2", DATE, 1);
    expect(plan.req).toMatchObject({ mode: "S", subtitle: "じゅくの たんげん：チェック" });
    expect(plan.req.problems.map((x) => x.levelId)).toEqual(["7-2", "7-2", "7-2", "7-2", "7-2"]);
  });
});
