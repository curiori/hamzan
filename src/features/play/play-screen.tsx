import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Hamster, type Mood } from "@/art/hamster";
import { RULE_NUMBERS, type Mode } from "@/domain/spec";
import { commitItem, createClock, isInterrupted, liveMs, pauseFor, resumeFor, startItem, warmupLeftMs, type ClockState } from "@/platform/active-clock";
import { cue, preloadCues } from "@/platform/feedback";
import { useScreenAwake } from "@/platform/keep-awake";
import { useAppActive } from "@/platform/use-app-state";
import type { PlayRequest } from "@/session/requests";
import type { PlayOutcome } from "@/session/use-session-runner";
import type { Settings } from "@/state/types";
import { Button } from "@/ui/button";
import { useConfirm } from "@/ui/confirm";
import { ProgressBar } from "@/ui/progress-bar";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import { AnswerSolver } from "./answer-solver";
import { HintSolver } from "./hint-solver";
import { MemoSolver } from "./memo-solver";
import { advance, answerCurrent, currentItem, initQueue, isFinished, type PlayQueue } from "./play-queue";
import { problemFontSize, ProblemText } from "./problem-text";
import type { SolverParts, SolverResult } from "./solver";

type Phase = "ask" | "right" | "wrong" | "done";

// Wall-clock time, so that minutes with the phone locked still count toward the background limit.
const clockNow = () => Date.now();

function IconButton({ name, label, onPress, ghost, pressed: on }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; ghost?: boolean; pressed?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={on === undefined ? undefined : { selected: on }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, ghost && styles.iconGhost, pressed && styles.iconPressed]}
    >
      <Ionicons name={name} size={24} color={colors.foreground} />
    </Pressable>
  );
}

/** The set's answer time, read again every 250 ms; only the part that shows it draws again, not the solver around it. */
function useLiveMs(clock: RefObject<ClockState>, asking: boolean) {
  const [ms, setMs] = useState(() => liveMs(clock.current, clockNow(), asking));
  useEffect(() => {
    const id = setInterval(() => setMs(liveMs(clock.current, clockNow(), asking)), 250);
    return () => clearInterval(id);
  }, [clock, asking]);
  return ms;
}

function LiveTime({ clock, asking }: { clock: RefObject<ClockState>; asking: boolean }) {
  const ms = useLiveMs(clock, asking);
  return (
    <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timer}>
      {(ms / 1000).toFixed(1)}びょう
    </AppText>
  );
}

function WarmupBar({ clock, asking, seconds }: { clock: RefObject<ClockState>; asking: boolean; seconds: number }) {
  const ms = useLiveMs(clock, asking);
  return <ProgressBar value={Math.min(100, (ms / (seconds * 1000)) * 100)} label="ウォームアップの のこり" style={styles.progressWarm} />;
}

