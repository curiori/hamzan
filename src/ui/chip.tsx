import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { AppText } from "./text";
import { colors, radius } from "./theme";

/** Selectable pill (tabs, pickers). */
export function Chip({ label, selected, onPress, icon, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; icon?: ReactNode; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.on, pressed && !selected && styles.pressed]}
    >
      {icon}
      <AppText weight="bold" style={[styles.text, selected && styles.textOn]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.muted },
  text: { fontSize: 14 },
  textOn: { color: colors.primaryForeground },
});
