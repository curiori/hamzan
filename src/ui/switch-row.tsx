import { StyleSheet, Switch, View } from "react-native";
import { AppText } from "./text";
import { colors, radius } from "./theme";

/** A setting with a label, an optional note and an on/off switch. */
export function SwitchRow({ label, note, value, onChange }: { label: string; note?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText weight="bold">{label}</AppText>
        {note ? <AppText style={styles.note}>{note}</AppText> : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  text: { flex: 1, gap: 2 },
  note: { fontSize: 12, lineHeight: 17 },
});