export function PlayScreen({
  req,
  settings,
  wear,
  onFinish,
  onQuit,
}: {
  req: PlayRequest;
  settings: Pick<Settings, "timer" | "autoSubmit" | "sound" | "vibration">;
  wear: string | null;
  onFinish: (o: PlayOutcome) => void;
  onQuit: () => void;
}) {
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const warm = req.warmupSec !== undefined;
  const [queue, setQueue] = useState<PlayQueue>(() => initQueue(req.problems));
  const [phase, setPhase] = useState<Phase>("ask");
  const [reveal, setReveal] = useState("");
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(clockNow);
  // one clock per screen (an argument to useRef would be built again on every render)
  const [firstClock] = useState(() => createClock(clockNow()));
  const clock = useRef(firstClock);
  const finished = useRef(false);
  const answeredPos = useRef(-1);
  // while the quit question is open, another やめる (a second confirm answers the first with つづける) and the pause buttons do nothing, so the set cannot go on behind it
  const quitting = useRef(false);
  const { sound, vibration } = settings;
  const sfx = useCallback((k: "ok" | "miss") => cue(k, { sound, vibration }), [sound, vibration]);

  useScreenAwake();
  useEffect(() => {
    if (sound) preloadCues();
  }, [sound]);

  // leaving the app (switcher, Control Center, another app) stops the answer time
  useAppActive((active) => {
    const t = clockNow();
    clock.current = active ? resumeFor(clock.current, "background", t) : pauseFor(clock.current, "background", t);
    setNow(t);
  });

  const finish = useCallback(
    (q: PlayQueue) => {
      if (finished.current) return;
      finished.current = true;
      setPhase("done");
      const c = clock.current;
      onFinish({
        results: q.results,
        interrupted: isInterrupted(c, clockNow(), RULE_NUMBERS.backgroundLimitSec),
        activeSec: Math.round(c.activeTotal / 100) / 10,
      });
    },
    [onFinish],
  );

  // the warm-up ends when its answer time is used up: the timer moves now to look again, and a pause, the background or the next problem sets it again
  useEffect(() => {
    if (!warm || phase !== "ask" || paused) return;
    const left = warmupLeftMs(clock.current, clockNow(), true, req.warmupSec ?? 0);
    if (left === 0) {
      finish(queue);
      return;
    }
    // in the background the time stands still; coming back moves now and sets the timer
    if (clock.current.reasons.length) return;
    const id = setTimeout(() => setNow(clockNow()), left);
    return () => clearTimeout(id);
  }, [warm, phase, paused, now, req.warmupSec, finish, queue]);

  // after the feedback, the next problem; the feedback waits while paused so a quit question cannot race the end of the set
  useEffect(() => {
    if ((phase !== "right" && phase !== "wrong") || paused) return;
    const id = setTimeout(
      () => {
        const next = advance(queue);
        if (isFinished(next)) return finish(next);
        const t = clockNow();
        clock.current = startItem(clock.current, t);
        setNow(t);
        setQueue(next);
        setPhase("ask");
      },
      phase === "right" ? 450 : Math.max(1, RULE_NUMBERS.revealSec) * 1000 + 300,
    );
    return () => clearTimeout(id);
  }, [phase, paused, queue, finish]);

  const hx = useSharedValue(0);
  const hy = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    if (phase === "right") hy.value = withSequence(withTiming(-14, { duration: 150 }), withTiming(0, { duration: 300 }));
    if (phase === "wrong") hx.value = withSequence(withTiming(-5, { duration: 110 }), withTiming(5, { duration: 110 }), withTiming(0, { duration: 110 }));
  }, [phase, reduce, hx, hy]);
  const hamsterStyle = useAnimatedStyle(() => ({ transform: [{ translateX: hx.value }, { translateY: hy.value }] }));

  const onDone = (r: SolverResult) => {
    if (phase !== "ask" || finished.current || answeredPos.current === queue.pos) return;
    answeredPos.current = queue.pos;
    const { clock: c, latencyMs } = commitItem(clock.current, clockNow());
    clock.current = c;
    setQueue(answerCurrent(queue, { correct: r.correct, given: r.given, latencyMs: Math.round(latencyMs) }, warm));
    if (r.correct) {
      sfx("ok");
      setPhase("right");
    } else {
      sfx("miss");
      setReveal(r.reveal);
      setPhase("wrong");
    }
  };

  const setUserPause = (on: boolean) => {
    const t = clockNow();
    clock.current = on ? pauseFor(clock.current, "user", t) : resumeFor(clock.current, "user", t);
    setNow(t);
    setPaused(on);
  };

  const quit = async () => {
    if (quitting.current) return;
    quitting.current = true;
    try {
      const wasPaused = paused;
      if (!wasPaused) setUserPause(true);
      const ok = await confirm({ title: "とちゅうで やめますか？", description: "この セットの きろくは のこりません。", confirmLabel: "やめる", cancelLabel: "つづける" });
      if (!ok) {
        // つづける goes back to the problem, or to the pause cover when the child had paused before
        if (!wasPaused) setUserPause(false);
        return;
      }
      // leaving always works, even when a finish already happened and recorded nothing
      finished.current = true;
      onQuit();
    } finally {
      quitting.current = false;
    }
  };

  const pressPause = (on: boolean) => {
    if (!quitting.current) setUserPause(on);
  };

  const item = currentItem(queue);
  if (!item) return null;
  const firstCount = req.problems.length;
  const doneCount = Math.min(queue.results.length, firstCount);
  const mood: Mood = phase === "right" ? "happy" : phase === "wrong" ? "oops" : "idle";
  const mode: Mode = item.requeue ? "S" : req.mode;
  // short usable height (iPhone SE 647pt, mini 728pt): every hint level must fit without scrolling
  const compact = height - insets.top - insets.bottom < 740;
  const textSize = problemFontSize(item.inst.problem) - (mode === "H" && compact ? 8 : 0);

  const layout = ({ body, keypad, note }: SolverParts): ReactElement => (
    <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.header}>
        <View style={styles.titleBox}>
          {/* one line each: on the iPhone they shrink to fit rather than cut (the web preview shows an ellipsis) */}
          <AppText weight="bold" tone="primary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.subtitle}>
            {req.subtitle}
          </AppText>
          <AppText
            weight="bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.title}
          >
            {req.title}
          </AppText>
        </View>
        {settings.timer && !warm ? <LiveTime clock={clock} asking={phase === "ask"} /> : null}
        <IconButton name={paused ? "play" : "pause"} label={paused ? "つづける" : "いちじ ていし"} pressed={paused} onPress={() => pressPause(!paused)} />
        <IconButton name="close" label="やめる" ghost onPress={quit} />
      </View>

      {warm ? (
        <WarmupBar clock={clock} asking={phase === "ask"} seconds={req.warmupSec ?? 60} />
      ) : (
        <View style={styles.progressRow}>
          <ProgressBar value={(doneCount / Math.max(1, firstCount)) * 100} label="すすみぐあい" style={styles.progressBar} />
          <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.count}>
            {item.requeue ? "もういちど" : `${Math.min(queue.pos + 1, firstCount)} / ${firstCount}`}
          </AppText>
        </View>
      )}

      <View style={[styles.card, phase === "right" ? styles.cardRight : phase === "wrong" ? styles.cardWrong : null]}>
        <ScrollView contentContainerStyle={[styles.cardContent, compact && styles.cardContentCompact]} showsVerticalScrollIndicator={false} bounces={false}>
          {item.requeue ? (
            <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.requeue}>
              さっきの もんだいを もういちど
            </AppText>
          ) : null}
          <Animated.View entering={reduce ? undefined : FadeIn.duration(150)}>
            <ProblemText inst={item.inst} hint={mode === "H"} size={textSize} />
          </Animated.View>
          <View style={[styles.body, compact && styles.bodyCompact]}>{body}</View>
          <View style={[styles.feedback, compact && styles.feedbackCompact]}>
            {phase === "ask" && note ? (
              <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite" style={styles.note}>
                {note}
              </AppText>
            ) : null}
            {phase === "right" ? (
              <View style={styles.rightRow} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark" size={26} color={colors.green700} />
                <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rightText}>
                  せいかい！
                </AppText>
              </View>
            ) : null}
            {phase === "wrong" ? (
              <View style={styles.wrongBox} accessibilityLiveRegion="polite">
                <Ionicons name="close" size={22} color={colors.red800} />
                <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.wrongText}>
                  こたえは {reveal}
                </AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <Animated.View style={[styles.hamster, hamsterStyle]} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Hamster mood={mood} wear={wear} size={56} />
        </Animated.View>
        {paused ? (
          <View style={styles.pauseCover}>
            <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.pauseText}>
              いちじ ていし ちゅう
            </AppText>
            <Button
              label="つづける"
              size="lg"
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              icon={<Ionicons name="play" size={20} color={colors.primaryForeground} />}
              onPress={() => pressPause(false)}
            />
          </View>
        ) : null}
      </View>

      <View
        style={[styles.keypad, paused && styles.hidden]}
        pointerEvents={paused ? "none" : "auto"}
        importantForAccessibility={paused ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={paused}
      >
        {keypad}
      </View>
    </View>
  );

  const solverProps = { inst: item.inst, autoSubmit: settings.autoSubmit, compact, locked: phase !== "ask" || paused, onDone, sfx, render: layout };
  // a new solver per position; pausing keeps it mounted, so a revealed hint stays revealed
  if (mode === "H") return <HintSolver key={`solver-${queue.pos}`} {...solverProps} />;
  if (mode === "M") return <MemoSolver key={`solver-${queue.pos}`} {...solverProps} />;
  return <AnswerSolver key={`solver-${queue.pos}`} {...solverProps} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleBox: { flex: 1, minWidth: 0 },
  subtitle: { fontSize: 12 },
  title: { fontSize: 18 },
  timer: { fontSize: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontVariant: ["tabular-nums"] },
  iconButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  iconGhost: { borderColor: "transparent", backgroundColor: "transparent" },
  iconPressed: { backgroundColor: colors.muted },
  progressWarm: { marginTop: 8 },
  progressRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  progressBar: { flex: 1 },
  count: { fontSize: 14, fontVariant: ["tabular-nums"] },
  card: { flex: 1, marginTop: 30, borderRadius: radius.xl, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  cardRight: { borderColor: colors.green600 },
  cardWrong: { borderColor: colors.red600 },
  cardContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8 },
  cardContentCompact: { paddingTop: 8, paddingBottom: 4 },
  requeue: { fontSize: 13, color: colors.orange800, marginBottom: 2 },
  body: { marginTop: 8, alignItems: "center", alignSelf: "stretch" },
  bodyCompact: { marginTop: 4 },
  feedback: { minHeight: 40, marginTop: 6, alignItems: "center", justifyContent: "center" },
  feedbackCompact: { marginTop: 4 },
  note: { fontSize: 17, textAlign: "center", color: colors.orange800 },
  rightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rightText: { fontSize: 22, color: colors.green700 },
  wrongBox: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.red50, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 6 },
  wrongText: { fontSize: 19, color: colors.red800, flexShrink: 1 },
  hamster: { position: "absolute", top: -34, right: 14 },
  pauseCover: { ...StyleSheet.absoluteFillObject, borderRadius: radius.xl, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", gap: 14 },
  pauseText: { fontSize: 22 },
  keypad: { marginTop: 10 },
  hidden: { opacity: 0 },
});
