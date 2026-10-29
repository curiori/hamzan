import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Hamster } from "@/art/hamster";
import { RoomScene } from "@/art/room-scene";
import { miniLevel, placementBudgetLeft } from "@/domain/placement";
import { LEVEL, RULE_NUMBERS, SPEC } from "@/domain/spec";
import { unlockedRewards } from "@/game/achievements";
import { KID_LEVEL_NAME, KID_STAGE_NAME, MODE_LABEL } from "@/i18n/ja";
import { placementPlan, type PlayPlan } from "@/session/requests";
import { rewardStats, todayOf } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";

/** The diagnosis between sets: what comes next, today's limit, and the end with the starting level. */
export function PlacementView({ onStart, onFinished }: { onStart: (plan: PlayPlan) => void; onFinished: () => void }) {
  const profile = useAppStore((s) => activeProfile(s));
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const short = useAppStore((s) => s.dev.shortPlacement);
  const beginPlacement = useAppStore((s) => s.beginPlacement);
  const { width } = useWindowDimensions();
  const [roomOpen, setRoomOpen] = useState(false);
  const date = todayOf(dayOffset);
  const st = profile?.placement ?? null;

  useEffect(() => {
    if (profile && !st) beginPlacement();
  }, [profile, st, beginPlacement]);

  if (!profile || !st) return null;

  if (roomOpen)
    return (
      <View style={styles.root}>
        <RoomScene owned={unlockedRewards(rewardStats(profile))} wear={profile.wearing} name={profile.nickname} width={Math.min(width - 72, 420)} />
        <Button size="lg" variant="outline" label="もどる" onPress={() => setRoomOpen(false)} />
      </View>
    );

  const done = st.phase === "done";
  const left = placementBudgetLeft(st, date);
  return (
    <View style={styles.root}>
      <Hamster mood={done ? "cheer" : "idle"} wear={profile.wearing} size={96} />
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        {done ? "しんだん おわり！" : `しんだん ${Math.max(1, st.days + (st.day === date ? 0 : 1))}にちめ`}
      </AppText>
      {done ? (
        <>
          <AppText weight="bold" style={styles.body}>
            {st.result?.frontier
              ? `「${KID_LEVEL_NAME[st.result.frontier]}」の ${MODE_LABEL[st.result.mode]}から はじめよう`
              : "ぜんぶの レベルが ★2いじょう！ マスターを めざそう"}
          </AppText>
          <Button size="lg" label="ホームへ" icon={<Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />} onPress={onFinished} />
        </>
      ) : !short && left <= 0 ? (
        <>
          <AppText weight="bold" style={styles.body}>
            きょうは ここまで。あしたも つづきを やろう
          </AppText>
          <AppText style={styles.note}>（1日{SPEC.rules.placement.maxMinutesPerDay}分までに区切っています。2〜3日で終わります）</AppText>
          <Button size="lg" variant="outline" label="おへやを みる" onPress={() => setRoomOpen(true)} />
        </>
      ) : (
        <>
          <AppText weight="bold" style={styles.body}>
            {st.phase === "stageCheck"
              ? `ステージ${st.stage}「${KID_STAGE_NAME[st.stage]}」の チェック`
              : `「${KID_LEVEL_NAME[miniLevel(st)]}」を ${RULE_NUMBERS.miniCheckProblems}もん`}
          </AppText>
          <AppText style={styles.note}>できる ところから はじめるための テストだよ。わからなくても だいじょうぶ。</AppText>
          {st.phase === "mini" ? <AppText style={styles.small}>レベル {LEVEL[miniLevel(st)].id}</AppText> : null}
          <Button
            size="lg"
            label="はじめる"
            style={styles.start}
            onPress={() => {
              const plan = placementPlan(profile, date, short);
              if (plan) onStart(plan);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 14 },
  title: { fontSize: 24, textAlign: "center" },
  body: { fontSize: 16, lineHeight: 25, textAlign: "center" },
  note: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  small: { fontSize: 12 },
  start: { minWidth: 200, minHeight: 56 },
});
