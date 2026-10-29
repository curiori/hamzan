import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Hamster } from "@/art/hamster";
import { Paw } from "@/art/icons";
import { ItemThumb } from "@/art/items";
import { REWARDS } from "@/game/achievements";
import { KID_LEVEL_NAME, KID_STAGE_NAME } from "@/i18n/ja";
import type { SetSummary } from "@/state/types";
import { Button } from "@/ui/button";
import { Star } from "@/ui/stars";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { celebrates, headline, isTimed, resultNotes, type NoteIcon } from "./result-text";

function ConfettiPiece({ x, d, r, k, fall }: { x: number; d: number; r: number; k: number; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(d * 1000, withTiming(1, { duration: (2.4 + d) * 1000, easing: Easing.in(Easing.quad) }));
  }, [t, d]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.66, 1], [1, 1, 0]),
    transform: [{ translateY: -40 + t.value * fall }, { rotate: `${r + t.value * 480}deg` }],
  }));
  return (
    <Animated.View style={[styles.piece, { left: `${x}%` }, style]}>
      {k === 0 ? <Star on size={20} /> : <View style={[styles.bit, k === 1 ? styles.bitSky : styles.bitOrange]} />}
    </Animated.View>
  );
}

function Confetti() {
  const { height } = useWindowDimensions();
  const [pieces] = useState(() => Array.from({ length: 24 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 0.6, r: Math.random() * 360, k: i % 3 })));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} fall={height + 40} />
      ))}
    </View>
  );
}

function PopStar({ on, delay, reduce }: { on: boolean; delay: number; reduce: boolean }) {
  const s = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) s.value = withDelay(delay, withSpring(1, { stiffness: 260, damping: 12 }));
  }, [s, delay, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={style}>
      <Star on={on} size={48} />
    </Animated.View>
  );
}

function CheeringHamster({ good, wear, reduce }: { good: boolean; wear: string | null; reduce: boolean }) {
  const scale = useSharedValue(reduce ? 1 : 0.7);
  const opacity = useSharedValue(reduce ? 1 : 0);
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    scale.value = withTiming(1, { duration: 400 });
    opacity.value = withTiming(1, { duration: 300 });
    if (good) y.value = withSequence(...[-18, 0, -8, 0].map((v) => withTiming(v, { duration: 275 })));
  }, [good, reduce, scale, opacity, y]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }, { scale: scale.value }] }));
  return (
    <Animated.View style={[styles.hamster, style]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Hamster mood={good ? "cheer" : "oops"} wear={wear} size={112} />
    </Animated.View>
  );
}

function NoteGlyph({ icon }: { icon: NoteIcon }) {
  if (icon === "crown") return <MaterialCommunityIcons name="crown" size={20} color={colors.primary} />;
  const name = ({ sparkles: "sparkles", next: "arrow-forward", retry: "refresh", trophy: "trophy" } as const)[icon];
  return <Ionicons name={name} size={20} color={colors.primary} />;
}

