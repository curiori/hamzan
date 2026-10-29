import { sameStep, stepText, type ProblemInstance, type Scaffold, type StepValue } from "@/domain/problem";

// Hint mode (H): fill the blanks one by one; two misses on a blank reveal it and the problem counts as missed.
// ESTIMATE_DIVIDE: the first blank is a free guess, the second is divisor × guess, and a guess that does not
// give the dividend sends the child back to guess again (same rules as the web prototype's HintSolver).

export interface HintState {
  filled: (StepValue | null)[];
  revealed: boolean[];
  tries: number;
  /** bumps on every wrong try so the input fields start empty again */
  attempt: number;
  missed: boolean;
  msg: string | null;
}

export type HintEvent = "next" | "retry" | "revealed" | "estimateRetry" | "done";

export const initHint = (stepCount: number): HintState => ({
  filled: Array.from({ length: stepCount }, () => null),
  revealed: Array.from({ length: stepCount }, () => false),
  tries: 0,
  attempt: 0,
  missed: false,
  msg: null,
});

export const activeStep = (s: HintState) => s.filled.findIndex((v) => v === null);

const isEstimate = (inst: ProblemInstance, sc: Scaffold) => sc.kind === "ESTIMATE_DIVIDE" && inst.problem.shape === "binary";

export function expectedStep(inst: ProblemInstance, sc: Scaffold, s: HintState, i: number): StepValue {
  if (isEstimate(inst, sc) && i === 1 && inst.problem.shape === "binary") return inst.problem.b * Number(s.filled[0]);
  return sc.steps[i];
}

export function submitHintStep(
  s: HintState,
  inst: ProblemInstance,
  sc: Scaffold,
  value: StepValue,
): { state: HintState; event: HintEvent; correct?: boolean } {
  const active = activeStep(s);
  if (active < 0) return { state: s, event: "done", correct: !s.missed };
  const estimate = isEstimate(inst, sc);
  const filled = [...s.filled];
  const revealed = [...s.revealed];

  if (estimate && active === 0) {
    filled[0] = value;
    return { state: { ...s, filled, tries: 0, msg: null }, event: "next" };
  }

  const want = expectedStep(inst, sc, s, active);
  let event: HintEvent;
  let missed = s.missed;
  let msg: string | null;
  if (sameStep(value, want)) {
    filled[active] = want;
    event = "next";
    msg = null;
  } else if (s.tries + 1 >= 2) {
    filled[active] = want;
    revealed[active] = true;
    missed = true;
    event = "revealed";
    msg = `こたえは ${stepText(want)}`;
  } else {
    return { state: { ...s, tries: s.tries + 1, attempt: s.attempt + 1, msg: "ちがうよ。もういちど" }, event: "retry" };
  }

  if (estimate && active === 1 && inst.problem.shape === "binary") {
    const p = inst.problem;
    if (Number(filled[1]) !== p.a)
      return {
        state: {
          ...s,
          filled: s.filled.map(() => null),
          revealed,
          tries: 0,
          missed,
          msg: `${p.b}×${Number(filled[0])}＝${Number(filled[1])}。${p.a}に ならないね。べつの かずで ためそう`,
        },
        event: "estimateRetry",
      };
  }

  const next: HintState = { ...s, filled, revealed, tries: 0, missed, msg };
  if (filled.every((v) => v !== null)) return { state: next, event: "done", correct: !missed };
  return { state: next, event };
}
