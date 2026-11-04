import { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { revealOf } from "@/course/problems";
import { jJudge, JUDGE_NOTE_TEXT } from "@/juku/judge";
import { dec, eqDec } from "@/juku/num";
import { jAnswerText, type JAnswer } from "@/juku/problem";
import { jScaffoldOf } from "@/juku/scaffolds";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import { FieldRow, UnitLabel } from "./field-box";
import type { FieldDef } from "./field-set";
import { hasNextBox, jDefsFor, jToAnswer } from "./juku-fields";
import { activeJStep, initJHint, submitJStep } from "./juku-hint-flow";
import { JukuVisual } from "./juku-visuals";
import { Keypad } from "./keypad";
import { useFields, type JukuSolverProps } from "./solver";

// Solvers for juku.json problems: the same three modes as the core solvers (answer only, hint, memo).

function JukuKeypad({ defs, active, onKey, disabled, compact }: { defs: FieldDef[]; active: number; onKey: Parameters<typeof Keypad>[0]["onKey"]; disabled: boolean; compact: boolean }) {
  const def = defs[active] ?? null;
  return <Keypad def={def} canRem={hasNextBox(defs, active)} next onKey={onKey} disabled={disabled} compact={compact} dot />;
}

/** Speed mode, warm-ups and checks: the answer only. tries 2 gives a second go (hint mode of picture hints). */
export function JukuAnswerSolver({ inst, autoSubmit, compact, locked, onDone, sfx, render, tries = 1, before }: JukuSolverProps & { tries?: number; before?: ReactNode }) {
  const defs = useMemo(() => jDefsFor(inst.answer), [inst]);
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const { fs, press } = useFields(defs, `a${attempt}`, autoSubmit, (vals) => {
    const given = jToAnswer(vals, inst.answer);
    const j = jJudge(inst.answer, given);
    if (!j.correct && attempt + 1 < tries) {
      sfx("miss");
      setMsg(`${j.note ? JUDGE_NOTE_TEXT[j.note] : "ちがうよ"}。もういちど`);
      setAttempt((a) => a + 1);
      return;
    }
    const r = revealOf(inst, given);
    onDone({ correct: j.correct, given: j.correct ? null : given, reveal: r.answer, note: r.note });
  });
  const tap = inst.answer.kind === "choice" || inst.answer.kind === "tf";
  return render({
    body: (
      <>
        {before}
        {/* options and ○× are answered with one tap on the pad: no box to fill */}
        {tap ? null : <FieldRow defs={defs} vals={fs.vals} active={locked ? -1 : fs.active} fontSize={36} />}
      </>
    ),
    keypad: <JukuKeypad defs={defs} active={fs.active} onKey={press} disabled={locked} compact={compact} />,
    note: msg,
  });
}

/** Memo mode: write the memo numbers, then the answer. Right only when the memo and the answer are both right. */
export function JukuMemoSolver(props: JukuSolverProps) {
  const { inst, autoSubmit, locked, onDone, render } = props;
  const memo = useMemo(() => jScaffoldOf(inst.levelId, inst.problem).memo, [inst]);
  const answerDefs = useMemo(() => jDefsFor(inst.answer), [inst]);
  const defs = useMemo<FieldDef[]>(() => [...memo.flatMap((m, i) => jDefsFor(m, `メモ${i + 1}`)), ...answerDefs], [memo, answerDefs]);
  const { fs, press } = useFields(defs, "m", autoSubmit, (vals) => {
    const memoOk = memo.every((m, i) => m.kind === "dec" && eqDecText(vals[i], m.v));
    const given = jToAnswer(vals.slice(memo.length), inst.answer);
    const ansOk = jJudge(inst.answer, given).correct;
    const r = revealOf(inst, ansOk ? null : given);
    onDone({ correct: memoOk && ansOk, given: ansOk ? null : given, reveal: `メモ ${memo.map(jAnswerText).join("、")} → ${r.answer}`, note: r.note });
  });
  if (!memo.length) return <JukuAnswerSolver {...props} />;
  const active = locked ? -1 : fs.active;
  return render({
    body: (
      <>
        <View style={styles.memo}>
          <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.memoLabel}>
            メモ
          </AppText>
          <FieldRow defs={defs.slice(0, memo.length)} vals={fs.vals.slice(0, memo.length)} active={active} fontSize={28} />
        </View>
        <FieldRow defs={answerDefs} vals={fs.vals.slice(memo.length)} active={active < 0 ? -1 : active - memo.length} fontSize={36} />
      </>
    ),
    keypad: <JukuKeypad defs={defs} active={fs.active} onKey={press} disabled={locked} compact={props.compact} />,
  });
}

