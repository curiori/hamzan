import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { answerText, sameStep, stepText } from "@/domain/problem";
import { hintLines, scaffoldOf } from "@/domain/scaffolds";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import { AnswerSolver } from "./answer-solver";
import { FieldRow } from "./field-box";
import { defsForAnswer, toStep } from "./field-set";
import { activeStep, expectedStep, initHint, submitHintStep } from "./hint-flow";
import { Keypad } from "./keypad";
import { useFields, type SolverProps } from "./solver";
import { Visual } from "./visuals";

const RULE_CARD = ["2・5は いちのくらい", "4は したの 2けた", "8は したの 3けた", "3・9は かくくらいの かずを たす", "6は 2と 3の りょうほう"];
const LINE_SIZE = 22;
// "かくくらいの かずを たすと" and its box share one line on a 375pt screen only below 22
const LINE_SIZE_COMPACT = 20;

/** Hint mode: fill the hint blanks one by one. Levels without hint steps show a picture and allow a second try. */
export function HintSolver(props: SolverProps) {
  const { inst, autoSubmit, compact, locked, onDone, sfx, render } = props;
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
  const size = compact ? LINE_SIZE_COMPACT : LINE_SIZE;
  const ln = compact ? lineCompact : lineRegular;

  return render({
    body: (
      <>
        {sc.kind === "DIVISIBILITY_RULE" ? (
          <View accessible accessibilityLabel={RULE_CARD.join("、")} style={[styles.rule, compact && styles.ruleCompact]}>
            {RULE_CARD.map((rule, i) => (
              <AppText key={rule} weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.ruleText, compact && styles.ruleTextCompact]}>
                {i < RULE_CARD.length - 1 ? `${rule}／` : rule}
              </AppText>
            ))}
          </View>
        ) : null}
        <View accessibilityLabel="ヒント" style={[styles.lines, compact && styles.linesCompact]}>
          {lines.map((line, li) => (
            <View key={li} style={styles.line}>
              {line.map((t, ti) => {
                if (t.t === "text")
                  return (
                    <AppText key={ti} weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={ln.text}>
                      {t.v}
                    </AppText>
                  );
                const v = hs.filled[t.step];
                if (t.step === active && firstUse.get(t.step) === `${li}:${ti}`)
                  return <FieldRow key={ti} defs={defs} vals={fs.vals} active={locked ? -1 : fs.active} fontSize={size} />;
                if (v !== null)
                  return (
                    <View key={ti} style={[ln.chip, hs.revealed[t.step] ? styles.chipRevealed : styles.chipOk]}>
                      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[ln.text, { color: hs.revealed[t.step] ? colors.orange900 : colors.green900 }]}>
                        {stepText(v)}
                      </AppText>
                    </View>
                  );
                return <View key={ti} style={ln.blank} />;
              })}
            </View>
          ))}
        </View>
      </>
    ),
    keypad: <Keypad def={def} canRem={def?.role === "q"} onKey={press} disabled={locked || active < 0} compact={compact} />,
    note: hs.msg,
  });
}

const lineStyles = (size: number) =>
  StyleSheet.create({
    text: { fontSize: size, flexShrink: 1, fontVariant: ["tabular-nums"] },
    chip: { marginHorizontal: 4, minWidth: size * 1.6, borderRadius: radius.sm, paddingHorizontal: 6, alignItems: "center" },
    blank: { marginHorizontal: 4, width: size * 1.6, height: size * 1.3, borderRadius: radius.sm, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(10,10,10,0.3)" },
  });
const lineRegular = lineStyles(LINE_SIZE);
const lineCompact = lineStyles(LINE_SIZE_COMPACT);

const styles = StyleSheet.create({
  visual: { alignSelf: "stretch", alignItems: "center", marginBottom: 6 },
  // the card breaks its lines only between rules
  rule: { flexDirection: "row", flexWrap: "wrap", backgroundColor: colors.muted, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 },
  ruleCompact: { paddingVertical: 4, marginBottom: 4 },
  ruleText: { fontSize: 12, lineHeight: 17, flexShrink: 1 },
  ruleTextCompact: { fontSize: 11, lineHeight: 15 },
  lines: { gap: 6, alignSelf: "stretch" },
  linesCompact: { gap: 4 },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 4 },
  chipOk: { backgroundColor: colors.green100 },
  chipRevealed: { backgroundColor: colors.orange100 },
});
