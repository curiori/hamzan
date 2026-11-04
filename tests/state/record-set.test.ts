import { describe, expect, test } from "bun:test";
import { addDays } from "../../src/domain/dates";
import { COURSE } from "../../src/course/course";
import { applyPlacementResult, miniLevel, startPlacement, type PlacementState } from "../../src/course/placement";
import type { Answer } from "../../src/domain/problem";
import { freshProgress, type LevelProgress } from "../../src/domain/progression";
import { applyReview, scheduleOnMastery } from "../../src/domain/review";
import type { SessionPart } from "../../src/domain/session";
import { buildSet } from "../../src/domain/setBuilder";
import { LEVEL, RULE_NUMBERS, SPEC } from "../../src/domain/spec";
import { newProfile } from "../../src/state/profile";
import { recordSet } from "../../src/state/record-set";
import type { FactStat, Profile, ProblemResult, SetAttempt, SetRun } from "../../src/state/types";

const DATE = "2026-10-29";
const NOW = Date.UTC(2026, 9, 29, 3);
const ctx = (date = DATE) => ({ date, now: NOW });

const wrongAnswer = (a: Answer): Answer =>
  a.kind === "number" ? { kind: "number", value: a.value + 1 } : a.kind === "divRem" ? { ...a, remainder: a.remainder + 1 } : { kind: "bool", value: !a.value };

function results(levelId: string, n: number, opts: { wrong?: number[]; latencyMs?: number; seed?: number } = {}): ProblemResult[] {
  return buildSet(levelId, n, opts.seed ?? 7).map((inst, i) => {
    const wrong = opts.wrong?.includes(i) ?? false;
    return { inst, correct: !wrong, given: wrong ? wrongAnswer(inst.answer) : null, latencyMs: opts.latencyMs ?? 100 };
  });
}

function mkRun(r: Pick<SetRun, "kind" | "mode" | "levelId" | "results"> & Partial<SetRun>): SetRun {
  return { interrupted: false, activeSec: 10, ...r };
}

function profileWith(levels: Record<string, Partial<LevelProgress>> = {}): Profile {
  const p = newProfile("t", 4, { id: "p1", now: NOW });
  for (const [id, lp] of Object.entries(levels)) p.progress[id] = { ...freshProgress(LEVEL[id]), ...lp };
  return p;
}

const sSet = (levelId = "1-1", opts: Parameters<typeof results>[2] = {}) =>
  mkRun({ kind: "main", mode: "S", levelId, results: results(levelId, LEVEL[levelId].setSize, opts) });

