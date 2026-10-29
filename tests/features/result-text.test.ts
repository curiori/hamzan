import { describe, expect, test } from "bun:test";
import { celebrates, headline, isTimed, resultNotes } from "@/features/result/result-text";
import type { SetSummary } from "@/state/types";

const summary = (patch: Partial<SetSummary> = {}): SetSummary => ({
  kind: "main",
  levelId: "1-1",
  mode: "S",
  result: "star2",
  stars: 2,
  n: 30,
  errors: 0,
  perProblemSec: 1.5,
  t2: 2,
  t3: 1.2,
  prevBest: null,
  events: [],
  nextMode: null,
  reviews: [],
  stageCheck: null,
  placement: null,
  challengeBest: null,
  goalReached: false,
  newRewards: [],
  ...patch,
});

describe("headline", () => {
  test("an interrupted set is never a success", () => {
    expect(headline(summary({ result: "interrupted" }))).toEqual({ title: "とちゅうで おやすみ", good: false });
  });
  test("speed sets name the stars", () => {
    expect(headline(summary({ result: "star3", stars: 3 })).title).toBe("すごい！ ★3");
    expect(headline(summary({ result: "star1", stars: 1 })).title).toBe("まちがい なし！ ★1");
  });
  test("mastered wins over the stars and retry is not good", () => {
    expect(headline(summary({ events: ["mastered"] })).title).toBe("マスター！");
    expect(headline(summary({ result: "retry", stars: 0 }))).toEqual({ title: "もう すこし！", good: false });
  });
  test("a review is good only when every level passed", () => {
    expect(headline(summary({ kind: "review", reviews: [{ levelId: "1-1", passed: true, demoted: false }, { levelId: "1-2", passed: false, demoted: false }] })).good).toBe(false);
  });
});

describe("notes and celebration", () => {
  test("mode changes name the next mode", () => {
    const notes = resultNotes(summary({ mode: "H", result: "star1", events: ["modeUp"], nextMode: "S" }));
    expect(notes.map((n) => n.text)).toContain("つぎは「スピード」で やってみよう");
  });
  test("a speed retry without a mode change asks to review the misses", () => {
    expect(resultNotes(summary({ result: "retry", stars: 0 })).map((n) => n.icon)).toEqual(["retry"]);
  });
  test("stars are shown only for timed level sets", () => {
    expect(isTimed(summary())).toBe(true);
    expect(isTimed(summary({ kind: "warmup" }))).toBe(false);
    expect(isTimed(summary({ mode: "H" }))).toBe(false);
  });
  test("confetti for ★2 and new rewards, not for a plain ★1", () => {
    expect(celebrates(summary())).toBe(true);
    expect(celebrates(summary({ result: "star1", stars: 1 }))).toBe(false);
    expect(celebrates(summary({ result: "star1", stars: 1, newRewards: ["bowl"] }))).toBe(true);
  });
});
