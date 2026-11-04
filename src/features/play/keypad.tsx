import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { groupDigits } from "@/juku/problem";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import type { FieldDef, Key } from "./field-set";

const DIGITS: Key[] = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
const CHOICE_KEYS: Key[] = ["c0", "c1", "c2", "c3"];

type Slot = "digit" | "zero" | "dot" | "side" | "ok" | "bool" | "choice";

function KeyButton({ k, label, caption, onKey, disabled, slot, primary, a11y, height }: {
  k: Key;
  label?: string;
  /** a small word under a ○ or × */
  caption?: string;
  onKey: (k: Key) => void;
  disabled: boolean;
  slot: Slot;
  primary?: boolean;
  a11y?: string;
  /** fixed key height; the OK, ○/× and option keys stretch instead */
  height?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label ?? k}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onKey(k)}
      style={({ pressed }) => [styles.key, SLOT[slot], height !== undefined && { height }, primary && styles.primary, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {k === "del" ? (
        <Ionicons name="backspace-outline" size={26} color={colors.foreground} />
      ) : (
        <>
          <AppText
            weight="bold"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            numberOfLines={slot === "choice" ? 2 : 1}
            adjustsFontSizeToFit={slot === "choice"}
            minimumFontScale={0.6}
            style={[
              styles.keyText,
              slot === "bool" && (caption ? styles.boolTextSmall : styles.boolText),
              slot === "choice" && styles.choiceText,
              primary && styles.primaryText,
              slot !== "choice" && label && label.length > 1 && styles.smallText,
            ]}
          >
            {label ?? k}
          </AppText>
          {caption ? (
            <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.caption}>
              {caption}
            </AppText>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/**
 * Number keypad (or ○/× for yes-no answers, or the options of a 4択); the system keyboard is never used. Every pad has
 * the same height. `dot` adds the decimal point next to 0 (stages 6–9); `next` turns the middle key into つぎ (the next
 * box of a fraction or a pair) instead of あまり.
 */
export function Keypad({
  def,
  canRem,
  onKey,
  disabled,
  compact,
  dot = false,
  next = false,
}: {
  def: FieldDef | null;
  canRem: boolean;
  onKey: (k: Key) => void;
  disabled: boolean;
  compact: boolean;
  dot?: boolean;
  next?: boolean;
}) {
  const keyH = compact ? KEY_H_COMPACT : KEY_H;
  const padHeight = { height: keyH * 4 + GAP * 3 };
  if (def?.kind === "bool") {
    const [yes, no] = def.options ?? [];
    return (
      <View style={[styles.boolRow, padHeight]} accessibilityLabel="○か×">
        <KeyButton k="o" label="○" caption={yes} a11y={yes ? `まる（${yes}）` : "まる（ばいすう）"} onKey={onKey} disabled={disabled} slot="bool" />
        <KeyButton k="x" label="×" caption={no} a11y={no ? `ばつ（${no}）` : "ばつ（ばいすうではない）"} onKey={onKey} disabled={disabled} slot="bool" />
      </View>
    );
  }
  if (def?.kind === "choice") {
    const options = def.options ?? [];
    return (
      <View style={[styles.choices, padHeight]} accessibilityLabel="えらぶ">
        {options.map((o, i) => (
          <KeyButton key={o} k={CHOICE_KEYS[i]} label={groupDigits(o)} onKey={onKey} disabled={disabled} slot="choice" />
        ))}
      </View>
    );
  }
  const dotOn = def?.kind === "dec";
  return (
    <View style={[styles.pad, padHeight]} accessibilityLabel="すうじキー">
      <View style={styles.digits}>
        {DIGITS.map((d) => (
          <KeyButton key={d} k={d} onKey={onKey} disabled={disabled} slot="digit" height={keyH} />
        ))}
        <KeyButton k="0" onKey={onKey} disabled={disabled} slot={dot ? "digit" : "zero"} height={keyH} />
        {dot ? <KeyButton k="dot" label="." a11y="てん" onKey={onKey} disabled={disabled || !dotOn} slot="dot" height={keyH} /> : null}
      </View>
      <View style={styles.side}>
        <KeyButton k="del" a11y="けす" onKey={onKey} disabled={disabled} slot="side" height={keyH} />
        {next ? (
          <KeyButton k="next" label="つぎ" a11y="つぎの ます" onKey={onKey} disabled={disabled || !canRem} slot="side" height={keyH} />
        ) : (
          <KeyButton k="rem" label="あまり" onKey={onKey} disabled={disabled || !canRem} slot="side" height={keyH} />
        )}
        <KeyButton k="ok" label="OK" onKey={onKey} disabled={disabled} slot="ok" primary />
      </View>
    </View>
  );
}

const KEY_H = 54;
// still above the 44pt touch minimum; buys the iPhone SE play screen its last rows
const KEY_H_COMPACT = 50;
const GAP = 8;

const SLOT = StyleSheet.create({
  digit: { flexBasis: "30%", flexGrow: 1 },
  zero: { flexBasis: "100%" },
  dot: { flexBasis: "30%", flexGrow: 1 },
  side: {},
  ok: { flexGrow: 1 },
  bool: { flex: 1 },
  choice: { flexBasis: "45%", flexGrow: 1, paddingHorizontal: 6 },
});

const styles = StyleSheet.create({
  pad: { flexDirection: "row", gap: GAP },
  digits: { flex: 3, flexDirection: "row", flexWrap: "wrap", gap: GAP },
  side: { flex: 1, gap: GAP },
  boolRow: { flexDirection: "row", gap: 12 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: GAP, alignContent: "stretch" },
  key: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.muted, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
  keyText: { fontSize: 26 },
  boolText: { fontSize: 64, lineHeight: 76 },
  boolTextSmall: { fontSize: 52, lineHeight: 60 },
  caption: { fontSize: 18 },
  choiceText: { fontSize: 22, textAlign: "center", fontVariant: ["tabular-nums"] },
  smallText: { fontSize: 16 },
  primaryText: { color: colors.primaryForeground },
});
