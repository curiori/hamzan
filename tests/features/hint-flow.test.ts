import { describe, expect, test } from "bun:test";
import { makeInstance } from "../../src/domain/generators";
import { scaffoldOf } from "../../src/domain/scaffolds";
import { activeStep, initHint, submitHintStep, type HintState } from "../../src/features/play/hint-flow";

const makeTen = makeInstance("1-4", { shape: "binary", a: 9, op: "+", b: 7 });
const makeTenSc = scaffoldOf("1-4", makeTen.problem);
const estimate = makeInstance("5-9", { shape: "binary", a: 91, op: "÷", b: 13 });
const estimateSc = scaffoldOf("5-9", estimate.problem);

function run(inst: typeof makeTen, sc: typeof makeTenSc, values: number[]) {
  let s: HintState = initHint(sc.steps.length);
  const events: string[] = [];
  let correct: boolean | undefined;
  for (const v of values) {
    const out = submitHintStep(s, inst, sc, v);
    s = out.state;
    events.push(out.event);
    correct = out.correct ?? correct;
  }
  return { s, events, correct };
}

describe("hint flow", () => {
  test("MAKE_TEN 9+7 has the steps 1, 6, 16", () => {
    expect(makeTenSc.steps).toEqual([1, 6, 16]);
  });

  test("right answers fill every step and finish correct", () => {
    const { events, correct } = run(makeTen, makeTenSc, [1, 6, 16]);
    expect(events).toEqual(["next", "next", "done"]);
    expect(correct).toBe(true);
  });

  test("one miss asks again without filling the step", () => {
    const { s, events } = run(makeTen, makeTenSc, [2]);
    expect(events).toEqual(["retry"]);
    expect(s.filled[0]).toBeNull();
    expect([s.tries, s.attempt, s.msg]).toEqual([1, 1, "ちがうよ。もういちど"]);
  });

  test("two misses on a hint step reveal the value and mark the problem missed", () => {
    const { s, events, correct } = run(makeTen, makeTenSc, [2, 3, 6, 16]);
    expect(events).toEqual(["retry", "revealed", "next", "done"]);
    expect(s.revealed[0]).toBe(true);
    expect(s.missed).toBe(true);
    expect(correct).toBe(false);
  });

  test("the revealed value is shown as the message", () => {
    expect(run(makeTen, makeTenSc, [2, 3]).s.msg).toBe("こたえは 1");
  });

  test("a wrong estimate in ESTIMATE_DIVIDE clears the steps and asks again", () => {
    const { s, events } = run(estimate, estimateSc, [6, 78]);
    expect(events).toEqual(["next", "estimateRetry"]);
    expect(s.filled.every((v) => v === null)).toBe(true);
    expect(activeStep(s)).toBe(0);
    expect(s.msg).toBe("13×6＝78。91に ならないね。べつの かずで ためそう");
  });

  test("ESTIMATE_DIVIDE keeps the miss flag across a retry", () => {
    // 6 → product 70 (miss) → 71 (revealed 78, but 78 ≠ 91 so the estimate is retried) → 7 → 91
    const { events, correct } = run(estimate, estimateSc, [6, 70, 71, 7, 91]);
    expect(events).toEqual(["next", "retry", "estimateRetry", "next", "done"]);
    expect(correct).toBe(false);
  });

  test("ESTIMATE_DIVIDE finishes correct when the estimate works", () => {
    const { events, correct } = run(estimate, estimateSc, [7, 91]);
    expect(events).toEqual(["next", "done"]);
    expect(correct).toBe(true);
  });
});