describe("recordSet", () => {
  test("an S set with no mistakes under T★3 gives star3 and the first ★2", () => {
    const { profile, summary } = recordSet(profileWith({ "1-1": { mode: "S", practiced: true } }), sSet(), ctx());
    expect(summary.result).toBe("star3");
    expect(summary.stars).toBe(3);
    expect(summary.events).toContain("star2");
    expect(profile.progress["1-1"].star2At).toBe(DATE);
  });

  test("one wrong answer gives retry and records the mistake", () => {
    const { profile, summary } = recordSet(profileWith({ "1-1": { mode: "S", practiced: true } }), sSet("1-1", { wrong: [0] }), ctx());
    expect(summary.result).toBe("retry");
    expect(summary.stars).toBe(0);
    expect(summary.errors).toBe(1);
    expect(profile.errors.map((e) => e.levelId)).toEqual(["1-1"]);
  });

  test("an interrupted set keeps progress but is logged as interrupted", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    const { profile, summary } = recordSet(p, { ...sSet(), interrupted: true }, ctx());
    expect(summary.result).toBe("interrupted");
    expect(profile.progress["1-1"]).toEqual(p.progress["1-1"]);
    expect(profile.sets.at(-1)?.result).toBe("interrupted");
  });

  test("★3 on different dates masters the level and schedules the first review", () => {
    let p = profileWith({ "1-1": { mode: "S", practiced: true } });
    const days = SPEC.rules.stars.mastery.star3OnDistinctLocalDates;
    let date = DATE;
    for (let d = 0; d < days; d++) {
      date = addDays(DATE, d);
      p = recordSet(p, sSet(), ctx(date)).profile;
    }
    expect(p.progress["1-1"].masteredAt).toBe(date);
    expect(p.reviews).toEqual([scheduleOnMastery("1-1", date)]);
  });

  test("failed reviews in a row demote the level", () => {
    let p = profileWith({ "1-1": { mode: "S", practiced: true, star2At: DATE, star3Dates: [DATE], masteredAt: DATE, bestStars: 3 } });
    p.reviews = [scheduleOnMastery("1-1", DATE)];
    const n = SPEC.rules.spacedReview.problemsPerLevel;
    const fails = SPEC.rules.spacedReview.demoteAfterConsecutiveFails;
    let last = null as ReturnType<typeof recordSet> | null;
    for (let i = 0; i < fails; i++) {
      last = recordSet(p, mkRun({ kind: "review", mode: "S", levelId: null, results: results("1-1", n, { wrong: [0] }) }), ctx(addDays(DATE, i + 1)));
      p = last.profile;
    }
    expect(last?.summary.reviews).toEqual([{ levelId: "1-1", passed: false, demoted: true }]);
    expect(p.progress["1-1"].masteredAt).toBeNull();
    expect(p.reviews).toEqual([]);
  });

  test("a failed stage check marks the most-missed ★2 level as priority", () => {
    const star2 = { mode: "S" as const, practiced: true, star2At: DATE };
    const p = profileWith(Object.fromEntries(["0-1", "0-2", "0-3", "0-4", "0-5"].map((id) => [id, star2])));
    const rs = [...results("0-1", 5, { wrong: [0] }), ...results("0-2", 5, { wrong: [0, 1] })];
    const { profile, summary } = recordSet(p, mkRun({ kind: "stage_check", mode: "S", levelId: null, stage: 0, results: rs }), ctx());
    expect(summary.stageCheck).toEqual({ stage: 0, passed: false });
    expect(profile.stageChecks[0]).toEqual({ date: DATE, passed: false });
    expect(profile.progress["0-2"].priority).toBe(true);
    expect(profile.progress["0-1"].priority).toBe(false);
  });

  test("finishing the last session part reaches the goal once", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const first = recordSet(p, { ...sSet(), sessionPart: 1 }, ctx());
    expect(first.summary.goalReached).toBe(true);
    expect(first.profile.sessions[DATE]).toEqual({ plan: p.sessions[DATE].plan, done: 2, goal: true });
    expect(recordSet(first.profile, { ...sSet(), sessionPart: 1 }, ctx()).summary.goalReached).toBe(false);
  });

  test("a session part from yesterday does not advance today's session", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    const yesterday = addDays(DATE, -1);
    p.sessions[yesterday] = { plan: [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }], done: 0, goal: false };
    const { profile, summary } = recordSet(p, { ...sSet(), sessionPart: 0, sessionDate: yesterday }, ctx());
    expect(profile.sessions[DATE]).toBeUndefined();
    expect(profile.sessions[yesterday]).toEqual({ ...p.sessions[yesterday], done: 1 });
    expect(summary.goalReached).toBe(false);
  });

  test("a set from yesterday's session finishes yesterday even when today's session exists", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    const yesterday = addDays(DATE, -1);
    const plan = [{ kind: "warmup" as const }, { kind: "slot" as const, slot: "frontier" as const }];
    p.sessions[yesterday] = { plan, done: 1, goal: false };
    p.sessions[DATE] = { plan, done: 0, goal: false };
    const { profile, summary } = recordSet(p, { ...sSet(), sessionPart: 1, sessionDate: yesterday }, ctx());
    expect(profile.sessions[DATE]).toEqual({ plan, done: 0, goal: false });
    expect(profile.sessions[yesterday]).toEqual({ plan, done: 2, goal: true });
    expect(summary.goalReached).toBe(true);
  });

  test("an interrupted last part reaches the goal once and pays only the goal", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const run = { ...sSet(), sessionPart: 1, interrupted: true };
    const first = recordSet(p, run, ctx());
    expect(first.summary.result).toBe("interrupted");
    expect(first.summary.goalReached).toBe(true);
    expect(first.summary.seeds.lines).toEqual([{ kind: "goal", seeds: 20 }]);
    expect(first.profile.wallet.seeds).toBe(p.wallet.seeds + 20);
    expect(first.profile.ledger.at(-1)).toEqual({ at: NOW, date: DATE, delta: 20, reason: "set", ref: "main" });
    const again = recordSet(first.profile, run, ctx());
    expect(again.summary.goalReached).toBe(false);
    expect(again.summary.seeds.lines.map((l) => l.kind)).not.toContain("goal");
    expect(again.profile.wallet.seeds).toBe(first.profile.wallet.seeds);
  });

  test("parts left with nothing to ask are passed, so the set before them reaches the goal", () => {
    // no review item is left for 1-1, so the review part has nothing to ask
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    const plan: SessionPart[] = [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }, { kind: "review", levelIds: ["1-1"] }];
    p.sessions[DATE] = { plan, done: 1, goal: false };
    const { profile, summary } = recordSet(p, { ...sSet(), sessionPart: 1 }, ctx());
    expect(profile.sessions[DATE]).toEqual({ plan, done: 3, goal: true });
    expect(summary.goalReached).toBe(true);
    expect(summary.seeds.lines).toContainEqual({ kind: "goal", seeds: 20 });
  });

  test("a later part with something to ask keeps the goal for later", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    p.reviews = [scheduleOnMastery("1-1", DATE, 0)];
    const plan: SessionPart[] = [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }, { kind: "review", levelIds: ["1-1"] }];
    p.sessions[DATE] = { plan, done: 1, goal: false };
    const { profile, summary } = recordSet(p, { ...sSet(), sessionPart: 1 }, ctx());
    expect(profile.sessions[DATE]).toEqual({ plan, done: 2, goal: false });
    expect(summary.goalReached).toBe(false);
    expect(summary.seeds.lines.map((l) => l.kind)).not.toContain("goal");
  });

  test("the first clean set unlocks the bowl reward", () => {
    const p = profileWith({ "0-1": { mode: "H", practiced: true } });
    const run = mkRun({ kind: "main", mode: "H", levelId: "0-1", results: results("0-1", LEVEL["0-1"].setSize) });
    expect(recordSet(p, run, ctx()).summary.newRewards).toEqual(["bowl"]);
  });

  test("history is capped: 600 sets, 4000 facts, errors within 60 days", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    const attempt: SetAttempt = { id: "old", kind: "extra", levelId: "1-1", mode: "S", date: "2026-01-01", startedAt: 0, n: 1, errors: 1, perProblemSec: 1, target2: 1, target3: 1, result: "retry" };
    p.sets = Array.from({ length: 600 }, (_, i) => ({ ...attempt, id: `old${i}` }));
    const fact: FactStat = { levelId: "9-9", problem: { shape: "half", n: 2 }, attempts: 1, errors: 0, errorDates: [], lastErrorDate: null, lastSlowDate: null, lastLatencyMs: null, lastSeen: "2026-01-01" };
    for (let i = 0; i < 4000; i++) p.facts[`old:${i}`] = fact;
    const problem = { shape: "half" as const, n: 4 };
    p.errors = [
      { date: addDays(DATE, -61), levelId: "1-1", factKey: "x", type: "fact", problem },
      { date: addDays(DATE, -60), levelId: "1-1", factKey: "y", type: "fact", problem },
    ];
    const run = sSet();
    const { profile } = recordSet(p, run, ctx());
    expect(profile.sets.length).toBe(600);
    expect(profile.sets.at(-1)?.levelId).toBe("1-1");
    expect(Object.keys(profile.facts).length).toBe(4000);
    for (const r of run.results) expect(profile.facts[r.inst.factKey]).toBeDefined();
    expect(profile.errors.map((e) => e.factKey)).toEqual(["y"]);
  });

  test("recordSet leaves its input untouched", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    p.sessions[DATE] = { plan: [{ kind: "slot", slot: "frontier" }], done: 0, goal: false };
    const before = JSON.stringify(p);
    recordSet(p, { ...sSet("1-1", { wrong: [1] }), sessionPart: 0 }, ctx());
    expect(JSON.stringify(p)).toBe(before);
  });

  test("a stage check passes with at most stageCheckMaxMisses misses", () => {
    const star2 = { mode: "S" as const, practiced: true, star2At: DATE };
    const p = profileWith(Object.fromEntries(["0-1", "0-2", "0-3", "0-4", "0-5"].map((id) => [id, star2])));
    const rs = results("0-1", 6, { wrong: Array.from({ length: RULE_NUMBERS.stageCheckMaxMisses }, (_, i) => i) });
    const { summary } = recordSet(p, mkRun({ kind: "stage_check", mode: "S", levelId: null, stage: 0, results: rs }), ctx());
    expect(summary.stageCheck).toEqual({ stage: 0, passed: true });
  });
});

