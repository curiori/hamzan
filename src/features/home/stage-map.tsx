import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Hamster } from "@/art/hamster";
import { frontier, lpOf, pendingStar3, statusOf, type LevelStatus } from "@/domain/progression";
import { LEVELS, STAGES } from "@/domain/spec";
import { KID_LEVEL_NAME, KID_STAGE_NAME, MODE_LABEL } from "@/i18n/ja";
import type { Profile } from "@/state/types";
import { Stars } from "@/ui/stars";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

export const STATUS_LABEL: Record<LevelStatus, string> = {
  locked: "まだ ひらいていない",
  available: "はじめられる",
  practicing: "れんしゅう ちゅう",
  star2: "★2 ごうかく",
  mastered: "マスター",
};

const STATUS_STYLE: Record<LevelStatus, { box: ViewStyle; text: string }> = {
  locked: { box: { borderStyle: "dashed", borderColor: "rgba(10,10,10,0.25)", backgroundColor: colors.muted }, text: colors.mutedForeground },
  available: { box: { borderColor: colors.primary, backgroundColor: colors.card }, text: colors.foreground },
  practicing: { box: { borderColor: colors.primary, backgroundColor: colors.card }, text: colors.foreground },
  star2: { box: { borderColor: colors.amber700, backgroundColor: colors.amber100 }, text: colors.amber950 },
  mastered: { box: { borderColor: colors.amber800, backgroundColor: colors.amber700 }, text: "#ffffff" },
};

const passedStatus = (s: LevelStatus) => s === "star2" || s === "mastered";

const LevelTile = memo(function LevelTile({
  id,
  status,
  stars,
  mode,
  front,
  pending,
  wear,
  onOpen,
}: {
  id: string;
  status: LevelStatus;
  stars: number;
  mode: string;
  front: boolean;
  pending: boolean;
  wear: string | null;
  onOpen: (id: string) => void;
}) {
  const st = STATUS_STYLE[status];
  return (
    <View style={[styles.ring, front && styles.ringFront, pending && styles.ringPending]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${id} ${KID_LEVEL_NAME[id]}、${STATUS_LABEL[status]}`}
        onPress={() => onOpen(id)}
        style={({ pressed }) => [styles.tile, st.box, pressed && styles.pressed]}
      >
        <View style={styles.badge}>
          {status === "locked" ? (
            <Ionicons name="lock-closed" size={14} color={colors.foreground} />
          ) : status === "mastered" ? (
            <MaterialCommunityIcons name="crown" size={16} color={colors.amber700} />
          ) : (
            <AppText weight="bold" style={styles.badgeText}>
              {id}
            </AppText>
          )}
        </View>
        <View style={styles.tileBody}>
          <AppText weight="bold" style={[styles.tileName, { color: st.text }]}>
            {KID_LEVEL_NAME[id]}
          </AppText>
          <View style={styles.tileMeta}>
            {status !== "locked" ? <Stars n={status === "mastered" ? 3 : stars} size={13} /> : null}
            {status === "available" || status === "practicing" ? (
              <AppText weight="bold" style={styles.mode}>
                {mode}
              </AppText>
            ) : null}
          </View>
        </View>
      </Pressable>
      {front ? (
        <View style={styles.frontHamster} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Hamster wear={wear} size={36} />
        </View>
      ) : null}
    </View>
  );
});

/** Every stage with its levels; tapping a level opens its sheet. */
export function StageMap({ profile, unlockAll, onOpen }: { profile: Profile; unlockAll: boolean; onOpen: (levelId: string) => void }) {
  const fr = frontier(profile.progress, unlockAll);
  const pend = pendingStar3(profile.progress);
  const mastered = LEVELS.filter((l) => statusOf(profile.progress, l.id) === "mastered").length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <AppText weight="bold" accessibilityRole="header" style={styles.title}>
          ステージの ちず
        </AppText>
        <AppText weight="bold" style={styles.count}>
          マスター {mastered} / {LEVELS.length}
        </AppText>
      </View>
      {STAGES.map((st) => {
        const levels = LEVELS.filter((l) => l.stage === st.id);
        const passed = levels.filter((l) => passedStatus(statusOf(profile.progress, l.id))).length;
        const check = profile.stageChecks[st.id];
        return (
          <View key={st.id} style={styles.stage}>
            <View style={styles.stageHead}>
              <AppText weight="bold" accessibilityRole="header" style={styles.stageTitle}>
                ステージ{st.id} {KID_STAGE_NAME[st.id]}
              </AppText>
              <View style={styles.stageMeta}>
                {check?.passed ? (
                  <AppText weight="bold" style={styles.passed}>
                    {check.byPlacement ? "しんだんで クリア" : "チェック ごうかく"}
                  </AppText>
                ) : null}
                <AppText weight="bold" style={styles.small}>
                  ★2いじょう {passed}/{levels.length}
                </AppText>
              </View>
            </View>
            <View style={styles.grid}>
              {levels.map((l) => {
                const lp = lpOf(profile.progress, l.id);
                return (
                  <LevelTile
                    key={l.id}
                    id={l.id}
                    status={statusOf(profile.progress, l.id, unlockAll)}
                    stars={lp.bestStars}
                    mode={MODE_LABEL[lp.mode]}
                    front={fr?.id === l.id}
                    pending={pend?.id === l.id}
                    wear={profile.wearing}
                    onOpen={onOpen}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 22 },
  count: { fontSize: 14, fontVariant: ["tabular-nums"] },
  stage: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 },
  stageHead: { gap: 4 },
  stageTitle: { fontSize: 17 },
  stageMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  passed: { fontSize: 12, color: colors.green900, backgroundColor: colors.green100, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  small: { fontSize: 12, fontVariant: ["tabular-nums"] },
  grid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  ring: { width: "49%", borderRadius: radius.lg + 4, borderWidth: 3, borderColor: "transparent" },
  ringFront: { borderColor: "rgba(141,89,1,0.4)" },
  ringPending: { borderColor: "rgba(14,165,233,0.4)" },
  tile: { minHeight: 72, flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: radius.lg, borderWidth: 2, padding: 8 },
  pressed: { opacity: 0.85 },
  badge: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11 },
  tileBody: { flex: 1, minWidth: 0 },
  tileName: { fontSize: 13, lineHeight: 17 },
  tileMeta: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  mode: { fontSize: 11, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 4, paddingHorizontal: 4, overflow: "hidden" },
  frontHamster: { position: "absolute", top: -16, right: -6 },
});
