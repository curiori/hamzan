import { useRef, useState, type ReactElement, type ReactNode } from "react";
import type { CourseAnswer, CourseInstance } from "@/course/problems";
import type { ProblemInstance } from "@/domain/problem";
import type { JInstance } from "@/juku/problem";
import { emptyFields, pressKey, type FieldDef, type FieldSet, type Key } from "./field-set";

export interface SolverResult {
  correct: boolean;
  given: CourseAnswer | null;
  reveal: string;
  /** a second line under the right answer: what to fix (やくぶん できるよ, 1m²＝10000cm², 1じかんは 60ぷん) */
  note?: string | null;
}

/** What a solver shows: the play screen puts the body in the problem card and the keypad below it. */
export interface SolverParts {
  body: ReactNode;
  keypad: ReactNode;
  /** "try again" or a revealed step; shown in the feedback slot under the body, so it never makes the card taller */
  note?: string | null;
}

export interface SolverProps {
  inst: CourseInstance;
  autoSubmit: boolean;
  /** a short screen (iPhone SE): smaller hint lines and keys, so the play screen fits without scrolling */
  compact: boolean;
  /** feedback is showing or the set is paused: no field is active and the keys do nothing */
  locked: boolean;
  onDone: (r: SolverResult) => void;
  sfx: (k: "ok" | "miss") => void;
  render: (parts: SolverParts) => ReactElement;
}

/** a solver for stage 0–5 problems (src/domain) */
export type CoreSolverProps = Omit<SolverProps, "inst"> & { inst: ProblemInstance };
/** a solver for stage 6–9 problems (src/juku) */
export type JukuSolverProps = Omit<SolverProps, "inst"> & { inst: JInstance };

/** Fields for one question. A new resetKey starts empty fields; a filled set is sent to onComplete once. */
export function useFields(defs: FieldDef[], resetKey: string, autoSubmit: boolean, onComplete: (vals: string[]) => void) {
  const [state, setState] = useState<{ key: string; fs: FieldSet }>(() => ({ key: resetKey, fs: emptyFields(defs) }));
  // Updated inside the key handler, so a second tap that arrives before the next render sees the sent fields.
  const latest = useRef(state);
  const fs = state.key === resetKey ? state.fs : emptyFields(defs);

  const press = (k: Key) => {
    const base = latest.current.key === resetKey ? latest.current.fs : emptyFields(defs);
    const next = pressKey(base, defs, k, autoSubmit);
    if (next === base) return;
    latest.current = { key: resetKey, fs: next };
    setState(latest.current);
    if (next.done && !base.done) onComplete(next.vals);
  };

  return { fs, press };
}
