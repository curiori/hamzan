import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Hamster } from "@/art/hamster";
import { Paw } from "@/art/icons";
import { addDays, weekdayOf, type LocalDate } from "@/domain/dates";
import { planDailySession, resolveSlot, type SessionPart } from "@/domain/session";
import { SPEC } from "@/domain/spec";
import { KID_LEVEL_NAME, MODE_LABEL } from "@/i18n/ja";
import type { Profile } from "@/state/types";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

const WEEKDAYS = "日月火水木金土";

function partLabel(part: SessionPart, p: Profile, unlockAll: boolean): string {
  if (part.kind === "warmup") return "ウォームアップ";
  if (part.kind === "stageCheck") return `ステージチェック（ステージ${part.stage}）`;
  if (part.kind === "review") return `ふくしゅう（${part.levelIds.map((id) => KID_LEVEL_NAME[id]).join("・")}）`;
  const r = resolveSlot(part.slot, p.progress, unlockAll);
  return r ? `${KID_LEVEL_NAME[r.levelId]}（${MODE_LABEL[r.mode]}）` : "メイン";
}

function BobbingHamster({ wear, happy }: { wear: string | null; happy: boolean }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduce) y.value = withRepeat(withSequence(withTiming(-4, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1);
  }, [reduce, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Hamster wear={wear} mood={happy ? "happy" : "idle"} size={72} />
    </Animated.View>
  );
}

/** Today's session parts, the start button and the goal marks of the last 7 days. */
export function TodayCard({ profile, date, unlockAll, onStart }: { profile: Profile; date: LocalDate; unlockAll: boolean; onStart: () => void }) {
  const day = profile.sessions[date];
  const { progress, reviews, stageChecks } = profile;
  const planned = useMemo(() => planDailySession({ progress, reviews, stageChecks, date, unlockAll }), [progress, reviews, stageChecks, date, unlockAll]);
  const plan = day?.plan ?? planned;
  const done = day?.done ?? 0;
  const goal = day?.goal ?? false;
  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <BobbingHamster wear={profile.wearing} happy={goal} />
        <View style={styles.headText}>
          <AppText weight="bold" numberOfLines={1} style={styles.name}>
            {profile.nickname}さん
          </AppText>
          <AppText weight="bold" accessibilityRole="header" style={styles.title}>
            きょうの れんしゅう
          </AppText>
        </View>
      </View>
      <View style={styles.parts}>
        {plan.map((part, i) => (
          <View key={i} style={[styles.part, i < done ? styles.partDone : i === done ? styles.partNext : null]}>
            {i < done ? (
              <Ionicons name="checkmark" size={16} color={colors.green700} accessibilityLabel="おわり" />
            ) : (
              <AppText weight="bold" style={styles.partNo}>
                {i + 1}
              </AppText>
            )}
            <AppText weight="bold" style={styles.partText}>
              {partLabel(part, profile, unlockAll)}
            </AppText>
          </View>
        ))}
      </View>
      {goal ? (
        <View style={styles.goal}>
          <Ionicons name="trophy" size={20} color={colors.green900} />
          <AppText weight="bold" style={styles.goalText}>
            きょうの ゴール たっせい！
          </AppText>
        </View>
      ) : (
        <Button size="lg" label={done > 0 ? "つづきから" : "はじめる"} icon={<Ionicons name="play" size={20} color={colors.primaryForeground} />} onPress={onStart} style={styles.start} />
      )}
      <AppText weight="bold" style={styles.weekTitle}>
        ゴールの しるし
      </AppText>
      <View style={styles.week}>
        {week.map((d) => {
          const g = !!profile.sessions[d]?.goal;
          const label = d === date ? "きょう" : WEEKDAYS[weekdayOf(d)];
          return (
            <View key={d} style={styles.weekDay} accessible accessibilityLabel={`${label} ${g ? "ゴール たっせい" : "なし"}`}>
              {g ? <Paw size={24} /> : <View style={styles.weekEmpty} />}
              <AppText weight={d === date ? "bold" : "regular"} style={[styles.weekLabel, d === date && styles.today]}>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The weekly challenge over mastered levels. */
export function ChallengeCard({ bestSec, onStart }: { bestSec: number | null; onStart: () => void }) {
  return (
    <View style={[styles.card, styles.challenge]}>
      <View style={styles.challengeHead}>
        <Ionicons name="trophy" size={20} color={colors.amber700} />
        <AppText weight="bold" accessibilityRole="header" style={styles.challengeTitle}>
          チャレンジ
        </AppText>
      </View>
      <AppText weight="bold" style={styles.small}>
        マスターした レベルから {SPEC.rules.dailySession.weeklyChallenge.problems}もん
      </AppText>
      {bestSec !== null ? (
        <AppText weight="bold" style={styles.small}>
          じこベスト 1もん {bestSec.toFixed(1)}びょう
        </AppText>
      ) : null}
      <Button variant="outline" label="チャレンジする" onPress={onStart} style={styles.start} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14 },
  title: { fontSize: 20 },
  parts: { marginTop: 12, gap: 6 },
  part: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.md, backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 8 },
  partDone: { backgroundColor: colors.green50 },
  partNext: { backgroundColor: colors.amber50 },
  partNo: { width: 16, fontSize: 12, textAlign: "center" },
  partText: { flex: 1, fontSize: 14 },
  goal: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.lg, backgroundColor: colors.green100, paddingHorizontal: 12, paddingVertical: 10 },
  goalText: { color: colors.green900 },
  start: { marginTop: 12, minHeight: 54 },
  weekTitle: { marginTop: 16, fontSize: 14 },
  week: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 2, flex: 1 },
  weekEmpty: { width: 12, height: 12, margin: 6, borderRadius: 6, borderWidth: 2, borderColor: "rgba(10,10,10,0.25)" },
  weekLabel: { fontSize: 12 },
  today: { textDecorationLine: "underline" },
  challenge: { borderWidth: 2, borderColor: colors.amber600, gap: 4 },
  challengeHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  challengeTitle: { fontSize: 18 },
  small: { fontSize: 14 },
});
