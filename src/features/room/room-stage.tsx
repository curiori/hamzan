import { useIsFocused } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, ZoomIn } from "react-native-reanimated";
import Svg from "react-native-svg";
import { Hamster, type Mood, type Pose } from "@/art/hamster";
import { Bubble, HamsterSide, Heart } from "@/art/hamster-poses";
import { ITEM_PARTS } from "@/art/items";
import { RoomBackground } from "@/art/room-scene";
import { REWARDS, unlockedRewards } from "@/game/achievements";
import { newlyOwned } from "@/game/hamster-brain";
import { autoLayout, HAMSTER_H, HAMSTER_W, placedGoods, ROOM_H, ROOM_W, seatIn, SLOTS, toRoom, type Point, type SlotId } from "@/game/room";
import { tapFeel } from "@/platform/feedback";
import { useAppActive } from "@/platform/use-app-state";
import { rewardStats, todayOf } from "@/state/profile";
import { useAppStore } from "@/state/store";
import type { Profile } from "@/state/types";
import { goodName, hamsterDepth, look, type Look } from "./stage-rules";
import { useRoomBrain, type Motion, type RoomStart, type StageGood } from "./use-room-brain";

/** the hamster's feet inside its sprite box, in design units */
const FEET: Point = { x: HAMSTER_W / 2, y: HAMSTER_H - 1 };
const LONG_PRESS_MS = 400;

/** the goods each child had at the last visit to the room, for this run of the app */
const seenGoods = new Map<string, string[]>();

