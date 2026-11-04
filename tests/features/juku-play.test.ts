import { describe, expect, test } from "bun:test";
import { defsForAnswer, emptyFields, pressKey, type FieldDef, type FieldSet, type Key } from "../../src/features/play/field-set";
import { hasNextBox, jDefsFor, jToAnswer } from "../../src/features/play/juku-fields";
import { activeJStep, initJHint, submitJStep } from "../../src/features/play/juku-hint-flow";
import { headline, resultNotes } from "../../src/features/result/result-text";
import { jJudge } from "../../src/juku/judge";
import type { JAnswer } from "../../src/juku/problem";
import { jScaffoldOf } from "../../src/juku/scaffolds";
import type { SetSummary } from "../../src/state/types";

const press = (defs: FieldDef[], keys: Key[], autoSubmit = true, from?: FieldSet) => keys.reduce((s, k) => pressKey(s, defs, k, autoSubmit), from ?? emptyFields(defs));

const DEC: JAnswer = { kind: "dec", v: "21.98" };
const FRAC: JAnswer = { kind: "frac", w: 0, n: 3, d: 4, mixed: false };
const MIXED: JAnswer = { kind: "frac", w: 3, n: 2, d: 5, mixed: true };
const PAIR: JAnswer = { kind: "pair", a: 3, b: 20, units: [{ v: "分", r: "ふん" }, { v: "秒", r: "びょう" }] };
const CHOICE: JAnswer = { kind: "choice", i: 1, options: ["2000", "20000", "200000", "2000000"] };
const TF: JAnswer = { kind: "tf", v: false, labels: ["ありえる", "ありえない"] };

describe("answer boxes of stages 6–9", () => {
  test("a decimal box takes one point (after a 0 when it comes first) and sends at the answer's length", () => {
    const defs = jDefsFor(DEC);
    expect(defs).toEqual([{ kind: "dec", digits: 5, label: "こたえ", role: "plain", suffix: undefined, suffixRuby: undefined }]);
    expect(press(defs, ["2", "1", "dot", "9", "8"])).toEqual({ vals: ["21.98"], active: 0, done: true });
    expect(press(defs, ["dot", "5"], false).vals).toEqual(["0.5"]);
    expect(press(defs, ["2", "dot", "dot"], false).vals).toEqual(["2."]);
    // the point never sends by itself
    expect(press(defs, ["2", "1", "9", "8", "dot"]).done).toBe(false);
  });

  test("the point does nothing in a whole-number box, and stage 0–5 boxes are as before", () => {
    const pair = jDefsFor(PAIR);
    expect(press(pair, ["dot"]).vals).toEqual(["", ""]);
    expect(defsForAnswer({ kind: "number", value: 42 })).toEqual([{ kind: "num", digits: 2, label: "こたえ", role: "plain" }]);
  });

  test("fraction boxes are typed to the end by hand: つぎ moves on, OK sends", () => {
    const defs = jDefsFor(FRAC);
    expect(defs.map((d) => [d.role, d.manual])).toEqual([
      ["num", true],
      ["den", true],
    ]);
    // an unreduced 9/12 can be typed although 3/4 has one-digit boxes
    const typed = press(defs, ["9", "next", "1", "2"]);
    expect(typed).toEqual({ vals: ["9", "12"], active: 1, done: false });
    expect(press(defs, ["ok"], true, typed).done).toBe(true);
    expect(jToAnswer(["9", "12"], FRAC)).toEqual({ kind: "frac", w: 0, n: 9, d: 12, mixed: false });
    expect(jJudge(FRAC, jToAnswer(["9", "12"], FRAC)).note).toBe("reduce");
    expect([hasNextBox(defs, 0), hasNextBox(defs, 1)]).toEqual([true, false]);
  });

  test("a mixed number has a whole box first", () => {
    const defs = jDefsFor(MIXED);
    expect(defs.map((d) => d.role)).toEqual(["whole", "num", "den"]);
    expect(jToAnswer(["3", "2", "5"], MIXED)).toEqual({ kind: "frac", w: 3, n: 2, d: 5, mixed: true });
  });

  test("two numbers with units between them move on by digits, like あまり", () => {
    const defs = jDefsFor(PAIR);
    expect(defs.map((d) => [d.suffix, d.suffixRuby])).toEqual([
      ["分", "ふん"],
      ["秒", "びょう"],
    ]);
    expect(press(defs, ["3", "2", "0"])).toEqual({ vals: ["3", "20"], active: 1, done: true });
  });

  test("options and ○× are one tap", () => {
    const c = jDefsFor(CHOICE);
    expect(press(c, ["c1"])).toEqual({ vals: ["1"], active: 0, done: true });
    expect(press(c, ["5"]).vals).toEqual([""]);
    expect(jToAnswer(["1"], CHOICE)).toEqual(CHOICE);
    const tf = jDefsFor(TF);
    expect(tf[0].options).toEqual(["ありえる", "ありえない"]);
    expect(jToAnswer([press(tf, ["x"]).vals[0]], TF)).toEqual(TF);
  });
});

