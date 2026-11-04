import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { planDay } from "../../src/course/plan";
import { applyPlacementResult, startPlacement, type PlacementState } from "../../src/course/placement";
import { buildLevelSet } from "../../src/course/sets";
import { addDays } from "../../src/domain/dates";
import { freshProgress } from "../../src/domain/progression";
import { scheduleOnMastery } from "../../src/domain/review";
import { LEVELS } from "../../src/domain/spec";
import { resultNotes } from "../../src/features/result/result-text";
import { levelPlan, nextSessionPlan, partLabel, sessionPartPlan } from "../../src/session/requests";
import { newProfile, warmupLevels, yesterdaysMisses } from "../../src/state/profile";
import { reconcileProfile, legacyCourseRecord } from "../../src/state/reconcile";
import { recordSet } from "../../src/state/record-set";
import type { Profile, ProblemResult, SessionDay, SetRun } from "../../src/state/types";

const DATE = "2026-11-04";
const NOW = Date.UTC(2026, 10, 4, 3);
const ctx = { date: DATE, now: NOW };
const star2 = { star2At: "2026-10-20", mode: "S" as const, practiced: true, bestStars: 2 };

function child(): Profile {
  return { ...newProfile("さくら", 4, { id: "p1", now: NOW }), placementDone: true, placementSeen: true };
}

/** a child of the build before the new stages, at `frontier` among the 61 levels of stages 0–5, after the update */
function updated(frontier: string): Profile {
  const core = LEVELS.map((l) => l.id);
  const p = child();
  p.progress = Object.fromEntries(core.slice(0, core.indexOf(frontier)).map((id) => [id, { ...freshProgress(COURSE.level[id]), ...star2 }]));
  p.stageChecks = Object.fromEntries([0, 1, 2, 3, 4].map((s) => [s, { date: "2026-10-20", passed: true }]));
  p.course = legacyCourseRecord(p);
  return reconcileProfile(p);
}

/** a child with every level of the course before `levelId` passed */
function at(levelId: string): Profile {
  const p = child();
  p.progress = Object.fromEntries(COURSE.levels.filter((l) => l.order < COURSE.level[levelId].order).map((l) => [l.id, { ...freshProgress(l), ...star2 }]));
  return p;
}

const answered = (levelId: string, n: number, opts: { wrongFirst?: boolean; latencyMs?: number } = {}): ProblemResult[] =>
  buildLevelSet(levelId, n, 5).map((inst, i) => {
    const wrong = !!opts.wrongFirst && i === 0;
    return { inst, correct: !wrong, given: wrong ? { kind: "dec", v: "1" } : null, latencyMs: opts.latencyMs ?? 1000 };
  });

const checkRun = (levelId: string, part: number, opts: Parameters<typeof answered>[2] & { interrupted?: boolean } = {}): SetRun => ({
  kind: "check",
  mode: "S",
  levelId,
  results: answered(levelId, 5, opts),
  interrupted: !!opts.interrupted,
  activeSec: 5,
  sessionPart: part,
  sessionDate: DATE,
});

