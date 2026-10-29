import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./text";
import { colors, MAX_FONT_SCALE, radius } from "./theme";

const LAYOUTS = {
  /** phone order, for the PIN */
  phone: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"],
  /** the play keypad's order, for the key-speed test */
  calc: ["7", "8", "9", "4", "5", "6", "1", "2", "3", "", "0", "del"],
} as const;

/** Three-column number pad without OK. */
export function DigitPad({ layout, onKey, delLabel = "けす" }: { layout: keyof typeof LAYOUTS; onKey: (k: string) => void; delLabel?: string }) {
  return (
    <View style={styles.grid}>
      {LAYOUTS[layout].map((k, i) =>
        k === "" ? (
          <View key={i} style={styles.cell} />
        ) : (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={k === "del" ? delLabel : k}
            onPress={() => onKey(k)}
            style={({ pressed }) => [styles.cell, styles.key, pressed && styles.pressed]}
          >
            {k === "del" ? (
              <Ionicons name="backspace-outline" size={26} color={colors.foreground} />
            ) : (
              <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>
                {k}
              </AppText>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "stretch" },
  cell: { flexBasis: "30%", flexGrow: 1, height: 56 },
  key: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: colors.muted, transform: [{ scale: 0.96 }] },
  text: { fontSize: 26 },
});
