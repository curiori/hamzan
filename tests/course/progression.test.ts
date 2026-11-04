import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { dueCourseReviews, frontier, levelStatus, pendingList, practiceTarget, resolveSlot, stageCheckDue } from "../../src/course/progression";
import * as dom from "../../src/domain/progression";
import { dueReviews } from "../../src/domain/review";
import { resolveSlot as domResolveSlot, stageCheckDue as domStageCheckDue } from "../../src/domain/session";
import { CORE, D, passedBefore, randomRecords, withLevels } from "./records";

describe("progression over stages 0–5 is exactly src/domain's", () => {
  test("frontier, pending, practice target, stage checks and slots agree on 300 random records", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { progress, stageChecks } = randomRecords(CORE, seed);
      for (const unlockAll of [false, true]) {
        const opts = { course: CORE, unlockAll };
        expect(frontier(progress, opts)?.id ?? null).toBe(dom.frontier(progress, unlockAll)?.id ?? null);
        expect(practiceTarget(progress, opts)).toEqual(
          dom.practiceTarget(progress, unlockAll) ? { level: CORE.level[dom.practiceTarget(progress, unlockAll)!.level.id], reason: dom.practiceTarget(progress, unlockAll)!.reason } : null,
        );
        expect(resolveSlot("frontier", progress, opts)).toEqual(domResolveSlot("frontier", progress, unlockAll));
        expect(resolveSlot("pending", progress, opts)).toEqual(domResolveSlot("pending", progress, unlockAll));
        for (const l of CORE.levels) expect(levelStatus(progress, l.id, opts)).toBe(dom.statusOf(progress, l.id, unlockAll));
      }
      expect(pendingList(progress, { course: CORE }).map((l) => l.id)).toEqual(dom.pendingList(progress).map((l) => l.id));
      expect(stageCheckDue(progress, stageChecks, CORE)).toBe(domStageCheckDue(progress, stageChecks));
    }
  });
});

describe("progression over the one course", () => {
  test("the frontier follows the course order: after stage 4 comes 小数と分数, then 円周率", () => {
    expect(frontier(passedBefore(COURSE, "frac-mixed"))?.id).toBe("frac-mixed");
    expect(frontier(passedBefore(COURSE, "pi-table"))?.id).toBe("pi-table");
    expect(frontier(passedBefore(COURSE, "5-1"))?.id).toBe("5-1");
  });

  test("the frontier skips levels waiting for their check", () => {
    const progress = passedBefore(COURSE, "frac-mixed");
    expect(frontier(progress, { waiting: ["frac-mixed"] })?.id).toBe("frac-reduce");
    // frac-decimal needs frac-reduce, which is still waiting without ★2
    expect(frontier(progress, { waiting: ["frac-mixed", "frac-reduce"] })?.id).toBe("dec-multiply");
  });

  test("new levels open with their prerequisites like every level", () => {
    expect(levelStatus({}, "pi-table")).toBe("locked");
    const ready = withLevels(COURSE, { "2-5": { star2At: D }, "4-8": { star2At: D } });
    expect(levelStatus(ready, "pi-table")).toBe("available");
  });

  test("reviews of levels the course does not have are passed over and take no place of the day", () => {
    const reviews = [
      { levelId: "gone-a", intervalIndex: 0, dueDate: "2026-11-01", consecutiveFails: 0 },
      { levelId: "gone-b", intervalIndex: 0, dueDate: "2026-11-01", consecutiveFails: 0 },
      { levelId: "0-1", intervalIndex: 0, dueDate: D, consecutiveFails: 0 },
      { levelId: "pi-table", intervalIndex: 0, dueDate: D, consecutiveFails: 0 },
    ];
    expect(dueCourseReviews(reviews, D).map((r) => r.levelId)).toEqual(dueReviews(reviews.slice(2), D).map((r) => r.levelId));
  });
});
