// ★ judgement (rules.stars). Time is judged only in S-mode sets.
export type SetResult = "star3" | "star2" | "star1" | "retry" | "interrupted";

export function judgeSet(args: {
  firstCorrect: boolean[];
  perProblemSec: number;
  t2: number;
  t3: number;
  timed: boolean;
  interrupted?: boolean;
}): SetResult {
  if (args.interrupted) return "interrupted";
  if (!args.firstCorrect.length || !args.firstCorrect.every(Boolean)) return "retry";
  if (!args.timed) return "star1";
  if (args.perProblemSec <= args.t3) return "star3";
  if (args.perProblemSec <= args.t2) return "star2";
  return "star1";
}

export const starsOf = (r: SetResult) => (r === "star3" ? 3 : r === "star2" ? 2 : r === "star1" ? 1 : 0);
