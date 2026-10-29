import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@/ui/theme";

/** Scrollable card in the middle of the screen; the keyboard pushes it up on iOS. */
export function OnboardingFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 },
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20 },
});
