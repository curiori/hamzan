import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "./theme";

export function ProgressBar({ value, label, style }: { value: number; label: string; style?: StyleProp<ViewStyle> }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, style]}
    >
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.muted, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 5 },
});
