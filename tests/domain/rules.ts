const { LEVEL, LEVELS, validateSpec, RULE_NUMBERS } = await import(`../../src/domain/spec.ts`);
const { targetSec, mixedTargetSec, setTargetDisplaySec, writeChildFrom } = await import(`../../src/domain/timing.ts`);
const { judgeSet } = await import(`../../src/domain/judge.ts`);
const P = await import(`../../src/domain/progression.ts`);
const R = await import(`../../src/domain/review.ts`);
const { addDays, diffDays } = await import(`../../src/domain/dates.ts`);
const PL = await import(`../../src/domain/placement.ts`);
const SB = await import(`../../src/domain/setBuilder.ts`);
const S = await import(`../../src/domain/session.ts`);
const { classifyError } = await import(`../../src/domain/errors.ts`);
const { makeInstance } = await import(`../../src/domain/generators.ts`);

let fail = 0, pass = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log("FAIL", name, "got", JSON.stringify(got), "want", JSON.stringify(want)); }
};

// spec
eq("spec valid", validateSpec(), []);
eq("rule numbers", RULE_NUMBERS, { backgroundLimitSec: 60, revealSec: 1, reviewRetryDays: 2, stageCheckMaxMisses: 1, miniCheckProblems: 5 });

// timing
eq("T2 3-5", targetSec(LEVEL["3-5"], 2), 4.5);
eq("T3 3-5", targetSec(LEVEL["3-5"], 3), 2.4);
eq("T2 3-5 writeChild .8", targetSec(LEVEL["3-5"], 2, { writeChild: 0.8 }), 5.2);
eq("T2 0-1", targetSec(LEVEL["0-1"], 2), 1.9);
eq("mixed", mixedTargetSec(["0-1", "3-5"], 2), 3.2);
eq("display", setTargetDisplaySec(4.5, 20), 90);
eq("display2", setTargetDisplaySec(1.9, 30), 60);
eq("write median", writeChildFrom([0.5, 0.3, 0.1]), 0.3);
eq("write clamp lo", writeChildFrom([0.05, 0.1, 0.1]), 0.2);
eq("write clamp hi", writeChildFrom([2, 3, 4]), 1.5);

// judge
eq("retry", judgeSet({ firstCorrect: [true, false], perProblemSec: 1, t2: 2, t3: 1, timed: true }), "retry");
eq("H star1", judgeSet({ firstCorrect: [true, true], perProblemSec: 99, t2: 2, t3: 1, timed: false }), "star1");
eq("S star3", judgeSet({ firstCorrect: [true], perProblemSec: 1, t2: 2, t3: 1, timed: true }), "star3");
eq("S star2", judgeSet({ firstCorrect: [true], perProblemSec: 1.5, t2: 2, t3: 1, timed: true }), "star2");
eq("S star1", judgeSet({ firstCorrect: [true], perProblemSec: 2.5, t2: 2, t3: 1, timed: true }), "star1");
eq("interrupted", judgeSet({ firstCorrect: [true], perProblemSec: 1, t2: 2, t3: 1, timed: true, interrupted: true }), "interrupted");

// progression
const lv = LEVEL["3-5"]; // H M S
const lp = P.freshProgress(lv);
let o = P.applySetResult(lp, lv, { result: "star1", mode: "H", errors: 0, perProblemSec: 9, t2: 4.5, date: "2026-11-01" });
eq("H->M", [o.progress.mode, o.events], ["M", ["modeUp"]]);
o = P.applySetResult(o.progress, lv, { result: "star1", mode: "M", errors: 0, perProblemSec: 7, t2: 4.5, date: "2026-11-01" });
eq("M stays (slow)", o.progress.mode, "M");
o = P.applySetResult(o.progress, lv, { result: "star1", mode: "M", errors: 0, perProblemSec: 6.7, t2: 4.5, date: "2026-11-01" });
eq("M->S at <=1.5T2", o.progress.mode, "S");
o = P.applySetResult(o.progress, lv, { result: "star2", mode: "S", errors: 0, perProblemSec: 4, t2: 4.5, date: "2026-11-02" });
eq("star2", [o.progress.star2At, o.events.includes("star2")], ["2026-11-02", true]);
o = P.applySetResult(o.progress, lv, { result: "star3", mode: "S", errors: 0, perProblemSec: 2, t2: 4.5, date: "2026-11-02" });
o = P.applySetResult(o.progress, lv, { result: "star3", mode: "S", errors: 0, perProblemSec: 2, t2: 4.5, date: "2026-11-02" });
eq("star3 same day not mastered", [o.progress.star3Dates, o.progress.masteredAt], [["2026-11-02"], null]);
o = P.applySetResult(o.progress, lv, { result: "star3", mode: "S", errors: 0, perProblemSec: 2.1, t2: 4.5, date: "2026-11-03" });
eq("mastered on 2nd date", [o.progress.masteredAt, o.events.includes("mastered")], ["2026-11-03", true]);
eq("personal best", o.progress.personalBestSec, 2);

