import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { applyCheck, nextCheck, waitingLevels } from "../../src/course/checks";
import { D, star2, withLevels } from "./records";

const NEW_STAGES = ["frac-mixed", "frac-reduce", "frac-decimal", "pi-table", "pi-shift", "unit-length-weight"];
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
    const o = applyCheck({}, NEW_STAGES, args("frac-reduce", 2));
    expect(o).toMatchObject({ passed: false, stageDone: true, startLevel: "frac-reduce", star2Given: 0 });
    expect(o.progress["frac-reduce"].mode).toBe("H");
    expect(o.checks).toEqual(["pi-table", "pi-shift", "unit-length-weight"]);
  });

  test("slow but right starts at speed, and a level already practised keeps its mode", () => {
    expect(applyCheck({}, NEW_STAGES, args("frac-mixed", 0, 9)).progress["frac-mixed"].mode).toBe("S");
    const practised = withLevels(COURSE, { "frac-mixed": { practiced: true, mode: "H" } });
    expect(applyCheck(practised, NEW_STAGES, args("frac-mixed", 0, 9)).progress["frac-mixed"].mode).toBe("H");
  });
});
