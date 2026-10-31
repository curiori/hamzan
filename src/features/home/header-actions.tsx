import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { todayOf } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Backdrop } from "@/ui/sheet";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** Header buttons: the test date (when moved), who is practicing (switchable), and the parent area. Like the bar they sit in, they keep their size with larger text. */
export function HeaderActions() {
  const router = useRouter();
  const profiles = useAppStore((s) => s.profiles);
  const active = useAppStore((s) => activeProfile(s));
  const switchProfile = useAppStore((s) => s.switchProfile);
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const [open, setOpen] = useState(false);
  const many = profiles.length > 1;

  return (
    <View style={styles.row}>
      {dayOffset > 0 ? (
        // small, so it never runs into the title on a narrow screen; the dashed ring marks it as a test tool
        <View style={styles.testDate} accessible accessibilityLabel={`テスト日付 ${todayOf(dayOffset).slice(5)}`}>
          <Ionicons name="calendar-outline" size={12} color={colors.foreground} />
          <AppText weight="bold" allowFontScaling={false} style={styles.testDateText}>
            {todayOf(dayOffset).slice(5)}
          </AppText>
        </View>
      ) : null}
      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={many ? `いまの ひと：${active.nickname}。きりかえる` : `いまの ひと：${active.nickname}`}
          disabled={!many}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.who, pressed && styles.pressed]}
        >
          <Ionicons name="person" size={15} color={colors.foreground} />
          <AppText weight="bold" numberOfLines={1} allowFontScaling={false} style={styles.whoText}>
            {active.nickname}
          </AppText>
          {many ? <Ionicons name="chevron-down" size={14} color={colors.foreground} /> : null}
        </Pressable>
      ) : null}
      <ParentButton onPress={() => router.push("/parent")} />
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Backdrop onClose={() => setOpen(false)} />
          <View style={styles.menu} accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)}>
            <AppText weight="bold" accessibilityRole="header" style={styles.menuTitle}>
              だれが やる？
            </AppText>
            {profiles.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: p.id === active?.id }}
                onPress={() => {
                  switchProfile(p.id);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.item, p.id === active?.id && styles.itemOn, pressed && styles.pressed]}
              >
                <AppText weight="bold">{p.nickname}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** The way into the parent area (PIN first). */
export function ParentButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="おうちの かたへ" onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.parent, pressed && styles.pressed]}>
      <Ionicons name="lock-closed" size={18} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: 8 },
  testDate: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderStyle: "dashed", borderColor: colors.mutedForeground, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  testDateText: { fontSize: 11, fontVariant: ["tabular-nums"] },
  who: { flexDirection: "row", alignItems: "center", gap: 4, height: 40, maxWidth: 130, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  whoText: { fontSize: 14, flexShrink: 1 },
  parent: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: colors.muted },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center", padding: 24 },
  menu: { width: "100%", maxWidth: 320, borderRadius: radius.xl, backgroundColor: colors.background, padding: 16, gap: 8 },
  menuTitle: { fontSize: 16, marginBottom: 4 },
  item: { borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 },
  itemOn: { borderColor: colors.primary, backgroundColor: colors.amber50 },
});
