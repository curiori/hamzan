import { describe, expect, test } from "bun:test";
import { defsForAnswer, emptyFields, pressKey, toAnswer, toStep, type FieldDef, type FieldSet, type Key } from "../../src/features/play/field-set";

const press = (defs: FieldDef[], keys: Key[], autoSubmit = true, from?: FieldSet) =>
  keys.reduce((s, k) => pressKey(s, defs, k, autoSubmit), from ?? emptyFields(defs));

const DIVREM = { kind: "divRem", quotient: 13, remainder: 1 } as const;

describe("field set", () => {
  test("defsForAnswer gives one field per answer part sized to its digits", () => {
    expect(defsForAnswer({ kind: "number", value: 42 })).toEqual([{ kind: "num", digits: 2, label: "こたえ", role: "plain" }]);
    expect(defsForAnswer(DIVREM).map((d) => [d.role, d.digits])).toEqual([
      ["q", 2],
      ["r", 1],
    ]);
    expect(defsForAnswer({ kind: "bool", value: true })[0].kind).toBe("bool");
    expect(defsForAnswer(7, "□")[0]).toEqual({ kind: "num", digits: 1, label: "□", role: "plain" });
  });

  test("autoSubmit sends when the answer's digit count is typed", () => {
    const defs = defsForAnswer({ kind: "number", value: 42 });
    expect(press(defs, ["4"]).done).toBe(false);
    expect(press(defs, ["4", "2"])).toEqual({ vals: ["42"], active: 0, done: true });
  });

  test("without autoSubmit only OK sends", () => {
    const defs = defsForAnswer({ kind: "number", value: 42 });
    expect(press(defs, ["4", "2"], false).done).toBe(false);
    expect(press(defs, ["4", "2", "ok"], false).done).toBe(true);
  });

  test("keys after done are ignored", () => {
    const defs = defsForAnswer({ kind: "number", value: 4 });
    const done = press(defs, ["4"]);
    expect(press(defs, ["5", "del", "ok"], true, done)).toEqual(done);
  });

  test("あまり moves to the remainder field only when the quotient is typed", () => {
    const defs = defsForAnswer(DIVREM);
    expect(press(defs, ["rem"], false).active).toBe(0);
    expect(press(defs, ["1", "rem"], false).active).toBe(1);
  });

  test("del on an empty field moves back to the previous field", () => {
    const defs = defsForAnswer(DIVREM);
    const atRemainder = press(defs, ["1", "3"]);
    expect(atRemainder.active).toBe(1);
    expect(press(defs, ["del"], true, atRemainder)).toEqual({ vals: ["13", ""], active: 0, done: false });
    expect(press(defs, ["del", "del"], true, atRemainder).vals).toEqual(["1", ""]);
  });

  test("○ and × fill a bool field and send at once; digits are ignored there", () => {
    const defs = defsForAnswer({ kind: "bool", value: true });
    expect(press(defs, ["o"])).toEqual({ vals: ["○"], active: 0, done: true });
    expect(press(defs, ["5"]).vals).toEqual([""]);
  });

  test("a field holds at most 7 digits", () => {
    const defs = defsForAnswer({ kind: "number", value: 12345678 });
    expect(press(defs, ["1", "2", "3", "4", "5", "6", "7", "8"], false).vals[0]).toBe("1234567");
  });

  test("toAnswer and toStep read the typed values", () => {
    expect(toAnswer(defsForAnswer(DIVREM), ["13", "1"], DIVREM)).toEqual(DIVREM);
    expect(toAnswer(defsForAnswer({ kind: "bool", value: true }), ["×"], { kind: "bool", value: true })).toEqual({ kind: "bool", value: false });
    expect(toAnswer(defsForAnswer({ kind: "number", value: 42 }), ["41"], { kind: "number", value: 42 })).toEqual({ kind: "number", value: 41 });
    expect(toStep(["5"], 0)).toBe(5);
    expect(toStep(["○"], true)).toBe(true);
    expect(toStep(["13", "1"], { quotient: 0, remainder: 0 })).toEqual({ quotient: 13, remainder: 1 });
  });
});
