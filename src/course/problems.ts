// Problems, answers and mistakes of any level. Stage 0–5 problems go to src/domain, stage 6–9 problems
// (shape "juku") to src/juku; the two never share a shape or an answer kind.
import { classifyError } from "@/domain/errors";
import { makeInstance } from "@/domain/generators";
import { answerText, display, sameAnswer, speech, type Answer, type Problem, type ProblemInstance } from "@/domain/problem";
import { JUDGE_NOTE_TEXT, jClassifyError, jJudge, jRevealNote } from "@/juku/judge";
import { jAnswerText, jSpeech, jText, makeJInstance, type JAnswer, type JInstance, type JProblem } from "@/juku/problem";
import type { CourseErrorTypeId } from "./levels";

export type CourseProblem = Problem | JProblem;
export type CourseAnswer = Answer | JAnswer;
export type CourseInstance = ProblemInstance | JInstance;

const JUKU_ANSWERS = new Set(["dec", "frac", "pair", "choice", "tf"]);

export const isJukuProblem = (p: CourseProblem): p is JProblem => p.shape === "juku";
export const isJukuInstance = (inst: CourseInstance): inst is JInstance => inst.problem.shape === "juku";
export const isJukuAnswer = (a: CourseAnswer): a is JAnswer => JUKU_ANSWERS.has(a.kind);

export function instanceOf(levelId: string, p: CourseProblem): CourseInstance {
  return isJukuProblem(p) ? makeJInstance(levelId, p) : makeInstance(levelId, p);
}

/** the problem as one line ("3.14×7＝", "1.2km＝□m") */
export const problemText = (p: CourseProblem) => (isJukuProblem(p) ? jText(p) : display(p));
export const problemSpeech = (p: CourseProblem) => (isJukuProblem(p) ? jSpeech(p) : speech(p));
export const answerTextOf = (a: CourseAnswer) => (isJukuAnswer(a) ? jAnswerText(a) : answerText(a));

/** Right or not; a fraction with the right value in the wrong form gets a short note. */
export function judgeAnswer(expected: CourseAnswer, given: CourseAnswer): { correct: boolean; note: string | null } {
  if (isJukuAnswer(expected)) {
    if (!isJukuAnswer(given)) return { correct: false, note: null };
    const r = jJudge(expected, given);
    return { correct: r.correct, note: r.note ? JUDGE_NOTE_TEXT[r.note] : null };
  }
  return { correct: !isJukuAnswer(given) && sameAnswer(expected, given), note: null };
}

/** rules.errorTypes (and juku.json errorTypes for stage 6–9 problems) */
export function classifyMistake(inst: CourseInstance, given: CourseAnswer, sameFactErrorsIn14Days: number): CourseErrorTypeId {
  if (isJukuInstance(inst)) return isJukuAnswer(given) ? jClassifyError(inst, given, sameFactErrorsIn14Days) : "procedure";
  return isJukuAnswer(given) ? "procedure" : classifyError(inst, given, sameFactErrorsIn14Days);
}

/** what the play screen shows after a wrong answer: the right answer, and for stages 6–9 the rule behind the slip */
export function revealOf(inst: CourseInstance, given: CourseAnswer | null): { answer: string; note: string | null } {
  const answer = answerTextOf(inst.answer);
  if (!isJukuInstance(inst) || !given || !isJukuAnswer(given)) return { answer, note: null };
  return { answer, note: jRevealNote(inst, given) };
}