/** Where a press landed inside the pressed view. iOS gives locationX/Y; a mouse press on react-native-web is a DOM click with offsetX/Y. */
function pressPoint(e: GestureResponderEvent): Point | null {
  const ne = e.nativeEvent as unknown as Partial<Record<"locationX" | "locationY" | "offsetX" | "offsetY", number>>;
  const x = Number.isFinite(ne.locationX) ? ne.locationX : ne.offsetX;
  const y = Number.isFinite(ne.locationY) ? ne.locationY : ne.offsetY;
  return x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

const Background = memo(function Background({ width }: { width: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={(width * ROOM_H) / ROOM_W} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
        <RoomBackground />
      </Svg>
    </View>
  );
});

const Good = memo(function Good({ id, slot, s, motion, playing, onTap }: { id: string; slot: SlotId; s: number; motion: Motion; playing: boolean; onTap: (id: string) => void }) {
  const sl = SLOTS[slot];
  const size = 60 * sl.scale * s;
  const parts = ITEM_PARTS[id];
  const turning = id === "wheel";
  const moving = useAnimatedStyle(() => ({ transform: [{ rotate: `${playing ? (turning ? motion.spin.value : motion.sway.value) : 0}deg` }] }), [playing, turning]);
  const k = size / 60;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goodName(id)}で あそばせる`}
      onPress={() => onTap(id)}
      style={[styles.abs, { left: sl.x * s, top: sl.y * s, width: size, height: size, zIndex: Math.round(sl.depth) }]}
    >
      {parts?.base ? (
        <Svg width={size} height={size} viewBox="0 0 60 60">
          {parts.base}
        </Svg>
      ) : null}
      {parts?.moving ? (
        <Animated.View style={[styles.abs, { width: size, height: size, transformOrigin: [(parts.pivot?.x ?? 30) * k, (parts.pivot?.y ?? 30) * k, 0] }, moving]}>
          <Svg width={size} height={size} viewBox="0 0 60 60">
            {parts.moving}
          </Svg>
        </Animated.View>
      ) : null}
    </Pressable>
  );
});

function HamsterSprite({
  motion,
  s,
  depth,
  lk,
  wear,
  surprised,
  heart,
  reduceMotion,
  onTap,
  onPet,
}: {
  motion: Motion;
  s: number;
  depth: number;
  lk: Look;
  wear: string | null;
  surprised: boolean;
  heart: boolean;
  reduceMotion: boolean;
  onTap: () => void;
  onPet: () => void;
}) {
  const w = HAMSTER_W * s;
  const h = HAMSTER_H * s;
  const view = surprised ? "front" : lk.view;
  const mood: Mood = surprised ? "oops" : lk.mood;
  const pose: Pose | undefined = surprised ? undefined : lk.pose;
  const place = useAnimatedStyle(
    () => ({ transform: [{ translateX: (motion.x.value - FEET.x) * s }, { translateY: (motion.y.value - FEET.y + motion.hop.value) * s }] }),
    [s],
  );
  const body = useAnimatedStyle(() => ({ transform: [{ rotate: `${motion.tilt.value}deg` }, { scaleX: motion.flip.value }] }));
  const frameA = useAnimatedStyle(() => ({ opacity: motion.step.value < 0.5 ? 1 : 0 }));
  const frameB = useAnimatedStyle(() => ({ opacity: motion.step.value < 0.5 ? 0 : 1 }));
  const lids = useAnimatedStyle(() => ({ opacity: motion.blink.value }));

  return (
    <Animated.View style={[styles.abs, { width: w, height: h, zIndex: depth }, place]}>
      <Animated.View style={[{ width: w, height: h, opacity: view === "hidden" ? 0 : 1 }, body]}>
        {view === "side" ? (
          <>
            <Animated.View style={[styles.abs, frameA]}>
              <HamsterSide frame={0} wear={wear} size={w} cheeks={lk.cheeks} />
            </Animated.View>
            <Animated.View style={[styles.abs, frameB]}>
              <HamsterSide frame={1} wear={wear} size={w} cheeks={lk.cheeks} />
            </Animated.View>
          </>
        ) : (
          <>
            <Hamster mood={mood} pose={pose} wear={wear} size={w} />
            <Animated.View style={[styles.abs, lids]}>
              <Hamster pose="sleep" wear={wear} size={w} />
            </Animated.View>
          </>
        )}
      </Animated.View>
      {lk.bubble || heart ? (
        <View pointerEvents="none" style={[styles.bubble, { bottom: h + 2 }]}>
          <View style={styles.bubbleRow}>
            {heart ? (
              <Animated.View entering={reduceMotion ? undefined : ZoomIn.duration(200)}>
                <Heart size={16} />
              </Animated.View>
            ) : null}
            {lk.bubble ? <Bubble text={lk.bubble} /> : null}
          </View>
        </View>
      ) : null}
      {/* on top of the drawings; a hamster hidden in the house or the tunnel still answers a tap */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ハムスター、${lk.label}`}
        accessibilityHint="タップで よろこぶ。ながおしで なでる"
        onPress={onTap}
        onLongPress={onPet}
        delayLongPress={LONG_PRESS_MS}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** The moving room: owned goods in their slots and the hamster living among them. Touch the hamster, a good or the floor. */
export function RoomStage({ profile, width, allGoods }: { profile: Profile; width: number; allGoods: boolean }) {
  const owned = allGoods ? REWARDS.map((r) => r.id) : unlockedRewards(rewardStats(profile));
  const ownedKey = owned.join(",");
  const placed = useMemo(() => placedGoods(autoLayout(ownedKey ? ownedKey.split(",") : [])), [ownedKey]);
  const goods = useMemo<StageGood[]>(() => placed.map((g) => ({ id: g.id, spot: g.spot, seat: seatIn(g.id, g.slot) })), [placed]);
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(true);
  useAppActive(setAppActive);
  const reduceMotion = useReducedMotion();
  const dayOffset = useAppStore((st) => st.dev.dayOffset);
  const goalDone = !!profile.sessions[todayOf(dayOffset)]?.goal;

  // each time the room comes into view is a visit: celebrate a reached goal, run to a good that is new since the last visit
  const visitStart = (): RoomStart => ({ celebrate: goalDone, newGood: newlyOwned(seenGoods.get(profile.id) ?? null, owned) });
  const [visit, setVisit] = useState(() => ({ focused, start: visitStart() }));
  if (visit.focused !== focused) setVisit({ focused, start: focused ? visitStart() : visit.start });
  useEffect(() => {
    if (focused) seenGoods.set(profile.id, ownedKey ? ownedKey.split(",") : []);
  }, [focused, profile.id, ownedKey]);

  const { activity, from, motion, surprised, send } = useRoomBrain({ goods, start: visit.start, active: focused && appActive, reduceMotion });
  const s = width / ROOM_W;
  const vibration = profile.settings.vibration;
  const onTap = useCallback(() => {
    tapFeel(vibration);
    send({ type: "tap" });
  }, [send, vibration]);
  const onPet = useCallback(() => send({ type: "press" }), [send]);
  const onGood = useCallback((id: string) => send({ type: "tapGood", good: id }), [send]);
  const onFloor = useCallback(
    (e: GestureResponderEvent) => {
      const p = pressPoint(e);
      if (p) send({ type: "tapFloor", at: toRoom(p, width) });
    },
    [send, width],
  );

  return (
    <View style={{ width, height: (width * ROOM_H) / ROOM_W, overflow: "hidden" }}>
      <Background width={width} />
      <Pressable accessibilityRole="button" accessibilityLabel="ゆか" accessibilityHint="ハムスターが そこへ あるいて くる" onPress={onFloor} style={StyleSheet.absoluteFill} />
      {placed.map((g) => (
        <Good key={g.id} id={g.id} slot={g.slot} s={s} motion={motion} playing={activity?.kind === "play" && activity.good === g.id} onTap={onGood} />
      ))}
      {activity ? (
        <HamsterSprite
          motion={motion}
          s={s}
          depth={Math.round(hamsterDepth(activity, from))}
          lk={look(activity)}
          wear={profile.wearing}
          surprised={surprised}
          heart={activity.kind === "react" && activity.how === "hop"}
          reduceMotion={reduceMotion}
          onTap={onTap}
          onPet={onPet}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: "absolute", left: 0, top: 0 },
  bubble: { position: "absolute", left: -20, right: -20, alignItems: "center" },
  bubbleRow: { flexDirection: "row", alignItems: "center", gap: 2 },
});
