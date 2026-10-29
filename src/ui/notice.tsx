import { StyleSheet, View } from "react-native";
import { Button } from "./button";
import { AppText } from "./text";
import { colors } from "./theme";

/** A full screen with one message and one way out (a screen opened without what it needs). */
export function Notice({ text, actionLabel, onAction }: { text: string; actionLabel: string; onAction: () => void }) {
  return (
    <View style={styles.root}>
      <AppText weight="bold" style={styles.text}>
        {text}
      </AppText>
      <Button label={actionLabel} onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colors.background },
  text: { fontSize: 18, textAlign: "center" },
});
