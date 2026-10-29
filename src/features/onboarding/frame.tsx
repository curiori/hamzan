import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ParentButton } from "@/features/home/header-actions";
import { colors, radius } from "@/ui/theme";

/** Scrollable card in the middle of the screen; the keyboard pushes it up on iOS. onParent shows the parent-area button. */
export function OnboardingFrame({ children, onParent }: { children: ReactNode; onParent?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {onParent ? (
          <View style={styles.top}>
            <ParentButton onPress={onParent} />
          </View>
        ) : null}
        <View style={styles.card}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 },
  top: { alignSelf: "flex-end", marginBottom: 8 },
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20 },
});