// step back S->M after 2 bad sets (no star2 yet)
let q = { ...P.freshProgress(lv), mode: "S" };
q = P.applySetResult(q, lv, { result: "retry", mode: "S", errors: 2, perProblemSec: 5, t2: 4.5, date: "2026-11-01" }).progress;
o = P.applySetResult(q, lv, { result: "retry", mode: "S", errors: 3, perProblemSec: 5, t2: 4.5, date: "2026-11-01" });
eq("step back S->M", [o.progress.mode, o.events.includes("modeDown")], ["M", true]);
const lv37 = LEVEL["3-7"]; // H S
q = { ...P.freshProgress(lv37), mode: "S" };
q = P.applySetResult(q, lv37, { result: "retry", mode: "S", errors: 2, perProblemSec: 5, t2: 4, date: "d" }).progress;
eq("step back S->H when no M", P.applySetResult(q, lv37, { result: "retry", mode: "S", errors: 2, perProblemSec: 5, t2: 4, date: "d" }).progress.mode, "H");

// unlock / frontier / pending / fallback
const map: Record<string, ReturnType<typeof P.freshProgress>> = {};
eq("frontier empty", P.frontier(map)?.id, "0-1");
eq("3-5 locked", P.isUnlocked(map, "3-5"), false);
for (const l of LEVELS) if (l.order < LEVEL["3-5"].order) map[l.id] = { ...P.freshProgress(l), star2At: "2026-10-0" + ((l.order % 9) + 1), mode: "S" };
eq("3-5 unlocked", P.isUnlocked(map, "3-5"), true);
eq("frontier 3-5", P.frontier(map)?.id, "3-5");
eq("pending oldest", P.pendingStar3(map)?.id, LEVELS.find((l) => l.order < 35 && l.order % 9 === 0)?.id);
map["3-5"] = { ...P.freshProgress(lv), mode: "S", speedSetsWithoutStar2: 5 };
eq("fallback to prerequisite", P.practiceTarget(map)?.level.id, "3-2");
map["3-2"] = { ...map["3-2"], masteredAt: "2026-10-20" };
eq("fallback next prerequisite", P.practiceTarget(map)?.level.id, "3-4");
map["3-4"] = { ...map["3-4"], masteredAt: "2026-10-20" };
eq("back to frontier", P.practiceTarget(map)?.level.id, "3-5");

// review
const it = R.scheduleOnMastery("3-5", "2026-11-03");
eq("first due +2", it.dueDate, "2026-11-05");
let r1 = R.applyReview(it, true, "2026-11-05");
eq("pass -> +4", [r1.item?.intervalIndex, r1.item?.dueDate], [1, "2026-11-09"]);
r1 = R.applyReview(r1.item!, false, "2026-11-09");
eq("fail -> +2 reset", [r1.item?.intervalIndex, r1.item?.dueDate, r1.item?.consecutiveFails], [0, "2026-11-11", 1]);
eq("2nd fail demotes", R.applyReview(r1.item!, false, "2026-11-11"), { item: null, demoted: true });
let chain = R.scheduleOnMastery("x", "2026-01-01");
const dues = [chain.dueDate];
for (let i = 0; i < 6; i++) { chain = R.applyReview(chain, true, chain.dueDate).item!; dues.push(chain.dueDate); }
eq("interval chain", dues, ["2026-01-03", "2026-01-07", "2026-01-14", "2026-01-28", "2026-02-27", "2026-03-29", "2026-04-28"]);
eq("due max 2 oldest", R.dueReviews([{ levelId: "a", intervalIndex: 0, dueDate: "2026-11-05", consecutiveFails: 0 }, { levelId: "b", intervalIndex: 0, dueDate: "2026-11-01", consecutiveFails: 0 }, { levelId: "c", intervalIndex: 0, dueDate: "2026-11-03", consecutiveFails: 0 }, { levelId: "d", intervalIndex: 0, dueDate: "2026-12-01", consecutiveFails: 0 }], "2026-11-06").map((x: { levelId: string }) => x.levelId), ["b", "c"]);
eq("leap day", addDays("2028-02-28", 1), "2028-02-29");
eq("year end", addDays("2027-12-31", 1), "2028-01-01");
eq("month end", addDays("2026-01-31", 30), "2026-03-02");
eq("diff across leap", diffDays("2028-03-01", "2028-02-27"), 3);

