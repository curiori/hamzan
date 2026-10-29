import { digitsOf, type Answer, type StepValue } from "@/domain/problem";

// Answer fields filled from the on-screen keypad (rules of the web prototype's useFieldSet).

export type FieldDef = { kind: "num" | "bool"; digits: number; label: string; role: "plain" | "q" | "r" };
export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "del" | "rem" | "ok" | "o" | "x";
export interface FieldSet {
  vals: string[];
  active: number;
  /** the fields were sent; further keys are ignored */
  done: boolean;
}

const MAX_LEN = 7;

const boolDef = (): FieldDef[] => [{ kind: "bool", digits: 1, label: "○か×", role: "plain" }];
const divRemDefs = (quotient: number, remainder: number): FieldDef[] => [
  { kind: "num", digits: digitsOf(quotient), label: "しょう", role: "q" },
  { kind: "num", digits: digitsOf(remainder), label: "あまり", role: "r" },
];

export function defsForAnswer(a: Answer | StepValue, label = "こたえ"): FieldDef[] {
  if (typeof a === "boolean") return boolDef();
  if (typeof a === "number") return [{ kind: "num", digits: digitsOf(a), label, role: "plain" }];
  if ("kind" in a) {
    if (a.kind === "bool") return boolDef();
    if (a.kind === "number") return [{ kind: "num", digits: digitsOf(a.value), label, role: "plain" }];
  }
  return divRemDefs(a.quotient, a.remainder);
}

export const emptyFields = (defs: FieldDef[]): FieldSet => ({ vals: defs.map(() => ""), active: 0, done: false });

/** After typing into field idx: move on when it is full, or send when the last field is full. */
function apply(defs: FieldDef[], vals: string[], idx: number, autoSubmit: boolean): FieldSet {
  const d = defs[idx];
  const full = d.kind === "bool" ? !!vals[idx] : autoSubmit && vals[idx].length >= d.digits;
  if (full && idx < defs.length - 1) return { vals, active: idx + 1, done: false };
  return { vals, active: idx, done: full };
}

export function pressKey(fs: FieldSet, defs: FieldDef[], key: Key, autoSubmit: boolean): FieldSet {
  if (fs.done) return fs;
  const idx = fs.active;
  const d = defs[idx];
  if (!d) return fs;
  const vals = [...fs.vals];
  if (key === "del") {
    if (vals[idx]) {
      vals[idx] = vals[idx].slice(0, -1);
      return { vals, active: idx, done: false };
    }
    return idx > 0 ? { ...fs, active: idx - 1 } : fs;
  }
  if (key === "rem") return vals[idx] && idx < defs.length - 1 ? { ...fs, active: idx + 1 } : fs;
  if (key === "ok") {
    if (vals.every(Boolean)) return { ...fs, done: true };
    return vals[idx] && idx < defs.length - 1 ? { ...fs, active: idx + 1 } : fs;
  }
  if ((key === "o" || key === "x") && d.kind === "bool") {
    vals[idx] = key === "o" ? "○" : "×";
    return apply(defs, vals, idx, autoSubmit);
  }
  if (/^\d$/.test(key) && d.kind === "num") {
    vals[idx] = (vals[idx] + key).slice(0, MAX_LEN);
    return apply(defs, vals, idx, autoSubmit);
  }
  return fs;
}

export function toAnswer(defs: FieldDef[], vals: string[], like: Answer): Answer {
  if (like.kind === "bool") return { kind: "bool", value: vals[0] === "○" };
  if (like.kind === "divRem") return { kind: "divRem", quotient: Number(vals[0]), remainder: Number(vals[1]) };
  return { kind: "number", value: Number(vals[defs.length - 1]) };
}

export function toStep(vals: string[], like: StepValue): StepValue {
  if (typeof like === "boolean") return vals[0] === "○";
  if (typeof like === "object") return { quotient: Number(vals[0]), remainder: Number(vals[1]) };
  return Number(vals[0]);
}
