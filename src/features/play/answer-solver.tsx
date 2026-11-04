import { useMemo, useState, type ReactNode } from "react";
import { answerText, sameAnswer } from "@/domain/problem";
import { FieldRow } from "./field-box";
import { defsForAnswer, toAnswer } from "./field-set";
import { Keypad } from "./keypad";
import { useFields, type CoreSolverProps } from "./solver";

/** Speed mode, warm-ups and checks: the answer only. tries 2 gives a second go (hint mode without hint steps). */
export function AnswerSolver({ inst, autoSubmit, compact, locked, onDone, sfx, render, tries = 1, before }: CoreSolverProps & { tries?: number; before?: ReactNode }) {
  const defs = useMemo(() => defsForAnswer(inst.answer), [inst]);
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const { fs, press } = useFields(defs, `a${attempt}`, autoSubmit, (vals) => {
    const given = toAnswer(defs, vals, inst.answer);
    const ok = sameAnswer(given, inst.answer);
    if (!ok && attempt + 1 < tries) {
      sfx("miss");
      setMsg("ちがうよ。もういちど");
      setAttempt((a) => a + 1);
      return;
    }
    onDone({ correct: ok, given: ok ? null : given, reveal: answerText(inst.answer) });
  });
  const def = defs[fs.active] ?? null;

  return render({
    body: (
      <>
        {before}
        <FieldRow defs={defs} vals={fs.vals} active={locked ? -1 : fs.active} fontSize={36} />
      </>
    ),
    keypad: <Keypad def={def} canRem={def?.role === "q"} onKey={press} disabled={locked} compact={compact} />,
    note: msg,
  });
}