describe("the check of new levels in today's practice", () => {
  test("a clean check set gives ★2 (not counted for rewards), and the check goes on with the next level of the stage", () => {
    const p = at("pi-table");
    p.course = { ...p.course, checks: ["pi-table", "pi-shift", "unit-length-weight"] };
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "check" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const plan = sessionPartPlan(p.sessions[DATE].plan[1], 1, p, DATE, false);
    expect(plan?.ctx).toMatchObject({ kind: "check", levelId: "pi-table", inSession: true });
    expect(plan?.req).toMatchObject({ mode: "S", subtitle: "あたらしい レベルの チェック", title: "3.14の だん" });
    expect(plan?.req.problems.length).toBe(5);
    const { profile, summary } = recordSet(p, checkRun("pi-table", 1), ctx);
    expect(profile.progress["pi-table"]).toMatchObject({ star2At: DATE, mode: "S", practiced: true });
    expect(summary.check).toEqual({ levelId: "pi-table", passed: true, stageDone: false, startLevel: null, startMode: null, startNext: false });
    expect(profile.course.checks).toEqual(["pi-shift", "unit-length-weight"]);
    expect(profile.sessions[DATE].done).toBe(1);
    expect(profile.rewardBaseline?.star2).toBe(1);
    // seeds like the diagnosis: one per right answer
    expect(summary.seeds.total).toBe(5);
    expect(sessionPartPlan(profile.sessions[DATE].plan[1], 1, profile, DATE, false)?.ctx.levelId).toBe("pi-shift");
  });

  test("a stumble starts that level at its hint mode and ends today's check; the next stage waits for another day", () => {
    const p = at("pi-table");
    p.course = { ...p.course, checks: ["pi-table", "pi-shift", "unit-length-weight"] };
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "check" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const { profile, summary } = recordSet(p, checkRun("pi-table", 1, { wrongFirst: true }), ctx);
    expect(summary.check).toEqual({ levelId: "pi-table", passed: false, stageDone: true, startLevel: "pi-table", startMode: "H", startNext: true });
    expect(profile.course.checks).toEqual(["unit-length-weight"]);
    expect(profile.sessions[DATE].done).toBe(2);
    expect(profile.errors.map((e) => e.levelId)).toEqual(["pi-table"]);
  });

  test("after a stumble in 小数と分数, later checks skip levels that need it, and a later stumble says that level comes after", () => {
    let p = updated("5-3");
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "check" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    expect(sessionPartPlan(p.sessions[DATE].plan[1], 1, p, DATE, false)?.ctx.levelId).toBe("frac-mixed");
    let r = recordSet(p, checkRun("frac-mixed", 1, { wrongFirst: true }), ctx);
    expect(r.summary.check).toMatchObject({ startLevel: "frac-mixed", startNext: true });
    expect(resultNotes(r.summary)[0].text).toBe("「かぶんすうと たいぶんすう」の ヒントから はじめよう");
    // 3.14 in figures needs 約分, and time needs fractions as decimals: they are met on the way, not checked
    expect(r.profile.course.checks).toEqual(["pi-table", "pi-shift", "pi-two-digit", "pi-divide", "pi-factor", "unit-length-weight", "unit-area", "unit-volume"]);
    p = r.profile;
    const tomorrow = addDays(DATE, 1);
    p.sessions[tomorrow] = { plan: [{ kind: "warmup" }, { kind: "check" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    expect(sessionPartPlan(p.sessions[tomorrow].plan[1], 1, p, tomorrow, false)?.ctx.levelId).toBe("pi-table");
    r = recordSet(p, { ...checkRun("pi-table", 1, { wrongFirst: true }), sessionDate: tomorrow }, { date: tomorrow, now: NOW + 86_400_000 });
    expect(r.summary.check).toMatchObject({ startLevel: "pi-table", startNext: false });
    expect(resultNotes(r.summary)[0].text).toBe("「3.14の だん」は あとで ヒントから れんしゅうしよう");
  });

  test("an interrupted check changes nothing, and the check goes on next time", () => {
    const p = child();
    p.course = { ...p.course, checks: ["pi-table"] };
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "check" }], done: 1, goal: false };
    const { profile } = recordSet(p, checkRun("pi-table", 1, { interrupted: true }), ctx);
    expect([profile.progress["pi-table"], profile.course, profile.sessions[DATE].done]).toEqual([undefined, p.course, 1]);
  });

  test("a child in 受験の技 checks 小数と分数 today, and 円周率 on the next day", () => {
    let p = updated("5-3");
    const plan = planDay({ progress: p.progress, reviews: p.reviews, stageChecks: p.stageChecks, date: DATE, unlockAll: false, checks: p.course.checks });
    expect(plan.slice(0, 2)).toEqual([{ kind: "warmup" }, { kind: "check" }]);
    p.sessions[DATE] = { plan, done: 1, goal: false };
    const asked: string[] = [];
    for (let n = 0; p.sessions[DATE].done === 1; n++) {
      if (n === 20) throw new Error("the check did not end");
      const next = sessionPartPlan(plan[1], 1, p, DATE, false);
      if (!next?.ctx.levelId) throw new Error("no check");
      asked.push(next.ctx.levelId);
      p = recordSet(p, checkRun(next.ctx.levelId, 1), ctx).profile;
    }
    expect(asked).toEqual(COURSE.stage[6].levelIds);
    const tomorrow = addDays(DATE, 1);
    const day: SessionDay = { plan: planDay({ progress: p.progress, reviews: p.reviews, stageChecks: p.stageChecks, date: tomorrow, unlockAll: false, checks: p.course.checks }), done: 1, goal: false };
    expect(day.plan[1]).toEqual({ kind: "check" });
    expect(sessionPartPlan(day.plan[1], 1, p, tomorrow, false)?.ctx.levelId).toBe("pi-table");
  });

  test("a level set of a new stage is judged like any level: ★2, mastery and the review schedule", () => {
    const p = child();
    p.progress["pi-table"] = { ...freshProgress(COURSE.level["pi-table"]), mode: "S", practiced: true, star3Dates: ["2026-11-03"], star2At: "2026-11-03" };
    const run: SetRun = { kind: "main", mode: "S", levelId: "pi-table", results: answered("pi-table", 20, { latencyMs: 500 }), interrupted: false, activeSec: 10 };
    const { profile, summary } = recordSet(p, run, ctx);
    expect(summary.result).toBe("star3");
    expect(summary.events).toContain("mastered");
    expect(profile.reviews).toEqual([scheduleOnMastery("pi-table", DATE)]);
  });

  test("a wrong unreduced fraction is recorded as 約分・形", () => {
    const inst = buildLevelSet("frac-reduce", 1, 3)[0];
    const given = inst.answer.kind === "frac" ? { ...inst.answer, n: inst.answer.n * 2, d: inst.answer.d * 2 } : null;
    const run: SetRun = { kind: "extra", mode: "S", levelId: "frac-reduce", results: [{ inst, correct: false, given, latencyMs: 2000 }], interrupted: false, activeSec: 2 };
    expect(recordSet(child(), run, ctx).profile.errors[0].type).toBe("reduce");
  });

  test("the end of the diagnosis writes the course's levels and keeps records this version does not know", () => {
    const p = child();
    p.progress["future-1"] = { ...freshProgress(COURSE.level["0-1"]), star2At: DATE, masteredAt: DATE, mode: "S" };
    p.reviews = [scheduleOnMastery("future-1", DATE)];
    p.stageChecks[42] = { date: DATE, passed: true };
    const st: PlacementState = { ...startPlacement(4), phase: "mini", stage: 2, miniIndex: 8 };
    p.placement = st;
    p.placementDone = false;
    const run: SetRun = { kind: "placement", mode: "S", levelId: "2-9", placementPhase: "mini", results: answered("2-9", 5, { wrongFirst: true }), interrupted: false, activeSec: 30 };
    const { profile } = recordSet(p, run, ctx);
    expect(profile.placementDone).toBe(true);
    expect(profile.progress["future-1"].masteredAt).toBe(DATE);
    expect(profile.reviews.some((r) => r.levelId === "future-1")).toBe(true);
    expect(profile.stageChecks[42]).toEqual({ date: DATE, passed: true });
    const applied = applyPlacementResult(profile.placement as PlacementState, DATE);
    for (const [id, lp] of Object.entries(applied.progress)) expect(profile.progress[id]).toEqual(lp);
  });

  test("a stage check of a new stage asks its levels, under today's number", () => {
    const p = child();
    const plan = sessionPartPlan({ kind: "stageCheck", stage: 8 }, 1, p, DATE, false);
    expect(plan?.req.title).toBe("ステージ6「3.14の けいさん」");
    expect(plan?.req.problems.length).toBe(12);
    expect(plan?.req.problems.every((x) => x.levelId.startsWith("pi-"))).toBe(true);
    const run: SetRun = { kind: "stage_check", mode: "S", levelId: null, stage: 8, results: (plan?.req.problems ?? []).map((inst) => ({ inst, correct: true, given: null, latencyMs: 1500 })), interrupted: false, activeSec: 20 };
    const { profile, summary } = recordSet(p, run, ctx);
    expect(summary.stageCheck).toEqual({ stage: 8, passed: true });
    expect(profile.stageChecks[8]?.passed).toBe(true);
  });
});

