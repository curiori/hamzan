import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "./text";
import { colors, radius } from "./theme";

/** Bottom sheet over the dimmed screen: a title, a close button and scrolling content. A press outside closes it. */
export function Sheet({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="とじる" onPress={onClose} />
        {visible ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.head}>
                <View style={styles.headText}>
                  <AppText weight="bold" accessibilityRole="header" style={styles.title}>
                    {title}
                  </AppText>
                  {subtitle ? <AppText style={styles.sub}>{subtitle}</AppText> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="とじる" onPress={onClose} hitSlop={8} style={styles.close}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              {children}
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
