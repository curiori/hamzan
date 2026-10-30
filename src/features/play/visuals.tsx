import { StyleSheet, View } from "react-native";
import type { ProblemInstance } from "@/domain/problem";
import { LEVEL } from "@/domain/spec";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

// Picture hints for VISUAL_* scaffold kinds (hint mode only; the child types the answer only).

type Dot = "a" | "b" | "empty" | "cross";

const DOT_COLOR = { a: colors.amber500, b: colors.sky600, cross: "rgba(245,158,11,0.4)" } as const;

function Frame({ cells, label }: { cells: Dot[]; label: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.frame}>
      {cells.map((c, i) => (
        <View key={i} style={styles.cell}>
          {c !== "empty" && (
            <View style={[styles.dot, { backgroundColor: DOT_COLOR[c] }]}>
              {c === "cross" && <AppText weight="bold" style={styles.cross}>×</AppText>}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const fill = (n: number, kind: Dot, total = 10): Dot[] => Array.from({ length: total }, (_, i) => (i < n ? kind : "empty"));

function Dots({ n, color = colors.sky600, perRow = 10 }: { n: number; color?: string; perRow?: number }) {
  return (
    <View style={[styles.dots, { maxWidth: perRow * DOT + (perRow - 1) * GAP }]} accessible={false}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function NumberLine({ from, to, start, end }: { from: number; to: number; start: number; end: number }) {
  const ticks = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`かずの せん。${start}から ${end - start}こ すすむ`} style={styles.line}>
      {ticks.map((t) => (
        <View key={t} style={styles.tickCol}>
          <AppText style={[styles.hop, { color: t > start && t <= end ? colors.sky700 : "transparent" }]}>↷</AppText>
          <View style={styles.tickRow}>
            <View style={styles.axis} />
            <View style={[styles.tick, t === start && { backgroundColor: colors.amber600 }]} />
          </View>
          <AppText weight={t === start ? "bold" : "regular"} style={[styles.tickLabel, t === start && { color: colors.amber700 }]}>
            {t}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function PlaceValue({ n, shift }: { n: number; shift: number }) {
  const cols = ["せん", "ひゃく", "じゅう", "いち"];
  const digits = String(n).padStart(4, " ").split("");
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`くらいの ひょう。${n}を ${shift > 0 ? "ひだり" : "みぎ"}へ ${Math.abs(shift)}けた うごかす`}
      style={styles.pvWrap}
    >
      <View style={styles.pvTable}>
        {cols.map((c, i) => (
          <View key={c} style={[styles.pvCell, i < 3 && styles.pvDivider]}>
            <AppText weight="bold" style={styles.pvHead}>
              {c}
            </AppText>
            <AppText weight="bold" style={styles.pvDigit}>
              {digits[i].trim()}
            </AppText>
          </View>
        ))}
      </View>
      <AppText weight="bold" style={styles.small}>
        {shift > 0 ? `← ひだりへ ${shift}けた（0を ${shift}こ つける）` : `みぎへ ${-shift}けた（0を ${-shift}こ とる） →`}
      </AppText>
    </View>
  );
}

function SkipCount({ t }: { t: number }) {
  if (t === 10)
    return (
      <View style={styles.note}>
        <AppText weight="bold">×10は うしろに 0を つける</AppText>
      </View>
    );
  const row = Array.from({ length: 9 }, (_, i) => t * (i + 1));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${t}の だん: ${row.join("、")}`} style={styles.skip}>
      {row.map((v, i) => (
        <View key={v} style={styles.chip}>
          <AppText weight="bold" style={styles.chipHead}>{`${t}×${i + 1}`}</AppText>
          <AppText weight="bold" style={styles.chipValue}>
            {v}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function Visual({ inst }: { inst: ProblemInstance }) {
  const p = inst.problem;
  const kind = LEVEL[inst.levelId].scaffoldKind;
  if (kind === "VISUAL_TEN_FRAME") {
    if (p.shape === "complementTo") return <Frame cells={fill(p.a, "a")} label={`10マスの うち ${p.a}こ ぬってある`} />;
    if (p.shape === "decompose")
      return (
        <View style={styles.rowWrap}>
          <Frame cells={fill(10, "a")} label="10の かたまり" />
          <Dots n={p.n - 10} perRow={5} />
        </View>
      );
    if (p.shape === "binary" && p.op === "+" && inst.levelId === "0-2")
      return (
        <View style={styles.rowWrap}>
          <Frame cells={fill(10, "a")} label="10の かたまり" />
          <Dots n={p.a === 10 ? p.b : p.a} perRow={5} />
        </View>
      );
    if (p.shape === "binary" && p.op === "+") {
      const cells: Dot[] = Array.from({ length: 10 }, (_, i) => (i < p.a ? "a" : i < p.a + p.b ? "b" : "empty"));
      return <Frame cells={cells} label={`${p.a}こと ${p.b}こ`} />;
    }
    if (p.shape === "binary" && p.op === "-") {
      const cells: Dot[] = Array.from({ length: 10 }, (_, i) => (i < p.a - p.b ? "a" : i < p.a ? "cross" : "empty"));
      return <Frame cells={cells} label={`${p.a}こから ${p.b}こ とる`} />;
    }
  }
  if (kind === "VISUAL_PAIRS") {
    if (p.shape === "binary")
      return (
        <View accessible accessibilityRole="image" accessibilityLabel={`${p.a}こが 2れつ`} style={styles.pairs}>
          <Dots n={p.a} color={colors.amber500} />
          <Dots n={p.b} color={colors.amber500} />
        </View>
      );
    if (p.shape === "half")
      return (
        <View accessible accessibilityRole="image" accessibilityLabel={`${p.n}こを 2れつに わける`} style={styles.pairs}>
          <Dots n={p.n / 2} />
          <View style={styles.split} />
          <Dots n={p.n / 2} />
        </View>
      );
  }
  if (kind === "VISUAL_PLACE_VALUE" && p.shape === "binary")
    return <PlaceValue n={p.a} shift={p.op === "×" ? String(p.b).length - 1 : -(String(p.b).length - 1)} />;
  if (kind === "VISUAL_TENS_BLOCKS" && p.shape === "complementTo")
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={`10の かたまりが 10こ。${p.a / 10}こ ぬってある`} style={styles.blocks}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[styles.block, i < p.a / 10 && { backgroundColor: colors.amber500 }]} />
        ))}
      </View>
    );
  if (kind === "VISUAL_NUMBER_LINE") {
    if (p.shape === "binary") {
      const big = Math.max(p.a, p.b);
      const small = Math.min(p.a, p.b);
      return <NumberLine from={Math.max(0, big - 1)} to={big + 3} start={big} end={big + small} />;
    }
    if (p.shape === "missingAddend") return <NumberLine from={p.b} to={p.total} start={p.b} end={p.total} />;
  }
  if (kind === "VISUAL_SKIP_COUNT") {
    if (p.shape === "missingFactor") return <SkipCount t={p.known} />;
    if (p.shape === "binary" && p.op === "÷") return <SkipCount t={p.b} />;
    if (p.shape === "binary") return <SkipCount t={inst.tableFactor ?? p.b} />;
  }
  return null;
}

// Sized so the tallest picture plus the answer box fits the iPhone SE play card (see play-screen compact).
const CELL = 26;
const DOT = 20;
const GAP = 5;
const PAD = 6;
const BORDER = 2;

const styles = StyleSheet.create({
  frame: {
    // RN widths include padding and border; five cells a row
    width: CELL * 5 + GAP * 4 + PAD * 2 + BORDER * 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    padding: PAD,
    borderRadius: radius.md,
    borderWidth: BORDER,
    borderColor: "rgba(10,10,10,0.3)",
    backgroundColor: colors.card,
  },
  cell: { width: CELL, height: CELL, borderRadius: 6, borderWidth: 1, borderColor: "rgba(10,10,10,0.15)", alignItems: "center", justifyContent: "center" },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: "center", justifyContent: "center" },
  cross: { color: colors.red700, fontSize: 15, lineHeight: 17 },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 },
  pairs: { gap: 6 },
  split: { borderTopWidth: 2, borderStyle: "dashed", borderColor: "rgba(10,10,10,0.4)" },
  line: { flexDirection: "row", width: "100%", maxWidth: 360 },
  tickCol: { flex: 1, alignItems: "center" },
  hop: { fontSize: 18, height: 22 },
  tickRow: { width: "100%", height: 16, justifyContent: "center", alignItems: "center" },
  axis: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "rgba(10,10,10,0.5)" },
  tick: { width: 2, height: 16, backgroundColor: "rgba(10,10,10,0.6)" },
  tickLabel: { marginTop: 2, fontSize: 13, fontVariant: ["tabular-nums"] },
  pvWrap: { alignItems: "center", gap: 4 },
  pvTable: { flexDirection: "row", borderWidth: 2, borderColor: "rgba(10,10,10,0.3)", borderRadius: radius.md, overflow: "hidden" },
  pvCell: { alignItems: "center", minWidth: 48 },
  pvDivider: { borderRightWidth: 1, borderColor: "rgba(10,10,10,0.2)" },
  pvHead: { fontSize: 10, backgroundColor: colors.muted, alignSelf: "stretch", textAlign: "center", paddingVertical: 2 },
  pvDigit: { fontSize: 22, paddingVertical: 2, fontVariant: ["tabular-nums"] },
  small: { fontSize: 12 },
  note: { backgroundColor: colors.muted, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  skip: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  chip: { minWidth: 40, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 5, paddingVertical: 1 },
  chipHead: { fontSize: 9 },
  chipValue: { fontSize: 15, fontVariant: ["tabular-nums"] },
  blocks: { flexDirection: "row", gap: 6 },
  block: { width: 18, height: 60, borderRadius: 4, borderWidth: 1, borderColor: "rgba(10,10,10,0.2)", backgroundColor: colors.card },
});