export function ResultScreen({
  summary: s,
  title,
  wear,
  nextLabel,
  onNext,
  onRetry,
  onHome,
}: {
  summary: SetSummary;
  title: string;
  wear: string | null;
  nextLabel: string | null;
  onNext: () => void;
  onRetry: (() => void) | null;
  onHome: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const h = headline(s);
  const timed = isTimed(s);
  const notes = resultNotes(s);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        {celebrates(s) && !reduce ? <Confetti /> : null}
        <CheeringHamster good={h.good} wear={wear} reduce={reduce} />
        <AppText weight="bold" style={styles.setTitle}>
          {title}
        </AppText>
        <AppText weight="bold" accessibilityRole="header" style={styles.headline}>
          {h.title}
        </AppText>

        {timed ? (
          <View style={styles.stars} accessible accessibilityRole="image" accessibilityLabel={`★${s.stars}つ`}>
            {[0, 1, 2].map((i) => (
              <PopStar key={i} on={i < s.stars} delay={300 + i * 200} reduce={reduce} />
            ))}
          </View>
        ) : null}

        {s.kind !== "warmup" && s.result !== "interrupted" ? (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <AppText weight="bold" style={styles.statLabel}>
                まちがい
              </AppText>
              <AppText weight="bold" style={styles.statValue}>
                {s.errors} / {s.n}
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppText weight="bold" style={styles.statLabel}>
                1もん あたり
              </AppText>
              <AppText weight="bold" style={styles.statValue}>
                {s.perProblemSec.toFixed(1)}びょう
              </AppText>
            </View>
          </View>
        ) : null}
        {timed && (s.events.includes("personalBest") || s.prevBest !== null) ? (
          <AppText weight="bold" style={styles.line}>
            {s.events.includes("personalBest") ? "じこベスト こうしん！" : `じこベスト ${s.prevBest?.toFixed(1)}びょう`}
          </AppText>
        ) : null}
        {s.kind === "challenge" && s.challengeBest && s.challengeBest.sec !== null ? (
          <AppText weight="bold" style={styles.line}>
            じこベスト {s.challengeBest.sec.toFixed(1)}びょう
          </AppText>
        ) : null}
        {s.result === "interrupted" ? (
          <AppText weight="bold" style={styles.line}>
            ながく はなれていたので、こんかいは はんていなしで きろくしたよ
          </AppText>
        ) : null}

        {s.reviews.length > 0 ? (
          <View style={styles.list}>
            {s.reviews.map((r) => (
              <View key={r.levelId} style={styles.review}>
                <AppText weight="bold" style={styles.reviewName}>
                  {KID_LEVEL_NAME[r.levelId]}
                </AppText>
                <AppText weight="bold" style={[styles.reviewState, { color: r.passed ? colors.green700 : colors.orange800 }]}>
                  {r.passed ? "ごうかく" : r.demoted ? "もういちど ★3を めざそう" : "また こんど"}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        {s.stageCheck ? (
          <AppText weight="bold" style={styles.line}>
            ステージ{s.stageCheck.stage}「{KID_STAGE_NAME[s.stageCheck.stage]}」
          </AppText>
        ) : null}

        {notes.length > 0 ? (
          <View style={styles.list}>
            {notes.map((n) => (
              <View key={n.text} style={styles.note}>
                <NoteGlyph icon={n.icon} />
                <AppText weight="bold" style={styles.noteText}>
                  {n.text}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {s.newRewards.length > 0 ? (
          <View style={styles.rewards}>
            <View style={styles.rewardsHead}>
              <Paw size={20} />
              <AppText weight="bold">ごほうびが とどいたよ</AppText>
            </View>
            <View style={styles.rewardList}>
              {s.newRewards.map((id) => (
                <View key={id} style={styles.reward}>
                  <ItemThumb id={id} size={36} />
                  <AppText weight="bold" style={styles.rewardName}>
                    {REWARDS.find((r) => r.id === id)?.name}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {nextLabel ? <Button size="lg" label={nextLabel} icon={<Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />} onPress={onNext} /> : null}
          {onRetry ? (
            <Button
              size="lg"
              variant={nextLabel ? "outline" : "primary"}
              label="もういちど"
              icon={<Ionicons name="refresh" size={20} color={nextLabel ? colors.foreground : colors.primaryForeground} />}
              onPress={onRetry}
            />
          ) : null}
          <Button size="lg" variant="outline" label="ホームへ" icon={<Ionicons name="home" size={18} color={colors.foreground} />} onPress={onHome} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 },
  card: {
    overflow: "hidden",
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  piece: { position: "absolute", top: 0 },
  bit: { width: 10, height: 10 },
  bitSky: { backgroundColor: colors.sky500, borderRadius: 2 },
  bitOrange: { backgroundColor: colors.orange600, borderRadius: 5 },
  hamster: { width: 112, height: 112 },
  setTitle: { marginTop: 8, fontSize: 14 },
  headline: { marginTop: 2, fontSize: 30, textAlign: "center" },
  stars: { marginTop: 14, flexDirection: "row", gap: 8 },
  stats: { marginTop: 18, flexDirection: "row", gap: 8, alignSelf: "stretch" },
  stat: { flex: 1, alignItems: "center", borderRadius: radius.lg, backgroundColor: colors.muted, paddingVertical: 12 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontVariant: ["tabular-nums"] },
  line: { marginTop: 10, fontSize: 14, textAlign: "center", fontVariant: ["tabular-nums"] },
  list: { marginTop: 16, gap: 8, alignSelf: "stretch" },
  review: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: radius.md, backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 8 },
  reviewName: { fontSize: 14, flexShrink: 1 },
  reviewState: { fontSize: 14 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  noteText: { flexShrink: 1, fontSize: 15 },
  rewards: { marginTop: 18, alignSelf: "stretch", borderRadius: radius.lg, backgroundColor: colors.amber50, padding: 14 },
  rewardsHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardList: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  reward: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 6 },
  rewardName: { fontSize: 14 },
  actions: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
});
