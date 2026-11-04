import { jJudge, JUDGE_NOTE_TEXT } from "@/juku/judge";
import { jAnswerText, type JAnswer } from "@/juku/problem";

// Hint mode (H) for the juku.json levels, with the rules of hint-flow.ts: fill the blanks one by one; two misses on a
// blank reveal it and the problem counts as missed. A fraction of the right value in the wrong form is a miss
// that says what to fix ("やくぶん できるよ").

export interface JHintState {
  filled: (JAnswer | null)[];
  revealed: boolean[];
  tries: number;
  /** bumps on every wrong try so the input fields start empty again */
  attempt: number;
  missed: boolean;
  msg: string | null;
}

export type JHintEvent = "next" | "retry" | "revealed" | "done";

export const initJHint = (stepCount: number): JHintState => ({
  filled: Array.from({ length: stepCount }, () => null),
  revealed: Array.from({ length: stepCount }, () => false),
  tries: 0,
  attempt: 0,
  missed: false,
  msg: null,
});

export const activeJStep = (s: JHintState) => s.filled.findIndex((v) => v === null);

export function submitJStep(s: JHintState, steps: JAnswer[], value: JAnswer): { state: JHintState; event: JHintEvent; correct?: boolean } {
  const active = activeJStep(s);
  if (active < 0) return { state: s, event: "done", correct: !s.missed };
  const want = steps[active];
  const judged = jJudge(want, value);
  const filled = [...s.filled];
  const revealed = [...s.revealed];
  let missed = s.missed;
  let event: JHintEvent;
  let msg: string | null;
  if (judged.correct) {
    filled[active] = want;
    event = "next";
    msg = null;
  } else if (s.tries + 1 >= 2) {
    filled[active] = want;
    revealed[active] = true;
    missed = true;
    event = "revealed";
    msg = `こたえは ${jAnswerText(want)}`;
  } else {
    const why = judged.note ? JUDGE_NOTE_TEXT[judged.note] : "ちがうよ";
    return { state: { ...s, tries: s.tries + 1, attempt: s.attempt + 1, msg: `${why}。もういちど` }, event: "retry" };
  }
  const next: JHintState = { ...s, filled, revealed, tries: 0, missed, msg };
  if (filled.every((v) => v !== null)) return { state: next, event: "done", correct: !missed };
  return { state: next, event };
}
