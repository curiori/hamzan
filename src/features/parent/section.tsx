import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";

/** A titled block inside a parent-area pane. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { fontSize: 16 },
});
