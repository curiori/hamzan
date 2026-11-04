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

/** A unit or word after a box; kanji get their reading above them. */
export function UnitLabel({ text, ruby, fontSize }: { text: string; ruby?: string; fontSize: number }) {
  if (!text) return null;
  const size = Math.round(fontSize * 0.6);
  return (
    <View style={styles.unit}>
      {ruby ? (
        <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.62) }}>
          {ruby}
        </AppText>
      ) : null}
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: size }}>
        {text}
      </AppText>
    </View>
  );
}

/** The boxes of a fraction: the whole number (if any) on the left, the numerator over the denominator. */
function FracFields({ defs, vals, active, fontSize }: { defs: FieldDef[]; vals: string[]; active: number; fontSize: number }) {
  const whole = defs.findIndex((d) => d.role === "whole");
  const num = defs.findIndex((d) => d.role === "num");
  const den = defs.findIndex((d) => d.role === "den");
  const size = Math.round(fontSize * 0.8);
  return (
    <View style={styles.row} accessibilityLabel="ぶんすう">
      {whole >= 0 ? <FieldBox def={defs[whole]} value={vals[whole] ?? ""} active={active === whole} fontSize={size} /> : null}
      <View style={styles.frac}>
        <FieldBox def={defs[num]} value={vals[num] ?? ""} active={active === num} fontSize={size} />
        <View style={[styles.bar, { height: Math.max(2, Math.round(size * 0.08)) }]} />
        <FieldBox def={defs[den]} value={vals[den] ?? ""} active={active === den} fontSize={size} />
      </View>
    </View>
  );
}

/** The fields of one answer side by side; a remainder field gets the word あまり in front, a unit after it. `active` -1 = none. */
export function FieldRow({ defs, vals, active, fontSize }: { defs: FieldDef[]; vals: string[]; active: number; fontSize: number }) {
  if (defs.some((d) => d.role === "den")) return <FracFields defs={defs} vals={vals} active={active} fontSize={fontSize} />;
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
          {d.suffix ? <UnitLabel text={d.suffix} ruby={d.suffixRuby} fontSize={fontSize} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", rowGap: 6 },
  item: { flexDirection: "row", alignItems: "center" },
  unit: { alignItems: "center", justifyContent: "flex-end", marginRight: 2 },
  frac: { alignItems: "center", marginHorizontal: 2, gap: 2 },
  bar: { alignSelf: "stretch", marginHorizontal: 6, backgroundColor: colors.foreground, borderRadius: 1 },
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
