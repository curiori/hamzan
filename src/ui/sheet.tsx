import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "./text";
import { colors, radius } from "./theme";
import { useKept } from "./use-kept";

/**
 * The dimmed screen behind a sheet or a menu. A press on it closes, for children who see it; VoiceOver skips it and
 * closes with its escape gesture (a two-finger scrub) on the sheet instead.
 */
export function Backdrop({ onClose }: { onClose: () => void }) {
  return <Pressable style={StyleSheet.absoluteFill} accessible={false} aria-hidden tabIndex={-1} onPress={onClose} />;
}

/** Bottom sheet over the dimmed screen: a title, a close button and scrolling content. A press outside closes it. */
export function Sheet({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  // a closing sheet slides down with what it showed (callers clear theirs on close); it takes no presses and VoiceOver skips it
  const shown = useKept(visible ? { title, subtitle, children } : null);
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Backdrop onClose={onClose} />
        {shown ? (
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            pointerEvents={visible ? "auto" : "none"}
            importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
            accessibilityElementsHidden={!visible}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.head}>
                <View style={styles.headText}>
                  <AppText weight="bold" accessibilityRole="header" style={styles.title}>
                    {shown.title}
                  </AppText>
                  {shown.subtitle ? <AppText style={styles.sub}>{shown.subtitle}</AppText> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="とじる" onPress={onClose} hitSlop={8} style={styles.close}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              {shown.children}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, width: "100%", maxWidth: 520, alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  headText: { flex: 1 },
  title: { fontSize: 22 },
  sub: { marginTop: 2, fontSize: 14 },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
