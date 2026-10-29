import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import type { FieldDef, Key } from "./field-set";

const DIGITS: Key[] = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

type Slot = "digit" | "zero" | "side" | "ok" | "bool";

function KeyButton({ k, label, onKey, disabled, slot, primary, a11y }: {
  k: Key;
  label?: string;
  onKey: (k: Key) => void;
  disabled: boolean;
  slot: Slot;
  primary?: boolean;
  a11y?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label ?? k}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onKey(k)}
      style={({ pressed }) => [styles.key, SLOT[slot], primary && styles.primary, pressed && styles.pressed, disabled && styles.disabled]}
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
export function Keypad({ def, canRem, onKey, disabled }: { def: FieldDef | null; canRem: boolean; onKey: (k: Key) => void; disabled: boolean }) {
  if (def?.kind === "bool")
    return (
      <View style={styles.boolRow} accessibilityLabel="○か×">
        <KeyButton k="o" label="○" a11y="まる（ばいすう）" onKey={onKey} disabled={disabled} slot="bool" />
        <KeyButton k="x" label="×" a11y="ばつ（ばいすうではない）" onKey={onKey} disabled={disabled} slot="bool" />
      </View>
    );
  return (
    <View style={styles.pad} accessibilityLabel="すうじキー">
      <View style={styles.digits}>
        {DIGITS.map((d) => (
          <KeyButton key={d} k={d} onKey={onKey} disabled={disabled} slot="digit" />
        ))}
        <KeyButton k="0" onKey={onKey} disabled={disabled} slot="zero" />
      </View>
      <View style={styles.side}>
        <KeyButton k="del" a11y="けす" onKey={onKey} disabled={disabled} slot="side" />
        <KeyButton k="rem" label="あまり" onKey={onKey} disabled={disabled || !canRem} slot="side" />
        <KeyButton k="ok" label="OK" onKey={onKey} disabled={disabled} slot="ok" primary />
      </View>
    </View>
  );
}

const KEY_H = 54;
const GAP = 8;
export const KEYPAD_HEIGHT = KEY_H * 4 + GAP * 3;

const SLOT = StyleSheet.create({
  digit: { flexBasis: "30%", flexGrow: 1, height: KEY_H },
  zero: { flexBasis: "100%", height: KEY_H },
  side: { height: KEY_H },
  ok: { flexGrow: 1 },
  bool: { flex: 1 },
});

const styles = StyleSheet.create({
  pad: { flexDirection: "row", gap: GAP, height: KEYPAD_HEIGHT },
  digits: { flex: 3, flexDirection: "row", flexWrap: "wrap", gap: GAP },
  side: { flex: 1, gap: GAP },
  boolRow: { flexDirection: "row", gap: 12, height: KEYPAD_HEIGHT },
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
