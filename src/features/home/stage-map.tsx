import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Hamster } from "@/art/hamster";
import { Crown } from "@/art/icons";
import { ALL_STAGES, levelLabel, levelName, stageName } from "@/course/levels";
import { frontier, levelStatus, lpAny, pendingList } from "@/course/progression";
import type { LevelStatus } from "@/domain/progression";
import { MODE_LABEL } from "@/i18n/ja";
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
  waiting,
  wear,
  onOpen,
}: {
  id: string;
  status: LevelStatus;
  stars: number;
  mode: string;
  /** the level the child moves on with; the hamster sits on it */
  front: boolean;
  pending: boolean;
  /** new in an update, before where the child was: today's practice checks it first */
  waiting: boolean;
  wear: string | null;
  onOpen: (id: string) => void;
}) {
  const st = STATUS_STYLE[status];
  const label = levelLabel(id);
  return (
    <View style={[styles.ring, front && styles.ringFront, pending && styles.ringPending]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${levelName(id)}、${STATUS_LABEL[status]}${waiting ? "、あたらしい レベル" : ""}`}
        onPress={() => onOpen(id)}
        style={({ pressed }) => [styles.tile, st.box, pressed && styles.pressed]}
      >
        <View style={styles.badge}>
          {status === "locked" ? (
            <Ionicons name="lock-closed" size={14} color={colors.foreground} />
          ) : status === "mastered" ? (
            <Crown size={16} color={colors.amber700} />
          ) : (
            <AppText weight="bold" style={styles.badgeText}>
              {label}
            </AppText>
          )}
        </View>
        <View style={styles.tileBody}>
          <AppText weight="bold" style={[styles.tileName, { color: st.text }]}>
            {levelName(id)}
          </AppText>
          <View style={styles.tileMeta}>
            {status !== "locked" ? <Stars n={status === "mastered" ? 3 : stars} size={13} /> : null}
            {status === "available" || status === "practicing" ? (
              <AppText weight="bold" style={styles.mode}>
                {mode}
              </AppText>
            ) : null}
            {waiting ? (
              <AppText weight="bold" style={styles.new}>
                あたらしい
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

/** Every stage of the course in its order, with its levels; tapping a level opens its sheet. */
export function StageMap({ profile, unlockAll, onOpen }: { profile: Profile; unlockAll: boolean; onOpen: (levelId: string) => void }) {
  const opts = { unlockAll, waiting: profile.course.checks };
  const fr = frontier(profile.progress, opts);
  const pend = pendingList(profile.progress, opts)[0] ?? null;
  const status = (id: string) => levelStatus(profile.progress, id, opts);
  const all = ALL_STAGES.flatMap((s) => s.levelIds);
  const mastered = all.filter((id) => status(id) === "mastered").length;
  const waiting = new Set(profile.course.checks);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <AppText weight="bold" accessibilityRole="header" style={styles.title}>
          ステージの ちず
        </AppText>
        <AppText weight="bold" style={styles.count}>
          マスター {mastered} / {all.length}
        </AppText>
      </View>
      {ALL_STAGES.map((st) => {
        const passed = st.levelIds.filter((id) => passedStatus(status(id))).length;
        const check = profile.stageChecks[st.id];
        return (
          <View key={st.id} style={styles.stage}>
            <View style={styles.stageHead}>
              <AppText weight="bold" accessibilityRole="header" style={styles.stageTitle}>
                ステージ{st.no} {stageName(st.id)}
              </AppText>
              <View style={styles.stageMeta}>
                {check?.passed ? (
                  <AppText weight="bold" style={styles.passed}>
                    {check.byPlacement ? "しんだんで クリア" : "チェック ごうかく"}
                  </AppText>
                ) : null}
                <AppText weight="bold" style={styles.small}>
                  ★2いじょう {passed}/{st.levelIds.length}
                </AppText>
              </View>
            </View>
            <View style={styles.grid}>
              {st.levelIds.map((id) => {
                const lp = lpAny(profile.progress, id);
                const s = status(id);
                return (
                  <LevelTile
                    key={id}
                    id={id}
                    status={s}
                    stars={lp.bestStars}
                    mode={MODE_LABEL[lp.mode]}
                    front={fr?.id === id}
                    pending={pend?.id === id}
                    waiting={waiting.has(id) && !passedStatus(s)}
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
  tileMeta: { marginTop: 4, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, rowGap: 4 },
  mode: { fontSize: 11, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 4, paddingHorizontal: 4, overflow: "hidden" },
  new: { fontSize: 11, color: colors.green900, backgroundColor: colors.green100, borderRadius: 4, paddingHorizontal: 4, overflow: "hidden" },
  frontHamster: { position: "absolute", top: -16, right: -6 },
});