describe("words and plans with today's numbers", () => {
  test("the plan's parts read with today's stage numbers", () => {
    const p = child();
    expect(partLabel({ kind: "check" }, p, false)).toBe("あたらしい レベルの チェック");
    expect(partLabel({ kind: "stageCheck", stage: 5 }, p, false)).toBe("ステージチェック（ステージ8）");
    expect(levelPlan(p, "5-4", "S", DATE, "extra").req).toMatchObject({ title: "×5・×25・×50", subtitle: "スピード・レベル 8-4" });
  });

  test("a saved plan with a part or a stage this version does not have passes over them", () => {
    const p = child();
    const day = { plan: [{ kind: "juku", slot: "frontier" }, { kind: "stageCheck", stage: 42 }, { kind: "slot", slot: "frontier" }], done: 0, goal: false } as unknown as SessionDay;
    const { plan, skipped } = nextSessionPlan(day, p, DATE, false);
    expect(skipped).toEqual([0, 1]);
    expect(plan?.ctx).toMatchObject({ kind: "main", sessionPart: 2 });
    expect(partLabel(day.plan[0], p, false)).toBe("メイン");
  });

  test("reviews of levels this version does not know are not asked", () => {
    const p = child();
    p.reviews = [{ levelId: "future-1", intervalIndex: 0, dueDate: DATE, consecutiveFails: 0 }];
    expect(sessionPartPlan({ kind: "review", levelIds: ["future-1"] }, 3, p, DATE, false)).toBeNull();
  });

  test("yesterday's misses that cannot be made again are left out of the warm-up", () => {
    const p = child();
    const y = addDays(DATE, -1);
    p.errors = [
      { date: y, levelId: "future-1", factKey: "x", type: "fact", problem: { shape: "binary", a: 7, op: "×", b: 8 } },
      { date: y, levelId: "pi-table", factKey: "y", type: "fact", problem: { shape: "juku", type: "nope" } as never },
      { date: y, levelId: "pi-table", factKey: "j:mul:3.14x7", type: "fact", problem: { shape: "juku", type: "op", a: "3.14", op: "×", b: "7" } },
    ];
    expect(yesterdaysMisses(p, DATE).map((i) => i.factKey)).toEqual(["j:mul:3.14x7"]);
  });

  test("the warm-up of a child at 3.14の段 draws from the 円周率 stage", () => {
    const p = child();
    p.progress = Object.fromEntries(COURSE.levels.filter((l) => l.order < COURSE.level["pi-table"].order).map((l) => [l.id, { ...freshProgress(l), ...star2 }]));
    expect(warmupLevels(p, false)).toEqual(["pi-table"]);
    const w = sessionPartPlan({ kind: "warmup" }, 0, p, DATE, false);
    expect(w?.req.problems.length).toBeGreaterThan(0);
    expect(w?.req.problems.every((x) => x.levelId === "pi-table")).toBe(true);
  });
});
