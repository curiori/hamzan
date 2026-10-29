import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { answerText, sameStep, stepText } from "@/domain/problem";
import { hintLines, scaffoldOf } from "@/domain/scaffolds";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import { AnswerSolver } from "./answer-solver";
import { FieldRow, SolverMessage } from "./field-box";
import { defsForAnswer, toStep } from "./field-set";
import { activeStep, expectedStep, initHint, submitHintStep } from "./hint-flow";
import { Keypad } from "./keypad";
import { useFields, type SolverProps } from "./solver";
import { Visual } from "./visuals";

const RULE_CARD = "2・5は いちのくらい／4は したの 2けた／8は したの 3けた／3・9は かくくらいの かずを たす／6は 2と 3の りょうほう";
const LINE_SIZE = 22;

/** Hint mode: fill the hint blanks one by one. Levels without hint steps show a picture and allow a second try. */
export function HintSolver(props: SolverProps) {
  const { inst, autoSubmit, locked, onDone, sfx, render } = props;
  const sc = useMemo(() => scaffoldOf(inst.levelId, inst.problem), [inst]);
  const lines = useMemo(() => hintLines(inst.levelId, inst.problem), [inst]);
  const [hs, setHs] = useState(() => initHint(sc.steps.length));
  const active = activeStep(hs);
  const want = active >= 0 && sc.steps.length ? expectedStep(inst, sc, hs, active) : null;
  const defs = useMemo(() => (want === null ? [] : defsForAnswer(want, "□")), [want]);
  const { fs, press } = useFields(defs, `h${active}-${hs.attempt}`, autoSubmit, (vals) => {
    if (active < 0) return;
    const value = toStep(vals, sc.steps[active]);
    const guess = sc.kind === "ESTIMATE_DIVIDE" && inst.problem.shape === "binary" && active === 0;
    const stepOk = sameStep(value, expectedStep(inst, sc, hs, active));
    const r = submitHintStep(hs, inst, sc, value);
    setHs(r.state);
    if (!guess) sfx(r.event === "retry" || !stepOk ? "miss" : "ok");
    if (r.event === "done") onDone({ correct: !!r.correct, given: null, reveal: answerText(inst.answer) });
  });

  if (!sc.steps.length)
    return (
      <AnswerSolver
        {...props}
        tries={2}
        before={
          <View style={styles.visual}>
            <Visual inst={inst} />
          </View>
        }
      />
    );

  // a step can appear on several lines; the input sits where it first appears
  const firstUse = new Map<number, string>();
  lines.forEach((ln, li) =>
    ln.forEach((t, ti) => {
      if (t.t === "blank" && !firstUse.has(t.step)) firstUse.set(t.step, `${li}:${ti}`);
    }),
  );
  const def = defs[fs.active] ?? null;

  return render({
    body: (
      <>
        {sc.kind === "DIVISIBILITY_RULE" ? (
          <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>
            {RULE_CARD}
          </AppText>
        ) : null}
        <View accessibilityLabel="ヒント" style={styles.lines}>
          {lines.map((ln, li) => (
            <View key={li} style={styles.line}>
              {ln.map((t, ti) => {
                if (t.t === "text")
                  return (
                    <AppText key={ti} weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>
                      {t.v}
                    </AppText>
                  );
                const v = hs.filled[t.step];
                if (t.step === active && firstUse.get(t.step) === `${li}:${ti}`)
                  return <FieldRow key={ti} defs={defs} vals={fs.vals} active={locked ? -1 : fs.active} fontSize={LINE_SIZE} />;
                if (v !== null)
                  return (
                    <View key={ti} style={[styles.chip, hs.revealed[t.step] ? styles.chipRevealed : styles.chipOk]}>
                      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.text, { color: hs.revealed[t.step] ? colors.orange900 : colors.green900 }]}>
                        {stepText(v)}
                      </AppText>
                    </View>
                  );
                return <View key={ti} style={styles.blank} />;
              })}
            </View>
          ))}
        </View>
        {hs.msg ? <SolverMessage text={hs.msg} /> : null}
      </>
    ),
    keypad: <Keypad def={def} canRem={def?.role === "q"} onKey={press} disabled={locked || active < 0} />,
  });
}

const styles = StyleSheet.create({
  visual: { alignSelf: "stretch", alignItems: "center", marginBottom: 10 },
  rule: { fontSize: 12, lineHeight: 17, backgroundColor: colors.muted, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, overflow: "hidden" },
  lines: { gap: 6, alignSelf: "stretch" },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 4 },
  text: { fontSize: LINE_SIZE, flexShrink: 1, fontVariant: ["tabular-nums"] },
  chip: { marginHorizontal: 4, minWidth: LINE_SIZE * 1.6, borderRadius: radius.sm, paddingHorizontal: 6, alignItems: "center" },
  chipOk: { backgroundColor: colors.green100 },
  chipRevealed: { backgroundColor: colors.orange100 },
  blank: { marginHorizontal: 4, width: LINE_SIZE * 1.6, height: LINE_SIZE * 1.3, borderRadius: radius.sm, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(10,10,10,0.3)" },
});
