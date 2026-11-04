import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { displayText, isCourseLevel, levelLabel, levelName, levelSpec } from "@/course/levels";
import { levelStatus, lpAny } from "@/course/progression";
import { SPEC, type Mode } from "@/domain/spec";
import { MODE_LABEL } from "@/i18n/ja";
import type { Profile } from "@/state/types";
import { Button } from "@/ui/button";
import { Backdrop } from "@/ui/sheet";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { useKept } from "@/ui/use-kept";
import { STATUS_LABEL } from "./stage-map";

/** Bottom sheet for one level: example, mode, best time, mastery progress, and the practice button. */
export function LevelSheet({
  levelId,
  profile,
  unlockAll,
  onClose,
  onPractice,
}: {
  levelId: string | null;
  profile: Profile;
  unlockAll: boolean;
  onClose: () => void;
  onPractice: (levelId: string, mode: Mode) => void;
}) {
  const insets = useSafeAreaInsets();
  // a closing sheet slides down with the level it showed; it takes no presses and VoiceOver skips it
  const shownId = useKept(levelId);
  const closing = !levelId;
  const sel = shownId ? levelSpec(shownId) : null;
  const opts = { unlockAll, waiting: profile.course.checks };
  const lp = sel ? lpAny(profile.progress, sel.id) : null;
  const status = sel ? levelStatus(profile.progress, sel.id, opts) : null;
  const masteryDays = SPEC.rules.stars.mastery.star3OnDistinctLocalDates;

  return (
    <Modal transparent visible={!!levelId} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Backdrop onClose={onClose} />
        {sel && lp && status ? (
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            pointerEvents={closing ? "none" : "auto"}
            importantForAccessibility={closing ? "no-hide-descendants" : "auto"}
            accessibilityElementsHidden={closing}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.head}>
                <View style={styles.headText}>
                  <AppText weight="bold" accessibilityRole="header" style={styles.title}>
                    {levelName(sel.id)}
                  </AppText>
                  <AppText weight="bold" style={styles.sub}>
                    レベル {levelLabel(sel.id)}・{STATUS_LABEL[status]}
                  </AppText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="とじる" onPress={onClose} hitSlop={8} style={styles.close}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              <AppText weight="bold" style={styles.example}>
                れい：{displayText(sel.example)}
              </AppText>
              <View style={styles.boxes}>
                <View style={styles.box}>
                  <AppText style={styles.boxLabel}>いまの モード</AppText>
                  <AppText weight="bold">{MODE_LABEL[lp.mode]}</AppText>
                </View>
                <View style={styles.box}>
                  <AppText style={styles.boxLabel}>じこベスト（1もん）</AppText>
                  <AppText weight="bold">{lp.personalBestSec !== null ? `${lp.personalBestSec.toFixed(1)}びょう` : "まだ"}</AppText>
                </View>
              </View>
              <View style={styles.box}>
                <AppText style={styles.boxLabel}>マスターまで（★3を ちがう日に {masteryDays}かい）</AppText>
                <AppText weight="bold">{lp.masteredAt ? "マスター！" : `★3 ${lp.star3Dates.length} / ${masteryDays}`}</AppText>
              </View>
              {status === "locked" ? (
                <View style={styles.locked}>
                  <Ionicons name="lock-closed" size={16} color={colors.foreground} />
                  <AppText weight="bold" style={styles.lockedText}>
                    {`${sel.prerequisites
                      .filter((id) => isCourseLevel(id) && !["star2", "mastered"].includes(levelStatus(profile.progress, id, opts)))
                      .map(levelName)
                      .join("・")}で ★2を とると ひらくよ`}
                  </AppText>
                </View>
              ) : (
                <Button
                  size="lg"
                  label="れんしゅうする"
                  icon={<Ionicons name="play" size={20} color={colors.primaryForeground} />}
                  onPress={() => onPractice(sel.id, status === "star2" || status === "mastered" ? "S" : lp.mode)}
                />
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "85%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.background },
  content: { padding: 20, gap: 12 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  headText: { flex: 1 },
  title: { fontSize: 22 },
  sub: { marginTop: 2, fontSize: 14 },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  example: { fontSize: 18, borderRadius: radius.md, backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 8, overflow: "hidden", fontVariant: ["tabular-nums"] },
  boxes: { flexDirection: "row", gap: 8 },
  box: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 2 },
  boxLabel: { fontSize: 12 },
  locked: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.md, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(10,10,10,0.3)", padding: 10 },
  lockedText: { flex: 1, fontSize: 14 },
});
