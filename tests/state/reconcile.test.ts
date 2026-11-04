import { describe, expect, test } from "bun:test";
import { buildCourse, COURSE, MANIFEST, SOURCES } from "../../src/course/course";
import { freshProgress, type LevelProgress, type ProgressMap } from "../../src/domain/progression";
import { LEVELS } from "../../src/domain/spec";
import { newProfile, rewardStats } from "../../src/state/profile";
import { legacyCourseRecord, reconcileProfile } from "../../src/state/reconcile";
import type { Profile } from "../../src/state/types";

const D = "2026-11-04";
const NOW = Date.UTC(2026, 10, 4, 3);
const star2 = { star2At: D, mode: "S" as const, practiced: true, bestStars: 2 };
const mastered = { ...star2, masteredAt: D, bestStars: 3 };
const lp = (id: string, patch: Partial<LevelProgress> = {}): LevelProgress => ({ ...freshProgress(COURSE.level[id] ?? COURSE.levels[0]), ...patch });
const core = LEVELS.map((l) => l.id);

/** a child of the build before the new stages: the 61 levels of stages 0–5, everything before `frontier` passed */
function before(frontier: string, extra: Partial<Profile> = {}): Profile {
  const p = { ...newProfile("さくら", 4, { id: "p1", now: NOW }), placementDone: true, placementSeen: true };
  const progress: ProgressMap = Object.fromEntries(core.slice(0, core.indexOf(frontier)).map((id) => [id, lp(id, star2)]));
  const base = { ...p, progress, ...extra };
  return { ...base, course: legacyCourseRecord(base) };
}

const newStageLevels = [6, 8, 7].flatMap((s) => COURSE.stage[s].levelIds);

