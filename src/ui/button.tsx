import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "./text";
import { colors, radius } from "./theme";

type Variant = "primary" | "outline" | "ghost" | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  accessibilityLabel,
  maxFontSizeMultiplier,
  style,
}: {
  label?: string;
  onPress: () => void;
  variant?: Variant;
  size?: "md" | "lg";
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** how far the label grows with the system's text size (AppText's cap when not given) */
  maxFontSizeMultiplier?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, size === "lg" ? styles.lg : styles.md, v.box, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={styles.row}>
        {icon}
        {label ? (
          <AppText weight="bold" maxFontSizeMultiplier={maxFontSizeMultiplier} style={[{ color: v.text }, size === "lg" ? styles.lgText : styles.mdText]}>
            {label}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { box: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: colors.primary, borderColor: colors.primary }, text: colors.primaryForeground },
  outline: { box: { backgroundColor: colors.card, borderColor: colors.border }, text: colors.foreground },
  ghost: { box: { backgroundColor: "transparent", borderColor: "transparent" }, text: colors.foreground },
  destructive: { box: { backgroundColor: colors.destructive, borderColor: colors.destructive }, text: colors.primaryForeground },
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  md: { minHeight: 44 },
  lg: { minHeight: 52 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 17 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});
