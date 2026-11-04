import { describe, expect, test } from "bun:test";
import { freshProgress, type ProgressMap } from "../../src/domain/progression";
import { LEVEL } from "../../src/domain/spec";
import { JLEVEL } from "../../src/juku/spec";
import {
  applyCheck,
  closeUnit,
  emptyJuku,
  jukuFrontier,
  jukuPendingList,
  jukuStageCheckDue,
  jukuStatus,
  jukuTarget,
  nextCheck,
  openUnit,
  resolveJukuSlot,
} from "../../src/juku/track";

const D = "2026-11-04";
const spec = (id: string) => LEVEL[id] ?? JLEVEL[id];
const withLevels = (levels: Record<string, Partial<ReturnType<typeof freshProgress>>>): ProgressMap =>
  Object.fromEntries(Object.entries(levels).map(([id, lp]) => [id, { ...freshProgress(spec(id)), ...lp }]));

describe("opening units", () => {
  test("an opened unit waits for its check; closing it takes it out of practice and the queue", () => {
    const j = openUnit(emptyJuku(), "pi-cylinder", D, {});
    expect(j).toEqual({ open: { "pi-cylinder": D }, checks: ["pi-cylinder"] });
    expect(nextCheck({}, j)).toEqual({ unitId: "pi-cylinder", levelId: "8-1" });
    expect(closeUnit(j, "pi-cylinder")).toEqual(emptyJuku());
  });

  test("checks queue in the unit order, and a unit whose levels all have ★2 needs no check", () => {
    let j = openUnit(emptyJuku(), "speed-units", D, {});
    j = openUnit(j, "pi-cylinder", D, {});
    expect(j.checks).toEqual(["pi-cylinder", "speed-units"]);
    const done = withLevels({ "7-7": { star2At: D } });
    expect(openUnit(emptyJuku(), "unit-mix", D, done).checks).toEqual([]);
  });

  test("juku levels stay locked until their unit opens; ★2 levels show as ★2 even when closed", () => {
    expect(jukuStatus({}, emptyJuku(), "8-1")).toBe("locked");
    expect(jukuStatus({}, emptyJuku(), "8-1", true)).toBe("available");
    const j = openUnit(emptyJuku(), "pi-cylinder", D, {});
    expect(jukuStatus({}, j, "8-1")).toBe("available");
    expect(jukuStatus(withLevels({ "8-1": { star2At: D } }), emptyJuku(), "8-1")).toBe("star2");
  });
});

describe("the starting check", () => {
  test("a clean, fast check gives ★2 and goes on to the next level of the unit", () => {
    const j = openUnit(emptyJuku(), "pi-cylinder", D, {});
    const o = applyCheck({}, j, { unitId: "pi-cylinder", levelId: "8-1", errors: 0, perProblemSec: 2, t2: 3, date: D });
    expect(o.passed).toBe(true);
    expect(o.unitDone).toBe(false);
    expect(o.star2Given).toBe(1);
    expect(o.progress["8-1"]).toMatchObject({ star2At: D, mode: "S", practiced: true, bestStars: 2 });
    expect(nextCheck(o.progress, o.juku)).toEqual({ unitId: "pi-cylinder", levelId: "8-2" });
  });

  test("a mistake starts the level in hint mode; only slow starts it in speed mode; the unit's check ends", () => {
    const j = openUnit(emptyJuku(), "pi-cylinder", D, {});
    const miss = applyCheck({}, j, { unitId: "pi-cylinder", levelId: "8-1", errors: 1, perProblemSec: 2, t2: 3, date: D });
    expect([miss.passed, miss.unitDone, miss.startLevel, miss.progress["8-1"].mode, miss.juku.checks]).toEqual([false, true, "8-1", "H", []]);
    const slow = applyCheck({}, j, { unitId: "pi-cylinder", levelId: "8-1", errors: 0, perProblemSec: 9, t2: 3, date: D });
    expect(slow.progress["8-1"].mode).toBe("S");
  });

  test("a level the child already practised keeps its mode after a stumble", () => {
    const map = withLevels({ "8-1": { practiced: true, mode: "S" } });
    const j = openUnit(emptyJuku(), "pi-cylinder", D, map);
    expect(applyCheck(map, j, { unitId: "pi-cylinder", levelId: "8-1", errors: 3, perProblemSec: 2, t2: 3, date: D }).progress["8-1"].mode).toBe("S");
  });

  test("passing the last level ends the unit's check", () => {
    const map = withLevels({ "8-1": { star2At: D }, "8-2": { star2At: D }, "8-3": { star2At: D } });
    const j = openUnit(emptyJuku(), "pi-cylinder", D, map);
    const o = applyCheck(map, j, { unitId: "pi-cylinder", levelId: "8-4", errors: 0, perProblemSec: 1, t2: 3, date: D });
    expect([o.unitDone, o.juku.checks, nextCheck(o.progress, o.juku)]).toEqual([true, [], null]);
  });
});

describe("practice in opened units", () => {
  const j = { open: { "pi-cylinder": D }, checks: [] };

  test("frontier, then pending, in the order of the levels", () => {
    const map = withLevels({ "8-1": { star2At: "2026-11-01", mode: "S" }, "8-2": { star2At: "2026-10-30", mode: "S" } });
    expect(jukuFrontier(map, j)?.id).toBe("8-3");
    expect(jukuPendingList(map, j).map((l) => l.id)).toEqual(["8-2", "8-1"]);
    expect(resolveJukuSlot("frontier", map, j)).toEqual({ levelId: "8-3", mode: "H", reason: "frontier" });
    expect(resolveJukuSlot("pending", map, j)).toEqual({ levelId: "8-2", mode: "S", reason: "pending" });
  });

  test("after five speed sets without ★2 practice goes back to an unmastered prerequisite, core levels included", () => {
    const map = withLevels({ "8-1": { mode: "S", practiced: true, speedSetsWithoutStar2: 5 } });
    expect(jukuTarget(map, j)).toMatchObject({ level: { id: "2-5" }, reason: "prerequisite" });
    // 九九 with no ★2 starts where it stands (speed only: 2-5 has no hint mode)
    expect(resolveJukuSlot("frontier", map, j)).toEqual({ levelId: "2-5", mode: "S", reason: "prerequisite" });
    const mastered = { ...map, ...withLevels({ "2-5": { masteredAt: D, star2At: D }, "3-10": { masteredAt: D, star2At: D } }) };
    expect(jukuTarget(mastered, j)).toMatchObject({ level: { id: "8-1" }, reason: "frontier" });
  });

  test("closed units are not practised, and a stage check is due when a whole juku stage has ★2", () => {
    const map = withLevels({ "8-1": { star2At: D } });
    expect(resolveJukuSlot("frontier", map, emptyJuku())).toBeNull();
    const all = withLevels(Object.fromEntries(["9-1", "9-2", "9-3", "9-4", "9-5", "9-6"].map((id) => [id, { star2At: D }])));
    expect(jukuStageCheckDue(all, {})).toBe(9);
    expect(jukuStageCheckDue(all, { 9: { date: D, passed: true } })).toBeNull();
  });
});