describe("recordSet: diagnosis, challenge and reviews", () => {
  test("the set that finishes the diagnosis applies its result and marks it done", () => {
    // the child knows the levels before 3-3: stage 2's check passes fast enough to count as mastered, stage 3's check
    // fails, and the mini checks of stage 3 pass 3-1 and 3-2 and stop at 3-3
    const knows = (levelId: string) => LEVEL[levelId].order < LEVEL["3-3"].order;
    const diagnosisSet = (st: PlacementState): SetRun => {
      const phase = st.phase === "mini" ? "mini" : "stageCheck";
      const levelId = phase === "mini" ? miniLevel(st) : null;
      const levelIds = levelId ? [levelId] : COURSE.stage[st.stage].stageCheck.levels;
      // five problems of each level the set asks about; one of them is missed when the child does not know the level
      const rs = levelIds.flatMap((id) => results(id, RULE_NUMBERS.miniCheckProblems, { wrong: knows(id) ? [] : [0] }));
      return mkRun({ kind: "placement", mode: "S", levelId, placementPhase: phase, results: rs });
    };
    let p = profileWith();
    p.placement = startPlacement(4);
    let last = null as ReturnType<typeof recordSet> | null;
    for (let sets = 0; p.placement && p.placement.phase !== "done"; sets++) {
      if (sets === 40) throw new Error("the diagnosis did not finish within 40 sets");
      expect(p.placementDone).toBe(false);
      last = recordSet(p, diagnosisSet(p.placement), ctx());
      p = last.profile;
    }
    const end = last?.summary.placement;
    expect(end?.phase).toBe("done");
    expect(end).toMatchObject({ masteredStages: [2], result: { frontier: "3-3", mode: "H" } });
    expect(p.placementDone).toBe(true);
    const applied = applyPlacementResult(end!, DATE);
    expect(p.progress).toEqual(applied.progress);
    expect(p.reviews).toEqual(applied.reviews);
  });

  test("an interrupted diagnosis set adds its time but does not move the diagnosis on", () => {
    const before: PlacementState = { ...startPlacement(4), phase: "mini", miniIndex: 1, day: DATE, secondsToday: 100 };
    const p = profileWith();
    p.placement = before;
    const levelId = miniLevel(before);
    const rs = results(levelId, RULE_NUMBERS.miniCheckProblems, { wrong: [0] });
    const run = mkRun({ kind: "placement", mode: "S", levelId, placementPhase: "mini", results: rs, interrupted: true, activeSec: 30 });
    // judged, the miss in this mini check would end the diagnosis
    expect(recordSet(p, { ...run, interrupted: false }, ctx()).profile.placementDone).toBe(true);
    const { profile } = recordSet(p, run, ctx());
    expect(profile.placement?.phase).toBe(before.phase);
    expect(profile.placementDone).toBe(false);
    expect(profile.placement?.secondsToday).toBe(before.secondsToday + 30);
  });

  test("a clean challenge sets the best, and a slower, wrong or interrupted one keeps it", () => {
    const n = SPEC.rules.dailySession.weeklyChallenge.problems;
    const challenge = (latencyMs: number, wrong: number[] = []) =>
      mkRun({ kind: "challenge", mode: "S", levelId: null, results: results("1-1", n, { latencyMs, wrong }) });
    const first = recordSet(profileWith(), challenge(1500), ctx());
    expect(first.summary.challengeBest).toEqual({ sec: 1.5, isNew: true });
    expect(first.profile.challenge).toEqual({ lastDate: DATE, bestSec: 1.5 });
    for (const run of [challenge(2000), challenge(1000, [0]), { ...challenge(1000), interrupted: true }]) {
      const { profile, summary } = recordSet(first.profile, run, ctx());
      expect(summary.challengeBest).toEqual({ sec: 1.5, isNew: false });
      expect(profile.challenge.lastDate).toBe(DATE);
    }
  });

  test("a passed review keeps the mastery and moves the review to its next date", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true, star2At: DATE, star3Dates: [DATE], masteredAt: DATE, bestStars: 3 } });
    const item = scheduleOnMastery("1-1", DATE);
    p.reviews = [item];
    const n = SPEC.rules.spacedReview.problemsPerLevel;
    const run = mkRun({ kind: "review", mode: "S", levelId: null, results: results("1-1", n, { latencyMs: 100 }) });
    const { profile, summary } = recordSet(p, run, ctx(item.dueDate));
    expect(summary.reviews).toEqual([{ levelId: "1-1", passed: true, demoted: false }]);
    expect(profile.reviews).toEqual([applyReview(item, true, item.dueDate).item]);
    expect(profile.progress["1-1"].masteredAt).toBe(DATE);
    expect(summary.seeds.lines).toEqual([{ kind: "review", seeds: 5 }]);
  });
});

