import { describe, expect, test } from "bun:test";
import { awardSeeds, emptyWallet, SEEDS, type SeedInput, type Wallet } from "@/game/economy";

const TODAY = "2026-10-30";
const YESTERDAY = "2026-10-29";

const input = (patch: Partial<SeedInput> = {}): SeedInput => ({
  kind: "main",
  inSession: true,
  interrupted: false,
  firstCorrect: 0,
  levelId: "3-1",
  levelMasteredBefore: false,
  events: [],
  reviewsPassed: 0,
  stageCheckPassed: false,
  goalReached: false,
  challengeBestNew: false,
  ...patch,
});
const wallet = (patch: Partial<Wallet> = {}): Wallet => ({ ...emptyWallet(), day: TODAY, ...patch });
const lines = (a: ReturnType<typeof awardSeeds>) => a.lines.map((l) => [l.kind, l.seeds]);

describe("awardSeeds", () => {
  test("today's practice pays 1 per first right answer and 5 for finishing", () => {
    const a = awardSeeds(wallet(), input({ firstCorrect: 24 }), TODAY);
    expect(a.lines).toEqual([
      { kind: "correct", seeds: 24, count: 24 },
      { kind: "complete", seeds: 5 },
    ]);
    expect(a.total).toBe(29);
    expect(a.capped).toBe(false);
    expect(a.wallet.seeds).toBe(29);
    expect(a.wallet.lifetime).toBe(29);
  });

  test("the warm-up pays 3 and nothing per answer", () => {
    const a = awardSeeds(wallet(), input({ kind: "warmup", levelId: null, firstCorrect: 20 }), TODAY);
    expect(lines(a)).toEqual([["warmup", 3]]);
    expect(a.total).toBe(3);
  });

  test("free practice pays 1 per 2 right answers and 2 for finishing, up to 50 a day", () => {
    const free = input({ kind: "extra", inSession: false, firstCorrect: 25 });
    const fresh = awardSeeds(wallet(), free, TODAY);
    expect(lines(fresh)).toEqual([
      ["correct", 12],
      ["complete", 2],
    ]);
    expect(fresh.total).toBe(14);
    expect(fresh.capped).toBe(false);
    expect(fresh.wallet.earnedToday).toBe(14);

    const near = awardSeeds(wallet({ earnedToday: 40 }), free, TODAY);
    expect(near.total).toBe(10);
    expect(near.capped).toBe(true);
    expect(near.wallet.earnedToday).toBe(SEEDS.extraDailyCap);

    const full = awardSeeds(wallet({ earnedToday: 50 }), free, TODAY);
    expect(full.total).toBe(0);
    expect(full.lines).toEqual([]);
    expect(full.capped).toBe(true);
  });

  test("milestones are paid after the cap", () => {
    const a = awardSeeds(wallet({ earnedToday: 50 }), input({ kind: "extra", inSession: false, firstCorrect: 20, events: ["star2", "personalBest"] }), TODAY);
    expect(lines(a)).toEqual([
      ["star2", 10],
      ["personalBest", 5],
    ]);
    expect(a.total).toBe(15);
    expect(a.capped).toBe(true);
  });

  test("a mastered level pays nothing in free practice, even a personal best", () => {
    const a = awardSeeds(wallet(), input({ kind: "extra", inSession: false, firstCorrect: 30, levelMasteredBefore: true, events: ["personalBest"] }), TODAY);
    expect(a.total).toBe(0);
    expect(a.lines).toEqual([]);
    expect(a.wallet.earnedToday).toBe(0);
  });

  test("a personal best pays once per level a day and the cap resets the next day", () => {
    const best = input({ kind: "extra", inSession: false, firstCorrect: 0, events: ["personalBest"] });
    const w = wallet({ bestToday: ["3-1"], earnedToday: 50 });
    expect(awardSeeds(w, best, TODAY).total).toBe(0);
    expect(awardSeeds(w, { ...best, levelId: "3-2" }, TODAY).total).toBe(5);

    const nextDay = awardSeeds({ ...w, day: YESTERDAY }, { ...best, firstCorrect: 10 }, TODAY);
    expect(lines(nextDay)).toEqual([
      ["correct", 5],
      ["complete", 2],
      ["personalBest", 5],
    ]);
    expect(nextDay.wallet.day).toBe(TODAY);
    expect(nextDay.wallet.earnedToday).toBe(7);
    expect(nextDay.wallet.bestToday).toEqual(["3-1"]);
  });

  test("the diagnosis and the challenge pay 1 per right answer, a new challenge best adds 10", () => {
    const diagnosis = awardSeeds(wallet(), input({ kind: "placement", inSession: false, levelId: null, firstCorrect: 6 }), TODAY);
    expect(lines(diagnosis)).toEqual([["correct", 6]]);
    const challenge = awardSeeds(wallet(), input({ kind: "challenge", inSession: false, levelId: null, firstCorrect: 10, challengeBestNew: true }), TODAY);
    expect(lines(challenge)).toEqual([
      ["correct", 10],
      ["challengeBest", 10],
    ]);
  });

  test("goal 20, new ★2 10, mastered 30, stage check 50 and review 5 per passed level", () => {
    const check = awardSeeds(wallet(), input({ kind: "stage_check", levelId: null, firstCorrect: 9, stageCheckPassed: true, goalReached: true }), TODAY);
    expect(lines(check)).toEqual([
      ["correct", 9],
      ["complete", 5],
      ["stageCheck", 50],
      ["goal", 20],
    ]);
    const main = awardSeeds(wallet(), input({ firstCorrect: 30, events: ["star2", "mastered"] }), TODAY);
    expect(main.total).toBe(30 + 5 + 10 + 30);
    const review = awardSeeds(wallet(), input({ kind: "review", levelId: null, firstCorrect: 8, reviewsPassed: 2 }), TODAY);
    expect(lines(review)).toEqual([
      ["correct", 8],
      ["complete", 5],
      ["review", 10],
    ]);
  });

  test("an interrupted set pays nothing", () => {
    const a = awardSeeds(wallet({ seeds: 7 }), input({ firstCorrect: 12, goalReached: true, events: ["star2"], interrupted: true }), TODAY);
    expect(a.total).toBe(0);
    expect(a.lines).toEqual([]);
    expect(a.wallet.seeds).toBe(7);
  });

  test("a day of today's practice beats a whole day of free practice", () => {
    let w = wallet();
    let total = 0;
    for (const set of [input({ kind: "warmup", levelId: null, firstCorrect: 20 }), input({ firstCorrect: 30 }), input({ firstCorrect: 30, goalReached: true })]) {
      const a = awardSeeds(w, set, TODAY);
      w = a.wallet;
      total += a.total;
    }
    expect(total).toBe(93);
    expect(total).toBeGreaterThanOrEqual(90);
    expect(total).toBeGreaterThan(SEEDS.extraDailyCap);
  });
});
