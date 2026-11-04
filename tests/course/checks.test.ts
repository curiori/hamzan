import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { applyCheck, nextCheck, waitingLevels } from "../../src/course/checks";
import { isUnlocked } from "../../src/course/progression";
import { mulberry32 } from "../../src/domain/rng";
import { D, passedBefore, star2, withLevels } from "./records";

const NEW_STAGES = ["frac-mixed", "frac-reduce", "frac-decimal", "pi-table", "pi-shift", "unit-length-weight"];
/** the three new stages placed before 受験の技, in course order */
const BEFORE_JUKEN = [6, 8, 7].flatMap((s) => COURSE.stage[s].levelIds);
/** stages 0–4 passed: where a child in 受験の技 is when the update comes */
const CORE_DONE = passedBefore(COURSE, "frac-mixed");
const args = (levelId: string, errors = 0, perProblemSec = 1) => ({ levelId, errors, perProblemSec, t2: 3, date: D });

describe("checks of new levels", () => {
  test("the check goes stage by stage in course order and skips levels that already have ★2", () => {
    const checks = ["pi-table", "frac-reduce", "frac-mixed"];
    expect(nextCheck({}, checks)).toEqual({ stage: 6, levelId: "frac-mixed" });
    expect(nextCheck(withLevels(COURSE, { "frac-mixed": star2(), "frac-reduce": star2() }), checks)).toEqual({ stage: 8, levelId: "pi-table" });
    expect(waitingLevels({}, checks).map((l) => l.id)).toEqual(["frac-mixed", "frac-reduce", "pi-table"]);
  });

  test("a clean set within T★2 gives ★2 and the check goes on in the same stage", () => {
    const o = applyCheck({}, NEW_STAGES, args("frac-mixed"));
    expect(o.passed).toBe(true);
    expect(o.stageDone).toBe(false);
    expect(o.star2Given).toBe(1);
    expect(o.progress["frac-mixed"]).toMatchObject({ star2At: D, mode: "S", practiced: true, bestStars: 2 });
    expect(o.checks).toEqual(["frac-reduce", "frac-decimal", "pi-table", "pi-shift", "unit-length-weight"]);
  });

  test("the last waiting level of a stage ends the day's check", () => {
    const o = applyCheck({}, ["frac-decimal", "pi-table"], args("frac-decimal"));
    expect(o.stageDone).toBe(true);
    expect(o.checks).toEqual(["pi-table"]);
  });

  test("a stumble with mistakes starts that level at its first mode and drops the rest of its stage from the check", () => {
    const o = applyCheck(CORE_DONE, NEW_STAGES, args("frac-reduce", 2));
    expect(o).toMatchObject({ passed: false, stageDone: true, startLevel: "frac-reduce", star2Given: 0 });
    expect(o.progress["frac-reduce"].mode).toBe("H");
    expect(o.checks).toEqual(["pi-table", "pi-shift", "unit-length-weight"]);
  });

  test("a stumble also takes out the waiting levels of later stages that need a level it took out", () => {
    const o = applyCheck(CORE_DONE, BEFORE_JUKEN, args("frac-mixed", 1));
    // 3.14 in figures needs 約分 (frac-reduce), and time needs fractions as decimals (frac-decimal): met on the way
    expect(o.checks).toEqual(["pi-table", "pi-shift", "pi-two-digit", "pi-divide", "pi-factor", "unit-length-weight", "unit-area", "unit-volume"]);
  });

  test("a check never asks a level that is not open, whatever the child passes or stumbles on", () => {
    const all = [...BEFORE_JUKEN, ...COURSE.stage[9].levelIds];
    for (let seed = 1; seed <= 300; seed++) {
      const r = mulberry32(seed);
      let map = CORE_DONE;
      let checks = all;
      for (let n = 0; n <= all.length; n++) {
        const c = nextCheck(map, checks);
        if (!c) break;
        if (!isUnlocked(map, c.levelId)) throw new Error(`seed ${seed}: ${c.levelId} asked while locked`);
        ({ progress: map, checks } = applyCheck(map, checks, args(c.levelId, r.next() < 0.25 ? 1 : 0)));
      }
    }
  });

  test("slow but right starts at speed, and a level already practised keeps its mode", () => {
    expect(applyCheck({}, NEW_STAGES, args("frac-mixed", 0, 9)).progress["frac-mixed"].mode).toBe("S");
    const practised = withLevels(COURSE, { "frac-mixed": { practiced: true, mode: "H" } });
    expect(applyCheck(practised, NEW_STAGES, args("frac-mixed", 0, 9)).progress["frac-mixed"].mode).toBe("H");
  });
});
