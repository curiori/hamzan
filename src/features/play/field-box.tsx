import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import type { FieldDef } from "./field-set";

/** One answer box; filled by the keypad only. */
export function FieldBox({ def, value, active, revealed, fontSize = 40 }: { def: FieldDef; value: string; active: boolean; revealed?: boolean; fontSize?: number }) {
  const width = Math.max(def.digits, value.length, 1) * fontSize * 0.62 + fontSize * 0.6;
  return (
    <View
      accessible
      accessibilityLabel={`${def.label} ${value || "からっぽ"}`}
      style={[styles.box, { width, height: fontSize * 1.45 }, active && styles.active, revealed && styles.revealed]}
    >
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[{ fontSize, fontVariant: ["tabular-nums"] }, revealed && styles.revealedText]}>
        {value}
      </AppText>
    </View>
  );
}

/** The fields of one answer side by side; a remainder field gets the word あまり in front. `active` -1 = none. */
export function FieldRow({ defs, vals, active, fontSize }: { defs: FieldDef[]; vals: string[]; active: number; fontSize: number }) {
  return (
    <View style={styles.row}>
      {defs.map((d, i) => (
        <View key={i} style={styles.item}>
          {d.role === "r" ? (
            <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: Math.round(fontSize * 0.6), marginHorizontal: 2 }}>
              あまり
            </AppText>
          ) : null}
          <FieldBox def={d} value={vals[i] ?? ""} active={i === active} fontSize={fontSize} />
        </View>
      ))}
    </View>
  );
}

/** "try again" and revealed-value notes under the fields */
export function SolverMessage({ text }: { text: string }) {
  return (
    <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite" style={styles.message}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", rowGap: 6 },
  item: { flexDirection: "row", alignItems: "center" },
  message: { marginTop: 6, fontSize: 17, textAlign: "center", color: colors.orange800 },
  box: {
    marginHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: "rgba(10,10,10,0.25)",
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  active: { borderColor: colors.primary, borderWidth: 3, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  revealed: { borderColor: colors.orange600 },
  revealedText: { color: colors.orange700 },
});