describe("seeds", () => {
  const hintSet = (kind: SetRun["kind"], n = 10) => mkRun({ kind, mode: "H", levelId: "1-1", results: results("1-1", n) });

  test("a session set pays seeds into the wallet and logs one line", () => {
    const p = profileWith({ "1-1": { mode: "H", practiced: true } });
    p.sessions[DATE] = { plan: [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }, { kind: "slot", slot: "frontier" }], done: 1, goal: false };
    const { profile, summary } = recordSet(p, { ...hintSet("main"), sessionPart: 1 }, ctx());
    expect(summary.seeds).toEqual({
      lines: [
        { kind: "correct", seeds: 10, count: 10 },
        { kind: "complete", seeds: 5 },
      ],
      total: 15,
      capped: false,
    });
    expect(profile.wallet.seeds).toBe(15);
    expect(profile.ledger.at(-1)).toEqual({ at: NOW, date: DATE, delta: 15, reason: "set", ref: "main" });
  });

  test("free practice at the cap pays only milestones and says it was capped", () => {
    const p = profileWith({ "1-1": { mode: "S", practiced: true } });
    p.wallet = { ...p.wallet, day: DATE, earnedToday: 50 };
    const { profile, summary } = recordSet(p, { ...sSet(), kind: "extra" }, ctx());
    expect(summary.seeds.lines.map((l) => l.kind)).toEqual(["star2", "personalBest"]);
    expect(summary.seeds.capped).toBe(true);
    expect(profile.wallet.seeds).toBe(15);
    expect(profile.wallet.earnedToday).toBe(50);
  });

  test("a free practice set that ends after midnight counts for the new day", () => {
    const p = profileWith({ "1-1": { mode: "H", practiced: true } });
    p.wallet = { ...p.wallet, day: addDays(DATE, -1), earnedToday: 50 };
    const { profile, summary } = recordSet(p, hintSet("extra"), ctx());
    expect(summary.seeds.total).toBe(5 + 2);
    expect(profile.wallet.day).toBe(DATE);
    expect(profile.wallet.earnedToday).toBe(7);
  });

  test("the first clean set places the bowl in its default slot", () => {
    const p = profileWith({ "0-1": { mode: "H", practiced: true } });
    const run = mkRun({ kind: "main", mode: "H", levelId: "0-1", results: results("0-1", LEVEL["0-1"].setSize) });
    expect(recordSet(p, run, ctx()).profile.room.layout).toEqual({ floorS3: "bowl" });
  });

  test("a new reward good takes a slot held only by a good the child no longer has", () => {
    const p = profileWith({ "0-1": { mode: "H", practiced: true } });
    p.inventory = { ball: 1, cushion: 1 };
    p.room = { ...p.room, layout: { floorS1: "blocks", floorS2: "ball", floorS3: "cushion" } };
    const run = mkRun({ kind: "main", mode: "H", levelId: "0-1", results: results("0-1", LEVEL["0-1"].setSize) });
    expect(recordSet(p, run, ctx()).profile.room.layout).toEqual({ floorS1: "bowl", floorS2: "ball", floorS3: "cushion" });
  });

  test("a set that brings no new room good leaves the saved room as it was", () => {
    const p = profileWith({ "1-1": { mode: "H", practiced: true } });
    // an earlier clean set already brought the bowl, so this set brings nothing new
    p.sets = [{ id: "old", kind: "extra", levelId: "1-1", mode: "H", date: "2026-10-01", startedAt: 0, n: 10, errors: 0, perProblemSec: 2, target2: 3, target3: 2, result: "done" }];
    p.room = { ...p.room, layout: { floorS1: "blocks" } };
    const { profile, summary } = recordSet(p, hintSet("extra"), ctx());
    expect(summary.newRewards).toEqual([]);
    expect(profile.room.layout).toEqual({ floorS1: "blocks" });
  });

  test("the ledger keeps the last 300 lines", () => {
    const p = profileWith({ "1-1": { mode: "H", practiced: true } });
    p.ledger = Array.from({ length: 300 }, (_, i) => ({ at: i, date: DATE, delta: 1, reason: "gift" as const }));
    const { profile } = recordSet(p, hintSet("extra"), ctx());
    expect(profile.ledger).toHaveLength(300);
    expect(profile.ledger[0].at).toBe(1);
    expect(profile.ledger.at(-1)?.delta).toBe(7);
  });
});
