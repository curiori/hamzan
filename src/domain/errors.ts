// Mistake classification (rules.errorTypes, checked in rules.errorTypeOrder).
import { SPEC, LEVEL } from "./spec";
import type { Answer, ProblemInstance } from "./problem";

export type ErrorTypeId = "placeValue" | "carry" | "transposition" | "remainder" | "fact" | "procedure";

const SIMILAR: [string, string][] = [
  ["6", "0"],
  ["1", "7"],
];

function isPlaceValue(given: number, correct: number): boolean {
  if (given === correct) return false;
  return [correct * 10, correct * 100, correct / 10, correct / 100].some((v) => Number.isInteger(v) && v === given);
}

function isCarry(given: number, correct: number): boolean {
  return [10, 100, 1000].includes(Math.abs(given - correct));
}

function isTransposition(given: number, correct: number): boolean {
  const g = String(given);
  const c = String(correct);
  if (g === c || g.length !== c.length) return false;
  if ([...g].sort().join("") === [...c].sort().join("")) return true;
  const diffs = [...g].map((ch, i) => [ch, c[i]] as const).filter(([x, y]) => x !== y);
  return diffs.length === 1 && SIMILAR.some(([x, y]) => (diffs[0][0] === x && diffs[0][1] === y) || (diffs[0][0] === y && diffs[0][1] === x));
}

/** Basic facts (stages 0–2, not remainder division) count as one-step problems. */
export const isSingleStep = (inst: ProblemInstance) => LEVEL[inst.levelId].stage <= 2 && inst.problem.shape !== "divRem";

export function classifyError(inst: ProblemInstance, given: Answer, sameFactErrorsIn14Days: number): ErrorTypeId {
  const checks: Record<ErrorTypeId, () => boolean> = {
    placeValue: () => {
      if (inst.answer.kind === "number" && given.kind === "number") return isPlaceValue(given.value, inst.answer.value);
      if (inst.answer.kind === "divRem" && given.kind === "divRem") return isPlaceValue(given.quotient, inst.answer.quotient);
      return false;
    },
    carry: () => {
      if (inst.answer.kind === "number" && given.kind === "number") return isCarry(given.value, inst.answer.value);
      if (inst.answer.kind === "divRem" && given.kind === "divRem") return isCarry(given.quotient, inst.answer.quotient);
      return false;
    },
    transposition: () => {
      if (inst.answer.kind === "number" && given.kind === "number") return isTransposition(given.value, inst.answer.value);
      if (inst.answer.kind === "divRem" && given.kind === "divRem") return isTransposition(given.quotient, inst.answer.quotient);
      return false;
    },
    remainder: () => {
      if (inst.problem.shape !== "divRem" || given.kind !== "divRem") return false;
      const { dividend, divisor } = inst.problem;
      return given.remainder >= divisor || divisor * given.quotient + given.remainder !== dividend;
    },
    fact: () => sameFactErrorsIn14Days >= 2 || isSingleStep(inst),
    procedure: () => true,
  };
  for (const id of SPEC.rules.errorTypeOrder as ErrorTypeId[]) if (checks[id]()) return id;
  return "procedure";
}
