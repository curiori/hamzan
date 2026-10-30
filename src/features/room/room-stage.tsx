import { useIsFocused } from "@react-navigation/native";
import { memo, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import Svg from "react-native-svg";
import { Hamster, type Mood, type Pose } from "@/art/hamster";
import { Bubble, HamsterSide } from "@/art/hamster-poses";
import { ITEM_PARTS } from "@/art/items";
import { RoomBackground } from "@/art/room-scene";
import { REWARDS, unlockedRewards } from "@/game/achievements";
import { autoLayout, HAMSTER_H, HAMSTER_W, placedGoods, ROOM_H, ROOM_W, SLOTS, type Point, type SlotId } from "@/game/room";
import { useAppActive } from "@/platform/use-app-state";
import { rewardStats } from "@/state/profile";
import type { Profile } from "@/state/types";
import { hamsterDepth, look, type Look } from "./stage-rules";
import { useRoomBrain, type Motion, type StageGood } from "./use-room-brain";

/** where the hamster sits on a hanging good, in the good's 60×60 box */
const SEATS: Record<string, Point> = { swing: { x: 30, y: 44 }, hammock: { x: 30, y: 30 } };
/** the hamster's feet inside its sprite box, in design units */
const FEET: Point = { x: HAMSTER_W / 2, y: HAMSTER_H - 1 };

const Background = memo(function Background({ width }: { width: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={(width * ROOM_H) / ROOM_W} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
        <RoomBackground />
      </Svg>
    </View>
  );
});

const Good = memo(function Good({ id, slot, s, motion, playing }: { id: string; slot: SlotId; s: number; motion: Motion; playing: boolean }) {
  const sl = SLOTS[slot];
  const size = 60 * sl.scale * s;
  const parts = ITEM_PARTS[id];
  const turning = id === "wheel";
  const moving = useAnimatedStyle(() => ({ transform: [{ rotate: `${playing ? (turning ? motion.spin.value : motion.sway.value) : 0}deg` }] }), [playing, turning]);
  const k = size / 60;
  return (
    <View pointerEvents="none" style={[styles.abs, { left: sl.x * s, top: sl.y * s, width: size, height: size, zIndex: Math.round(sl.depth) }]}>
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
    </View>
  );
});

function HamsterSprite({ motion, s, depth, lk, wear, surprised }: { motion: Motion; s: number; depth: number; lk: Look; wear: string | null; surprised: boolean }) {
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
    <Animated.View accessible accessibilityRole="image" accessibilityLabel={`ハムスター、${lk.label}`} style={[styles.abs, { width: w, height: h, zIndex: depth }, place]}>
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
      {lk.bubble ? (
        <View pointerEvents="none" style={[styles.bubble, { bottom: h + 2 }]}>
          <Bubble text={lk.bubble} />
        </View>
      ) : null}
    </Animated.View>
  );
}

/** The moving room: owned goods in their slots and the hamster living among them. */
export function RoomStage({ profile, width, allGoods }: { profile: Profile; width: number; allGoods: boolean }) {
  const owned = allGoods ? REWARDS.map((r) => r.id) : unlockedRewards(rewardStats(profile));
  const ownedKey = owned.join(",");
  const placed = useMemo(() => placedGoods(autoLayout(ownedKey ? ownedKey.split(",") : [])), [ownedKey]);
  const goods = useMemo<StageGood[]>(
    () =>
      placed.map((g) => {
        const seat = SEATS[g.id];
        const sl = SLOTS[g.slot];
        return { id: g.id, spot: g.spot, seat: seat ? { x: sl.x + seat.x * sl.scale, y: sl.y + seat.y * sl.scale } : undefined };
      }),
    [placed],
  );
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(true);
  useAppActive(setAppActive);
  const reduceMotion = useReducedMotion();
  const start = useMemo(() => ({ celebrate: false, newGood: null }), []);
  const { activity, from, motion, surprised } = useRoomBrain({ goods, start, active: focused && appActive, reduceMotion });
  const s = width / ROOM_W;

  return (
    <View style={{ width, height: (width * ROOM_H) / ROOM_W, overflow: "hidden" }}>
      <Background width={width} />
      {placed.map((g) => (
        <Good key={g.id} id={g.id} slot={g.slot} s={s} motion={motion} playing={activity?.kind === "play" && activity.good === g.id} />
      ))}
      {activity ? (
        <HamsterSprite motion={motion} s={s} depth={Math.round(hamsterDepth(activity, from))} lk={look(activity)} wear={profile.wearing} surprised={surprised} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: "absolute", left: 0, top: 0 },
  bubble: { position: "absolute", left: -20, right: -20, alignItems: "center" },
});
