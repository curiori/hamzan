import { describe, expect, test } from "bun:test";
import { buildSet } from "../../src/domain/setBuilder";
import { advance, answerCurrent, currentItem, firstAnswered, initQueue, isFinished } from "../../src/features/play/play-queue";

const problems = buildSet("1-1", 3, 1);
const right = { correct: true, given: null, latencyMs: 800 };
const wrong = { correct: false, given: { kind: "number" as const, value: 99 }, latencyMs: 900 };

describe("play queue", () => {
  test("a set starts at the first problem with nothing recorded", () => {
    const q = initQueue(problems);
    expect(currentItem(q)).toEqual({ inst: problems[0], requeue: false });
    expect([q.pos, q.results.length, isFinished(q)]).toEqual([0, 0, false]);
  });

  test("a right answer is recorded once and the set moves on", () => {
    const q = advance(answerCurrent(initQueue(problems), right, false));
    expect(q.results).toEqual([{ inst: problems[0], ...right }]);
    expect(currentItem(q)?.inst).toBe(problems[1]);
  });

  test("a wrong first answer is asked again at the end without being recorded twice", () => {
    let q = answerCurrent(initQueue(problems), wrong, false);
    expect(q.items.length).toBe(4);
    expect(q.items[3]).toEqual({ inst: problems[0], requeue: true });
    for (let i = 0; i < 3; i++) q = advance(i === 0 ? q : answerCurrent(q, right, false));
    expect(currentItem(q)).toEqual({ inst: problems[0], requeue: true });
    q = answerCurrent(q, wrong, false);
    expect(q.items.length).toBe(4);
    expect(q.results.length).toBe(3);
    expect(firstAnswered(q)).toBe(3);
    expect(isFinished(advance(q))).toBe(true);
  });

  test("warm-up never requeues", () => {
    expect(answerCurrent(initQueue(problems), wrong, true).items.length).toBe(3);
  });
});
