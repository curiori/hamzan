import { StyleSheet, View } from "react-native";
import type { JInstance } from "@/juku/problem";
import { benchNotes, piTable, roundingLine } from "@/juku/scaffolds";
import { JLEVEL } from "@/juku/spec";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

// Picture hints of the juku.json levels (hint mode; the child types or picks the answer only).

function PiTable({ inst }: { inst: JInstance }) {
  const { rows, mark, shift } = piTable(inst.problem);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`3.14の だん: ${rows.map((r) => r.v).join("、")}`} style={styles.wrap}>
      <View style={styles.chips}>
        {rows.map((r) => (
          <View key={r.k} style={[styles.chip, r.k === mark && styles.chipMark]}>
            <AppText weight="bold" style={styles.chipHead}>{`3.14×${r.k}`}</AppText>
            <AppText weight="bold" style={styles.chipValue}>
              {r.v}
            </AppText>
          </View>
        ))}
      </View>
      {mark !== null && shift > 0 ? (
        <AppText weight="bold" style={styles.small}>
          {`×${10 ** shift}は しょうすうてんを みぎへ ${shift}つ`}
        </AppText>
      ) : null}
    </View>
  );
}

const PERCENT_ROWS: [string, string, string][] = [
  ["1", "100％", "10わり"],
  ["0.1", "10％", "1わり"],
  ["0.01", "1％", "1ぶ"],
  ["0.001", "0.1％", "1りん"],
];

function PercentTable() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="1は 100パーセント、10わり。0.1は 10パーセント、1わり。0.01は 1パーセント、1ぶ" style={styles.table}>
      {[["しょうすう", "ひゃくぶんりつ", "ぶあい"], ...PERCENT_ROWS].map((row, i) => (
        <View key={i} style={[styles.tableRow, i === 0 && styles.tableHead]}>
          {row.map((c, j) => (
            <AppText key={j} weight="bold" style={[styles.cell, i === 0 && styles.headText]}>
              {c}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

function RoundingLine({ v }: { v: string }) {
  const { lo, hi, mid, answer } = roundingLine(v);
  const x = (Number(v) - Number(lo)) / (Number(hi) - Number(lo));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`かずの せん。${lo}と ${hi}の まんなかは ${mid}`} style={styles.wrap}>
      <View style={styles.line}>
        <View style={styles.axis} />
        {[0, 0.5, 1].map((at) => (
          <View key={at} style={[styles.tick, { left: `${at * 100}%` }, at === 0.5 && styles.tickMid]} />
        ))}
        <View style={[styles.marker, { left: `${Math.min(1, Math.max(0, x)) * 100}%` }]} />
      </View>
      <View style={styles.labels}>
        <AppText weight="bold" style={[styles.label, answer === lo && styles.near]}>
          {lo}
        </AppText>
        <AppText weight="bold" style={styles.labelMid}>
          {`まんなか ${mid}`}
        </AppText>
        <AppText weight="bold" style={[styles.label, answer === hi && styles.near]}>
          {hi}
        </AppText>
      </View>
    </View>
  );
}

function Benchmarks({ inst }: { inst: JInstance }) {
  const b = benchNotes(inst.problem);
  if (!b) return null;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`めやす。${b.notes.join("、")}`} style={styles.note}>
      <AppText weight="bold" style={styles.noteHead}>
        めやす
      </AppText>
      {b.notes.map((n) => (
        <AppText key={n} weight="bold" style={styles.noteLine}>
          {n}
        </AppText>
      ))}
    </View>
  );
}

export function JukuVisual({ inst }: { inst: JInstance }) {
  const kind = JLEVEL[inst.levelId]?.scaffoldKind;
  if (kind === "VISUAL_PI_TABLE") return <PiTable inst={inst} />;
  if (kind === "VISUAL_PERCENT") return <PercentTable />;
  if (kind === "VISUAL_ROUNDING" && inst.problem.type === "round") return <RoundingLine v={inst.problem.v} />;
  if (kind === "VISUAL_BENCHMARK") return <Benchmarks inst={inst} />;
  return null;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 4, alignSelf: "stretch" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  chip: { minWidth: 58, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 4, paddingVertical: 1 },
  chipMark: { borderColor: colors.amber600, backgroundColor: colors.amber100 },
  chipHead: { fontSize: 9 },
  chipValue: { fontSize: 15, fontVariant: ["tabular-nums"] },
  small: { fontSize: 12 },
  table: { borderWidth: 2, borderColor: "rgba(10,10,10,0.3)", borderRadius: radius.md, overflow: "hidden" },
  tableRow: { flexDirection: "row" },
  tableHead: { backgroundColor: colors.muted },
  cell: { width: 92, textAlign: "center", fontSize: 15, paddingVertical: 2, fontVariant: ["tabular-nums"] },
  headText: { fontSize: 11 },
  line: { width: "86%", height: 26, justifyContent: "center" },
  axis: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "rgba(10,10,10,0.5)" },
  tick: { position: "absolute", width: 2, height: 18, marginLeft: -1, backgroundColor: "rgba(10,10,10,0.6)" },
  tickMid: { height: 12, backgroundColor: colors.sky600 },
  marker: { position: "absolute", width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: colors.amber600 },
  labels: { width: "92%", flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 14, fontVariant: ["tabular-nums"] },
  labelMid: { fontSize: 12, color: colors.sky700 },
  near: { color: colors.amber700, textDecorationLine: "underline" },
  note: { alignSelf: "stretch", backgroundColor: colors.muted, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, gap: 1 },
  noteHead: { fontSize: 11 },
  noteLine: { fontSize: 13, lineHeight: 18 },
});