// placement
let st = PL.startPlacement(5);
eq("grade5 starts at stage 3", st.stage, 3);
st = PL.applyStageCheck(st, 0, 2, 4, 2.5);
eq("pass -> stage 4 (mastery-level)", [st.stage, st.phase, st.masteredStages], [4, "stageCheck", [3]]);
st = PL.applyStageCheck(st, 3, 9, 6, 3);
eq("fail -> mini 4-1", [st.phase, PL.miniLevel(st)], ["mini", "4-1"]);
st = PL.applyMiniCheck(st, 2, 9, 6);
eq("4-1 fails with misses -> frontier 4-1 H", st.result, { frontier: "4-1", mode: "H" });
const applied = PL.applyPlacementResult(st, "2026-11-01");
eq("earlier levels star2", [applied.progress["3-14"].star2At, applied.progress["0-1"].star2At, applied.progress["4-1"]?.star2At ?? null], ["2026-11-01", "2026-11-01", null]);
eq("stage 3 mastered -> reviews spread", [applied.reviews.length, Math.min(...applied.reviews.map((r: { dueDate: string }) => diffDays(r.dueDate, "2026-11-01"))), Math.max(...applied.reviews.map((r: { dueDate: string }) => diffDays(r.dueDate, "2026-11-01")))], [14, 1, 14]);
let s2 = PL.startPlacement(5);
s2 = PL.applyStageCheck(s2, 4, 9, 4, 2);
s2 = PL.applyMiniCheck(s2, 0, 9, 4);
eq("first level slow -> back to stage 2 check", [s2.stage, s2.phase, s2.pendingFrontier], [2, "stageCheck", { levelId: "3-1", mode: "S" }]);
s2 = PL.applyStageCheck(s2, 1, 3, 4, 2);
eq("stage 2 pass -> frontier 3-1 S", s2.result, { frontier: "3-1", mode: "S" });

// set builder
const set = SB.buildSet("2-5", 30, 123);
eq("2-5 size", set.length, 30);
eq("2-5 no dup facts", new Set(set.map((x: { factKey: string }) => x.factKey)).size, 30);
eq("deterministic", SB.buildSet("3-10", 10, 99).map((x: { factKey: string }) => x.factKey), SB.buildSet("3-10", 10, 99).map((x: { factKey: string }) => x.factKey));
const small = SB.buildSet("0-1", 30, 7).map((x: { factKey: string }) => x.factKey);
eq("0-1 cycles facts, no back-to-back", [small.length, small.every((k: string, i: number) => i === 0 || k !== small[i - 1])], [30, true]);
eq("0-1 first round distinct", new Set(small.slice(0, 9)).size, 9);
let weakHits = 0, otherHits = 0;
for (let sd = 0; sd < 400; sd++) {
  const s = SB.buildSet("1-5", 10, sd, new Set(["add:3+4"])).map((x: { factKey: string }) => x.factKey);
  if (s.includes("add:3+4")) weakHits++;
  if (s.includes("add:2+5")) otherHits++;
}
console.log("weak weighting (1-5, ~2x expected):", weakHits, "vs", otherHits, (weakHits / otherHits).toFixed(2));
const mix = SB.buildMixed(["3-2", "3-5"], [5, 5], 11);
eq("mixed counts", [mix.filter((x: { levelId: string }) => x.levelId === "3-2").length, mix.filter((x: { levelId: string }) => x.levelId === "3-5").length], [5, 5]);
eq("spread", SB.spread(["a", "b", "c"], 10, 1).reduce((a: number, b: number) => a + b, 0), 10);

// session
eq("fresh plan", S.planDailySession({ progress: {}, reviews: [], stageChecks: {}, date: "2026-11-01", unlockAll: false }), [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }, { kind: "slot", slot: "frontier" }]);
const m0: Record<string, unknown> = {};
for (const id of ["0-1", "0-2", "0-3", "0-4", "0-5"]) m0[id] = { ...P.freshProgress(LEVEL[id]), star2At: "2026-11-01" };
eq("stage check due", S.planDailySession({ progress: m0, reviews: [], stageChecks: {}, date: "2026-11-02", unlockAll: false })[1], { kind: "stageCheck", stage: 0 });
eq("after check: frontier+pending", S.planDailySession({ progress: m0, reviews: [{ levelId: "0-1", intervalIndex: 0, dueDate: "2026-11-02", consecutiveFails: 0 }], stageChecks: { 0: { date: "2026-11-02", passed: true } }, date: "2026-11-02", unlockAll: false }), [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }, { kind: "slot", slot: "pending" }, { kind: "review", levelIds: ["0-1"] }]);
eq("challenge needs mastery", S.challengeAvailable({}, null, "2026-11-01"), false);

// errors
const inst = (lvId: string, p: unknown) => makeInstance(lvId, p);
eq("placeValue", classifyError(inst("2-5", { shape: "binary", a: 7, op: "×", b: 8 }), { kind: "number", value: 560 }, 1), "placeValue");
eq("carry", classifyError(inst("3-5", { shape: "binary", a: 37, op: "+", b: 48 }), { kind: "number", value: 75 }, 1), "carry");
eq("transposition", classifyError(inst("3-6", { shape: "binary", a: 99, op: "-", b: 36 }), { kind: "number", value: 36 }, 1), "transposition");
eq("remainder", classifyError(inst("2-8", { shape: "divRem", dividend: 58, divisor: 7 }), { kind: "divRem", quotient: 7, remainder: 9 }, 1), "remainder");
eq("fact (stage<=2)", classifyError(inst("2-5", { shape: "binary", a: 7, op: "×", b: 8 }), { kind: "number", value: 54 }, 1), "fact");
eq("fact (repeat)", classifyError(inst("3-10", { shape: "binary", a: 38, op: "×", b: 7 }), { kind: "number", value: 268 }, 2), "fact");
eq("procedure", classifyError(inst("3-10", { shape: "binary", a: 38, op: "×", b: 7 }), { kind: "number", value: 268 }, 1), "procedure");

console.log(`rules: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
