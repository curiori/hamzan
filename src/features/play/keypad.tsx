import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import type { FieldDef, Key } from "./field-set";

const DIGITS: Key[] = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

type Slot = "digit" | "zero" | "side" | "ok" | "bool";

function KeyButton({ k, label, onKey, disabled, slot, primary, a11y, height }: {
  k: Key;
  label?: string;
  onKey: (k: Key) => void;
  disabled: boolean;
  slot: Slot;
  primary?: boolean;
  a11y?: string;
  /** fixed key height; the OK and ○/× keys stretch instead */
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
        <AppText
          weight="bold"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.keyText, slot === "bool" && styles.boolText, primary && styles.primaryText, label && label.length > 1 && styles.smallText]}
        >
          {label ?? k}
        </AppText>
      )}
    </Pressable>
  );
}

/** Number keypad (or ○/× for divisibility answers); the system keyboard is never used. Both pads have the same height. */
export function Keypad({ def, canRem, onKey, disabled, compact }: { def: FieldDef | null; canRem: boolean; onKey: (k: Key) => void; disabled: boolean; compact: boolean }) {
  const keyH = compact ? KEY_H_COMPACT : KEY_H;
  const padHeight = { height: keyH * 4 + GAP * 3 };
  if (def?.kind === "bool")
    return (
      <View style={[styles.boolRow, padHeight]} accessibilityLabel="○か×">
        <KeyButton k="o" label="○" a11y="まる（ばいすう）" onKey={onKey} disabled={disabled} slot="bool" />
        <KeyButton k="x" label="×" a11y="ばつ（ばいすうではない）" onKey={onKey} disabled={disabled} slot="bool" />
      </View>
    );
  return (
    <View style={[styles.pad, padHeight]} accessibilityLabel="すうじキー">
      <View style={styles.digits}>
        {DIGITS.map((d) => (
          <KeyButton key={d} k={d} onKey={onKey} disabled={disabled} slot="digit" height={keyH} />
        ))}
        <KeyButton k="0" onKey={onKey} disabled={disabled} slot="zero" height={keyH} />
      </View>
      <View style={styles.side}>
        <KeyButton k="del" a11y="けす" onKey={onKey} disabled={disabled} slot="side" height={keyH} />
        <KeyButton k="rem" label="あまり" onKey={onKey} disabled={disabled || !canRem} slot="side" height={keyH} />
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
  side: {},
  ok: { flexGrow: 1 },
  bool: { flex: 1 },
});

const styles = StyleSheet.create({
  pad: { flexDirection: "row", gap: GAP },
  digits: { flex: 3, flexDirection: "row", flexWrap: "wrap", gap: GAP },
  side: { flex: 1, gap: GAP },
  boolRow: { flexDirection: "row", gap: 12 },
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
  smallText: { fontSize: 16 },
  primaryText: { color: colors.primaryForeground },
});