describe("reconciling records with the course", () => {
  test("a new profile is left as it is, and reconciling twice changes nothing more", () => {
    const fresh = newProfile("さくら", 4, { id: "p1", now: NOW });
    expect(reconcileProfile(fresh)).toEqual(fresh);
    const once = reconcileProfile(before("5-3"));
    expect(reconcileProfile(once)).toEqual(once);
  });

  test("a child in stage 4 meets the new stages ahead and gets no check", () => {
    const p = reconcileProfile(before("4-5"));
    expect(p.course.checks).toEqual([]);
    expect(p.course.seen).toEqual(COURSE.levels.map((l) => l.id));
    expect(p.course.version).toBe(COURSE.version);
  });

  test("a child in 受験の技 gets the 22 levels of the new stages before it checked, in course order", () => {
    expect(reconcileProfile(before("5-3")).course.checks).toEqual(newStageLevels);
  });

  test("levels moved before where the child is, and never practised, are checked too", () => {
    const p = before("5-3");
    // the order the child last saw: stages 0–5, then the new stages after them
    p.course = { version: 1, seen: [...core, ...newStageLevels, ...COURSE.stage[9].levelIds], checks: [] };
    expect(reconcileProfile(p).course.checks).toEqual(newStageLevels);
  });

  test("the ids of the 塾 build move to today's ids everywhere", () => {
    const p = before("4-5", {
      reviews: [{ levelId: "6-1", intervalIndex: 1, dueDate: D, consecutiveFails: 0 }],
      errors: [{ date: D, levelId: "8-1", factKey: "j:mul:3.14x7", type: "fact", problem: { shape: "juku", type: "op", a: "3.14", op: "×", b: "7" } }],
      sets: [{ id: "s1", kind: "extra", levelId: "6-2", mode: "H", date: D, startedAt: NOW, n: 20, errors: 0, perProblemSec: 3, target2: 4, target3: 3, result: "done" }],
      sessions: { [D]: { plan: [{ kind: "warmup" }, { kind: "review", levelIds: ["6-1", "0-1"] }], done: 0, goal: false } },
    });
    p.progress["6-1"] = lp("frac-mixed", mastered);
    p.facts = { "j:mul:3.14x7": { levelId: "8-1", problem: { shape: "juku", type: "op", a: "3.14", op: "×", b: "7" }, attempts: 3, errors: 1, errorDates: [D], lastErrorDate: D, lastSlowDate: null, lastLatencyMs: 2000, lastSeen: D } };
    p.course = { version: 1, seen: [...core, "6-1"], checks: ["6-2"] };
    const q = reconcileProfile(p);
    expect(q.progress["6-1"]).toBeUndefined();
    expect(q.progress["frac-mixed"]?.masteredAt).toBe(D);
    expect(q.reviews.map((r) => r.levelId)).toEqual(["frac-mixed"]);
    expect(q.errors[0].levelId).toBe("pi-table");
    expect(q.facts["j:mul:3.14x7"].levelId).toBe("pi-table");
    expect(q.sets[0].levelId).toBe("frac-reduce");
    expect(q.sessions[D].plan[1]).toEqual({ kind: "review", levelIds: ["frac-mixed", "0-1"] });
    expect(q.course.checks).toEqual(["frac-reduce"]);
    expect(q.course.seen).not.toContain("6-1");
  });

  test("when a level has progress under its old and its new id, the further one stays", () => {
    const p = before("4-5");
    p.progress["6-2"] = lp("frac-reduce", mastered);
    p.progress["frac-reduce"] = lp("frac-reduce", { practiced: true });
    expect(reconcileProfile(p).progress["frac-reduce"]?.masteredAt).toBe(D);
  });

  test("records of levels this version does not know are kept, and the newer course version stays", () => {
    const p = before("4-5", { stageChecks: { 42: { date: D, passed: true } } });
    p.progress["future-1"] = { ...lp("0-1"), star2At: D };
    p.reviews = [{ levelId: "future-1", intervalIndex: 0, dueDate: D, consecutiveFails: 0 }];
    p.course = { version: 9, seen: [...COURSE.levels.map((l) => l.id), "future-1"], checks: ["future-1"] };
    const q = reconcileProfile(p);
    expect(q.progress["future-1"]?.star2At).toBe(D);
    expect(q.reviews).toEqual(p.reviews);
    expect(q.stageChecks[42]).toEqual({ date: D, passed: true });
    expect(q.course).toEqual({ version: 9, seen: [...COURSE.levels.map((l) => l.id), "future-1"], checks: ["future-1"] });
  });

  test("retiring a level keeps its records and the reward counts", () => {
    const stage6 = COURSE.stage[6].levelIds.filter((id) => id !== "frac-mix");
    const retired = buildCourse(
      { ...MANIFEST, version: 3, retiredLevels: ["frac-mix"], stages: MANIFEST.stages.map((s) => (s.id === 6 ? { id: 6, levels: stage6 } : s)) },
      { stages: SOURCES.stages, levels: SOURCES.levels.filter((l) => l.id !== "frac-mix") },
    );
    const p = reconcileProfile(before("5-3"));
    p.progress["frac-mix"] = lp("frac-mix", mastered);
    const q = reconcileProfile(p, retired);
    expect(q.progress["frac-mix"]?.masteredAt).toBe(D);
    expect(rewardStats(q)).toEqual(rewardStats(p));
    // what a retired level reached still counts
    const gone = { ...q, progress: { ...q.progress, "retired-long-ago": lp("0-1", mastered) } };
    expect(rewardStats(gone).mastered).toBe(rewardStats(q).mastered + 1);
  });

  test("a diagnosis under way goes back to a new stage placed before the stage it is at", () => {
    const p = { ...before("0-1"), placementDone: false, progress: {} };
    p.placement = { grade: 4, stage: 5, phase: "stageCheck", miniIndex: 0, checked: [2, 3, 4], passed: [2, 3, 4], masteredStages: [], pendingFrontier: null, result: null, day: D, secondsToday: 60, days: 2 };
    const q = reconcileProfile(p);
    expect(q.placement).toMatchObject({ stage: 6, phase: "stageCheck", miniIndex: 0, checked: [2, 3, 4], passed: [2, 3, 4], pendingFrontier: null });
    expect(q.course.checks).toEqual([]);
  });

  test("a diagnosis at a stage this version does not have goes on with the next stage it has not passed", () => {
    const p = { ...before("0-1"), placementDone: false, progress: {} };
    p.placement = { grade: 4, stage: 42, phase: "mini", miniIndex: 3, checked: [2, 3, 42], passed: [2, 3], masteredStages: [], pendingFrontier: null, result: null, day: D, secondsToday: 0, days: 1 };
    expect(reconcileProfile(p).placement).toMatchObject({ stage: 4, phase: "stageCheck", miniIndex: 0 });
  });
});
