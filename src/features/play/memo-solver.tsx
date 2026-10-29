import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { answerText, digitsOf, sameAnswer } from "@/domain/problem";
import { scaffoldOf } from "@/domain/scaffolds";
import { AppText } from "@/ui/text";
import { MAX_FONT_SCALE } from "@/ui/theme";
import { AnswerSolver } from "./answer-solver";
import { FieldRow } from "./field-box";
import { defsForAnswer, toAnswer, type FieldDef } from "./field-set";
import { Keypad } from "./keypad";
import { useFields, type SolverProps } from "./solver";

/** Memo mode: write the memo numbers, then the answer. Right only when the memo and the answer are both right. */
export function MemoSolver(props: SolverProps) {
  const { inst, autoSubmit, locked, onDone, render } = props;
  const memo = useMemo(() => scaffoldOf(inst.levelId, inst.problem).memo, [inst]);
  const defs = useMemo<FieldDef[]>(
    () => [...memo.map((m, i) => ({ kind: "num" as const, digits: digitsOf(m), label: `メモ${i + 1}`, role: "plain" as const })), ...defsForAnswer(inst.answer)],
    [memo, inst],
  );
  const { fs, press } = useFields(defs, "m", autoSubmit, (vals) => {
    const memoOk = memo.every((m, i) => Number(vals[i]) === m);
    const given = toAnswer(defs.slice(memo.length), vals.slice(memo.length), inst.answer);
    const ansOk = sameAnswer(given, inst.answer);
    onDone({ correct: memoOk && ansOk, given: ansOk ? null : given, reveal: `メモ ${memo.join("、")} → ${answerText(inst.answer)}` });
  });
  if (!memo.length) return <AnswerSolver {...props} />;

  const active = locked ? -1 : fs.active;
  const def = defs[fs.active] ?? null;
  return render({
    body: (
      <>
        <View style={styles.memo}>
          <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.memoLabel}>
            メモ
          </AppText>
          <FieldRow defs={defs.slice(0, memo.length)} vals={fs.vals.slice(0, memo.length)} active={active} fontSize={28} />
        </View>
        <FieldRow defs={defs.slice(memo.length)} vals={fs.vals.slice(memo.length)} active={active < 0 ? -1 : active - memo.length} fontSize={36} />
      </>
    ),
    keypad: <Keypad def={def} canRem={def?.role === "q"} onKey={press} disabled={locked} />,
  });
}

const styles = StyleSheet.create({
  memo: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 8 },
  memoLabel: { fontSize: 14 },
});