describe("hint mode of stages 6–9", () => {
  const steps = jScaffoldOf("frac-reduce", { shape: "juku", type: "reduce", n: 18, d: 24 }).steps;

  test("blanks are filled in order and the problem is right when nothing was revealed", () => {
    let s = initJHint(steps.length);
    let r = submitJStep(s, steps, { kind: "dec", v: "6" });
    expect(r.event).toBe("next");
    s = r.state;
    expect(activeJStep(s)).toBe(1);
    r = submitJStep(s, steps, { kind: "frac", w: 0, n: 3, d: 4, mixed: false });
    expect([r.event, r.correct]).toEqual(["done", true]);
  });

  test("an unreduced blank says why, and a second miss reveals it", () => {
    let s = submitJStep(initJHint(steps.length), steps, { kind: "dec", v: "6" }).state;
    const first = submitJStep(s, steps, { kind: "frac", w: 0, n: 9, d: 12, mixed: false });
    expect([first.event, first.state.msg]).toEqual(["retry", "やくぶん できるよ。もういちど"]);
    s = first.state;
    const second = submitJStep(s, steps, { kind: "frac", w: 0, n: 9, d: 12, mixed: false });
    expect([second.event, second.correct, second.state.msg]).toEqual(["done", false, "こたえは 3/4"]);
  });
});

describe("result words for the check of new levels", () => {
  const base = { kind: "check", levelId: "pi-table", mode: "S", result: null, stars: 0, n: 5, errors: 0, perProblemSec: 1, t2: 3, t3: 2, prevBest: null, events: [], nextMode: null, reviews: [], stageCheck: null, placement: null, challengeBest: null, goalReached: false, newRewards: [], seeds: { lines: [], total: 0, capped: false } } as const;
  test("a pass goes on, a stumble says where to start", () => {
    const pass = { ...base, check: { levelId: "pi-table", passed: true, stageDone: false, startLevel: null, startMode: null } } as SetSummary;
    expect(headline(pass)).toEqual({ title: "ごうかく！", good: true });
    expect(resultNotes(pass)[0].text).toBe("つぎの レベルへ");
    const last = { ...base, check: { levelId: "pi-mix", passed: true, stageDone: true, startLevel: null, startMode: null } } as SetSummary;
    expect(resultNotes(last)[0].text).toBe("チェック おわり！ つぎは ★3を めざそう");
    const stumble = { ...base, errors: 1, check: { levelId: "pi-table", passed: false, stageDone: true, startLevel: "pi-table", startMode: "H" } } as SetSummary;
    expect(headline(stumble).title).toBe("チェック おわり");
    expect(resultNotes(stumble)[0].text).toBe("「3.14の だん」の ヒントから はじめよう");
  });
});