const eqDecText = (typed: string | undefined, want: string) => {
  try {
    return !!typed && eqDec(dec(typed.endsWith(".") ? typed.slice(0, -1) : typed), dec(want));
  } catch {
    return false;
  }
};

const LINE_SIZE = 22;
const LINE_SIZE_COMPACT = 20;

/** Hint mode: fill the hint blanks one by one. Levels with a picture hint show it and allow a second try. */
export function JukuHintSolver(props: JukuSolverProps) {
  const { inst, autoSubmit, compact, locked, onDone, sfx, render } = props;
  const sc = useMemo(() => jScaffoldOf(inst.levelId, inst.problem), [inst]);
  const [hs, setHs] = useState(() => initJHint(sc.steps.length));
  const active = activeJStep(hs);
  const want: JAnswer | null = active >= 0 ? (sc.steps[active] ?? null) : null;
  const defs = useMemo(() => (want === null ? [] : jDefsFor(want, "□")), [want]);
  const { fs, press } = useFields(defs, `h${active}-${hs.attempt}`, autoSubmit, (vals) => {
    if (active < 0 || !want) return;
    const r = submitJStep(hs, sc.steps, jToAnswer(vals, want));
    setHs(r.state);
    sfx(r.event === "retry" || r.event === "revealed" ? "miss" : "ok");
    if (r.event === "done") onDone({ correct: !!r.correct, given: null, reveal: jAnswerText(inst.answer) });
  });

  if (!sc.steps.length)
    return (
      <JukuAnswerSolver
        {...props}
        tries={2}
        before={
          <View style={styles.visual}>
            <JukuVisual inst={inst} />
          </View>
        }
      />
    );

  const firstUse = new Map<number, string>();
  sc.lines.forEach((ln, li) =>
    ln.forEach((t, ti) => {
      if (t.t === "blank" && !firstUse.has(t.step)) firstUse.set(t.step, `${li}:${ti}`);
    }),
  );
  const size = compact ? LINE_SIZE_COMPACT : LINE_SIZE;
  const ln = compact ? lineCompact : lineRegular;
  const choosing = want !== null && (want.kind === "choice" || want.kind === "tf");

  return render({
    body: (
      <View accessibilityLabel="ヒント" style={[styles.lines, compact && styles.linesCompact]}>
        {sc.lines.map((line, li) => (
          <View key={li} style={styles.line}>
            {line.map((t, ti) => {
              if (t.t === "text")
                return (
                  <AppText key={ti} weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={ln.text}>
                    {t.v}
                  </AppText>
                );
              const v = hs.filled[t.step];
              if (t.step === active && firstUse.get(t.step) === `${li}:${ti}`) {
                if (choosing) return <View key={ti} style={[ln.blank, styles.blankActive]} />;
                return <FieldRow key={ti} defs={defs} vals={fs.vals} active={locked ? -1 : fs.active} fontSize={size} />;
              }
              if (v !== null) {
                const unit = v.kind === "dec" ? v.unit : undefined;
                return (
                  <View key={ti} style={styles.filled}>
                    <View style={[ln.chip, hs.revealed[t.step] ? styles.chipRevealed : styles.chipOk]}>
                      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[ln.text, { color: hs.revealed[t.step] ? colors.orange900 : colors.green900 }]}>
                        {v.kind === "dec" ? v.v : jAnswerText(v)}
                      </AppText>
                    </View>
                    {unit ? <UnitLabel text={unit.v} ruby={unit.r} fontSize={size} /> : null}
                  </View>
                );
              }
              return <View key={ti} style={ln.blank} />;
            })}
          </View>
        ))}
      </View>
    ),
    keypad: <JukuKeypad defs={defs} active={fs.active} onKey={press} disabled={locked || active < 0} compact={compact} />,
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
  memo: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 8 },
  memoLabel: { fontSize: 14 },
  lines: { gap: 6, alignSelf: "stretch" },
  linesCompact: { gap: 4 },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 4 },
  filled: { flexDirection: "row", alignItems: "center" },
  blankActive: { borderColor: colors.primary, borderStyle: "solid" },
  chipOk: { backgroundColor: colors.green100 },
  chipRevealed: { backgroundColor: colors.orange100 },
});
