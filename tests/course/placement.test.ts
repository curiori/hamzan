import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { applyMiniCheck, applyPlacementResult, applyStageCheck, miniLevel, startPlacement } from "../../src/course/placement";
import * as dom from "../../src/domain/placement";
import { mulberry32 } from "../../src/domain/rng";
import { CORE, D } from "./records";

const T2 = 2;
const T3 = 1.5;

describe("the diagnosis over stages 0–5 is exactly src/domain's", () => {
  test("every step and the result agree for 200 random runs over grades 1–6", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = mulberry32(seed);
      const grade = r.int(1, 6);
      let a = dom.startPlacement(grade);
      let b = startPlacement(grade, CORE);
      expect(b).toEqual(a);
      for (let step = 0; step < 120 && a.phase !== "done"; step++) {
        const misses = r.pick([0, 0, 0, 0, 1, 2]);
        const sec = r.pick([1, 1.4, 1.8, 2.5]);
        if (a.phase === "stageCheck") {
          a = dom.applyStageCheck(a, misses, sec, T2, T3);
          b = applyStageCheck(b, misses, sec, T2, T3, CORE);
        } else {
          expect(miniLevel(b, CORE)).toBe(dom.miniLevel(a));
          a = dom.applyMiniCheck(a, misses, sec, T2);
          b = applyMiniCheck(b, misses, sec, T2, CORE);
        }
        expect(b).toEqual(a);
      }
      expect(applyPlacementResult(b, D, CORE)).toEqual(dom.applyPlacementResult(a, D));
    }
  });
});

describe("the diagnosis over the one course", () => {
  test("stage checks follow the course order through the new stages to the end", () => {
    let st = startPlacement(5);
    const seen: number[] = [];
    while (st.phase !== "done") {
      seen.push(st.stage);
      st = applyStageCheck(st, 0, 1.8, T2, T3);
    }
    expect(seen).toEqual([3, 4, 6, 8, 7, 5, 9]);
    expect(st.result).toEqual({ frontier: null, mode: "S" });
  });

  test("a stumble on the first level of a stage goes back to the check of the stage before it in the course", () => {
    const at8 = { ...startPlacement(5), stage: 8, checked: [3, 4], passed: [3, 4] };
    const mini = applyStageCheck(at8, 3, 1.8, T2, T3);
    expect(miniLevel(mini)).toBe("pi-table");
    const back = applyMiniCheck(mini, 2, 1.8, T2);
    expect(back).toMatchObject({ stage: 6, phase: "stageCheck", pendingFrontier: { levelId: "pi-table", mode: "H" } });
    expect(applyStageCheck(back, 0, 1.8, T2, T3).result).toEqual({ frontier: "pi-table", mode: "H" });
  });

  test("passing a stage moves on to the next stage the diagnosis has not passed", () => {
    const st = { ...startPlacement(5), stage: 6, checked: [3, 4, 5], passed: [3, 4, 5] };
    let s = applyStageCheck(st, 0, 1.8, T2, T3);
    expect(s.stage).toBe(8);
    s = applyStageCheck(applyStageCheck(s, 0, 1.8, T2, T3), 0, 1.8, T2, T3);
    expect(s.stage).toBe(9);
  });

  test("the result gives ★2 to every level before the frontier in course order", () => {
    const st = { ...startPlacement(5), phase: "done" as const, result: { frontier: "pi-table", mode: "H" as const } };
    const out = applyPlacementResult(st, D);
    expect(out.clearedStages).toEqual([0, 1, 2, 3, 4, 6]);
    for (const l of COURSE.levels) {
      if (l.order < COURSE.level["pi-table"].order) expect(out.progress[l.id]?.star2At).toBe(D);
      else if (l.id !== "pi-table") expect(out.progress[l.id]).toBeUndefined();
    }
    expect(out.progress["pi-table"].mode).toBe("H");
    expect(out.progress["5-1"]).toBeUndefined();
  });
});
