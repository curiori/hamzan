import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import Animated, { useAnimatedStyle, ZoomIn } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Hamster, type Mood, type Pose } from "@/art/hamster";
import { Bubble, HamsterSide, Heart } from "@/art/hamster-poses";
import { GOLD_SPARKLES, ITEM_PARTS, ItemThumb } from "@/art/items";
import { RoomBackground } from "@/art/room-scene";
import { REWARDS } from "@/game/achievements";
import { isNight, newlyOwned } from "@/game/hamster-brain";
import {
  autoLayout,
  GOOD_KIND,
  HAMSTER_H,
  HAMSTER_W,
  placedGoods,
  ROOM_H,
  ROOM_W,
  roomGoods,
  SLOT_NAME,
  SLOTS,
  toRoom,
  type Point,
  type RoomLayout,
  type SlotId,
} from "@/game/room";
import { itemName, SHOP } from "@/game/shop";
import { playNote, preloadNotes, tapFeel } from "@/platform/feedback";
import { useReduceMotion } from "@/platform/reduce-motion";
import { useAppActive } from "@/platform/use-app-state";
import { ownedGoods, todayOf } from "@/state/profile";
import { useAppStore } from "@/state/store";
import type { Profile } from "@/state/types";
import { colors } from "@/ui/theme";
import { coveringGood, hamsterDepth, look, nightTint, PLAYABLE_EXCEPT, stageGoods, type Look } from "./stage-rules";
import { useRoomBrain, type Motion, type RoomStart } from "./use-room-brain";

/** the hamster's feet inside its sprite box, in design units */
const FEET: Point = { x: HAMSTER_W / 2, y: HAMSTER_H - 1 };
const LONG_PRESS_MS = 400;
/** how far the bubble above the head may reach past each side of the hamster, in points */
const BUBBLE_PAD = 20;
/** the snack held while eating, in design units */
const SNACK_SIZE = 22;
/** the test switch's "every good": rewards first, then shop goods (those finding no free slot stay stored) */
const ALL_GOODS = [...REWARDS.map((r) => r.id), ...SHOP.filter((i) => i.kind === "good").map((i) => i.id)];
const SLOT_IDS = Object.keys(SLOTS) as SlotId[];
const NIGHT_BLUE = "#0B1E4D";
/** the night blue and the lamp's light lie over every good and the hamster; the rearranging ＋ over all of it */
const NIGHT_Z = 2000;
const MARKER_Z = 3000;
/** the lamp drawing's bulb in its 60×60 box, and how far its light reaches in room units */
const LAMP_BULB: Point = { x: 30, y: 30 };
const LAMP_GLOW_R = 120;
/** stars drawn over a good that twinkle while it turns */
const TWINKLES: Partial<Record<string, ReactNode>> = { goldwheel: GOLD_SPARKLES };

const everyMinute = (onChange: () => void) => {
  const t = setInterval(onChange, 60_000);
  return () => clearInterval(t);
};
const nightNow = () => isNight(new Date().getHours());
/** Whether it is night now, looked at again every minute. */
const useNight = () => useSyncExternalStore(everyMinute, nightNow, nightNow);

/** Where a press landed inside the pressed view. iOS gives locationX/Y; a mouse press on react-native-web is a DOM click with offsetX/Y. */
function pressPoint(e: GestureResponderEvent): Point | null {
  const ne = e.nativeEvent as unknown as Partial<Record<"locationX" | "locationY" | "offsetX" | "offsetY", number>>;
  const x = Number.isFinite(ne.locationX) ? ne.locationX : ne.offsetX;
  const y = Number.isFinite(ne.locationY) ? ne.locationY : ne.offsetY;
  return x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

const Background = memo(function Background({ width, wallpaper, floor }: { width: number; wallpaper: string | null; floor: string | null }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={(width * ROOM_H) / ROOM_W} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
        <RoomBackground wallpaper={wallpaper} floor={floor} />
      </Svg>
    </View>
  );
});

const Good = memo(function Good({
  id,
  slot,
  s,
  motion,
  playing,
  playable,
  through,
  onTap,
}: {
  id: string;
  slot: SlotId;
  s: number;
  motion: Motion;
  playing: boolean;
  playable: boolean;
  /** the hamster is in it, under its drawing: a press goes through to the hamster */
  through: boolean;
  onTap: (id: string) => void;
}) {
  const sl = SLOTS[slot];
  const size = 60 * sl.scale * s;
  const parts = ITEM_PARTS[id];
  const turning = parts?.motion === "spin";
  const moving = useAnimatedStyle(() => ({ transform: [{ rotate: `${playing ? (turning ? motion.spin.value : motion.sway.value) : 0}deg` }] }), [playing, turning]);
  // stars that stay lit while the good rests and twinkle once a turn while it turns
  const stars = TWINKLES[id];
  const twinkle = useAnimatedStyle(() => ({ opacity: playing ? 0.6 + 0.4 * Math.cos((motion.spin.value * Math.PI) / 180) : 1 }), [playing]);
  const k = size / 60;
  const box = [styles.abs, { left: sl.x * s, top: sl.y * s, width: size, height: size, zIndex: Math.round(sl.depth) }];
  const art = (
    <>
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
      {stars ? (
        <Animated.View style={[styles.abs, { width: size, height: size }, twinkle]}>
          <Svg width={size} height={size} viewBox="0 0 60 60">
            {stars}
          </Svg>
        </Animated.View>
      ) : null}
    </>
  );
  // a good that is only looked at (the lamp) lets a press through to the floor
  return playable ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${itemName(id)}で あそばせる`}
      onPress={() => onTap(id)}
      pointerEvents={through ? "none" : "auto"}
      style={box}
    >
      {art}
    </Pressable>
  ) : (
    <View pointerEvents="none" accessible accessibilityRole="image" accessibilityLabel={itemName(id)} style={box}>
      {art}
    </View>
  );
});

/** The lamp's light at night: a warm glow around its bulb, over the night blue. */
const LampGlow = memo(function LampGlow({ slot, width }: { slot: SlotId; width: number }) {
  const sl = SLOTS[slot];
  const bulb = { x: sl.x + LAMP_BULB.x * sl.scale, y: sl.y + LAMP_BULB.y * sl.scale };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: NIGHT_Z + 1 }]}>
      <Svg width={width} height={(width * ROOM_H) / ROOM_W} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
        <Defs>
          <RadialGradient id="lamp-glow" cx={bulb.x} cy={bulb.y} r={LAMP_GLOW_R} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFE7A3" stopOpacity={0.55} />
            <Stop offset="0.45" stopColor="#FFE7A3" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#FFE7A3" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={bulb.x} cy={bulb.y} r={LAMP_GLOW_R} fill="url(#lamp-glow)" />
      </Svg>
    </View>
  );
});

function HamsterSprite({
  motion,
  s,
  depth,
  lk,
  wear,
  snack,
  surprised,
  heart,
  bubbleBeside,
  reduceMotion,
  onTap,
  onPet,
}: {
  motion: Motion;
  s: number;
  depth: number;
  lk: Look;
  wear: string | null;
  /** the snack being eaten, held in front of the belly */
  snack: string | null;
  surprised: boolean;
  heart: boolean;
  /** up on a hanging good there is no room above the head, so the bubble goes to the side */
  bubbleBeside: boolean;
  reduceMotion: boolean;
  onTap: () => void;
  onPet: () => void;
}) {
  const w = HAMSTER_W * s;
  const h = HAMSTER_H * s;
  const snackSize = SNACK_SIZE * s;
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
  // near a wall the bubble above the head moves along so the room's edge does not cut it
  const roomW = ROOM_W * s;
  const keepIn = useAnimatedStyle(() => {
    const left = (motion.x.value - FEET.x) * s - BUBBLE_PAD;
    const right = left + w + 2 * BUBBLE_PAD;
    return { transform: [{ translateX: left < 0 ? -left : right > roomW ? roomW - right : 0 }] };
  }, [s, w, roomW]);

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
        {snack ? (
          <View pointerEvents="none" style={[styles.abs, { left: (w - snackSize) / 2, top: h - snackSize * 0.95 }]}>
            <ItemThumb id={snack} size={snackSize} />
          </View>
        ) : null}
      </Animated.View>
      {lk.bubble || heart ? (
        <Animated.View
          pointerEvents="none"
          style={bubbleBeside ? [styles.bubble, { right: w - 4, top: 0, alignItems: "flex-end" }] : [styles.bubble, { left: -BUBBLE_PAD, right: -BUBBLE_PAD, bottom: h + 2 }, keepIn]}
        >
          <View style={styles.bubbleRow}>
            {heart ? (
              <Animated.View entering={reduceMotion ? undefined : ZoomIn.duration(200)}>
                <Heart size={16} />
              </Animated.View>
            ) : null}
            {lk.bubble ? <Bubble text={lk.bubble} /> : null}
          </View>
        </Animated.View>
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

/** A slot while rearranging: a big ＋ on an empty slot, a small one on the good's drawing. */
const SlotMarker = memo(function SlotMarker({ slot, good, s, onPress }: { slot: SlotId; good: string | null; s: number; onPress: (slot: SlotId) => void }) {
  const sl = SLOTS[slot];
  const box = 60 * sl.scale * s;
  const size = good ? 28 : 36;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 2), max - size - 2);
  const left = clamp(good ? sl.x * s + box - size * 0.8 : sl.x * s + (box - size) / 2, ROOM_W * s);
  const top = clamp(good ? sl.y * s + box * 0.1 : sl.y * s + (box - size) / 2, ROOM_H * s);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${SLOT_NAME[slot]}、${good ? itemName(good) : "あいて いる"}`}
      accessibilityHint="おく ものを えらぶ"
      hitSlop={6}
      onPress={() => onPress(slot)}
      style={[styles.abs, styles.marker, good ? styles.markerOn : styles.markerOff, { left, top, width: size, height: size, borderRadius: size / 2 }]}
    >
      <Ionicons name="add" size={good ? 18 : 24} color={good ? colors.primaryForeground : colors.primary} />
    </Pressable>
  );
});

/** The moving room: the child's goods where they were put and the hamster living among them. Touch the hamster, a good or the floor. */
export function RoomStage({
  profile,
  width,
  allGoods,
  arranging = false,
  onSlot,
  feeding = null,
}: {
  profile: Profile;
  width: number;
  allGoods: boolean;
  /** rearranging: every slot shows a ＋ that opens its choices */
  arranging?: boolean;
  onSlot?: (slot: SlotId) => void;
  /** a snack just given; a new object each time */
  feeding?: { snack: string } | null;
}) {
  const owned = useMemo(() => ownedGoods(profile), [profile]);
  // the test switch shows every good without touching the saved room
  const layoutKey = JSON.stringify(allGoods ? autoLayout(ALL_GOODS) : roomGoods(profile.room.layout, owned));
  const placed = useMemo(() => placedGoods(JSON.parse(layoutKey) as RoomLayout), [layoutKey]);
  const goods = useMemo(() => stageGoods(placed), [placed]);
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(true);
  useAppActive(setAppActive);
  const reduceMotion = useReduceMotion();
  const night = useNight();
  const dayOffset = useAppStore((st) => st.dev.dayOffset);
  const markRoomSeen = useAppStore((st) => st.markRoomSeen);
  const goalDone = !!profile.sessions[todayOf(dayOffset)]?.goal;
  // the room goods that are out, in the order they came (wearables are never room goods)
  const outKey = (allGoods ? ALL_GOODS : owned).filter((id) => placed.some((g) => g.id === id)).join(",");

  // each time the room comes into view is a visit: celebrate a reached goal, run to a good that was not out last time
  // (only to one the hamster plays with)
  const visitStart = (): RoomStart => ({
    celebrate: goalDone,
    newGood: newlyOwned(
      profile.room.seen,
      (outKey ? outKey.split(",") : []).filter((id) => !PLAYABLE_EXCEPT.includes(id)),
    ),
  });
  const [visit, setVisit] = useState(() => ({ focused, start: visitStart() }));
  if (visit.focused !== focused) setVisit({ focused, start: focused ? visitStart() : visit.start });
  useEffect(() => {
    if (focused) markRoomSeen(outKey ? outKey.split(",") : []);
  }, [focused, outKey, markRoomSeen]);

  // the piano's keys, with the child's sound setting; loaded when the room opens with a piano out, so the first is not late
  const sound = profile.settings.sound;
  const pianoOut = placed.some((g) => g.id === "piano");
  const onNote = useCallback((key: number) => playNote(key, sound), [sound]);
  useEffect(() => {
    if (focused && sound && pianoOut) preloadNotes();
  }, [focused, sound, pianoOut]);

  const { activity, from, motion, surprised, send } = useRoomBrain({
    goods,
    start: visit.start,
    active: focused && appActive,
    reduceMotion,
    wear: profile.wearing,
    onNote,
  });
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
  // a snack given from the snack list: the hamster comes to the front and eats it; one given before this room was
  // shown (to the child before a switch) is not eaten again
  const fed = useRef<object | null>(feeding);
  useEffect(() => {
    if (!feeding || fed.current === feeding) return;
    fed.current = feeding;
    send({ type: "feed", snack: feeding.snack });
  }, [feeding, send]);
  const pick = useCallback((slot: SlotId) => onSlot?.(slot), [onSlot]);

  const lamp = placed.find((g) => g.id === "lamp");
  const tint = nightTint(night, !!lamp);
  const covering = activity ? coveringGood(activity, from, placed) : null;

  return (
    <View style={{ width, height: (width * ROOM_H) / ROOM_W, overflow: "hidden" }}>
      <Background width={width} wallpaper={profile.room.wallpaper} floor={profile.room.floor} />
      <Pressable accessibilityRole="button" accessibilityLabel="ゆか" accessibilityHint="ハムスターが そこへ あるいて くる" onPress={onFloor} style={StyleSheet.absoluteFill} />
      {placed.map((g) => (
        <Good
          key={g.id}
          id={g.id}
          slot={g.slot}
          s={s}
          motion={motion}
          playing={activity?.kind === "play" && activity.good === g.id}
          playable={!PLAYABLE_EXCEPT.includes(g.id)}
          through={covering === g.id}
          onTap={onGood}
        />
      ))}
      {activity ? (
        <HamsterSprite
          motion={motion}
          s={s}
          depth={Math.round(hamsterDepth(activity, from))}
          lk={look(activity)}
          wear={profile.wearing}
          snack={activity.kind === "eat" ? activity.snack : null}
          surprised={surprised}
          heart={activity.kind === "react" && activity.how === "hop"}
          bubbleBeside={activity.kind === "play" && GOOD_KIND[activity.good] === "ceiling"}
          reduceMotion={reduceMotion}
          onTap={onTap}
          onPet={onPet}
        />
      ) : null}
      {tint > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT_BLUE, opacity: tint, zIndex: NIGHT_Z }]} /> : null}
      {tint > 0 && lamp ? <LampGlow slot={lamp.slot} width={width} /> : null}
      {arranging ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: MARKER_Z }]}>
          {SLOT_IDS.map((slot) => (
            <SlotMarker key={slot} slot={slot} good={placed.find((g) => g.slot === slot)?.id ?? null} s={s} onPress={pick} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: "absolute", left: 0, top: 0 },
  bubble: { position: "absolute", alignItems: "center" },
  bubbleRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  marker: { alignItems: "center", justifyContent: "center", borderWidth: 2 },
  markerOff: { backgroundColor: "rgba(255,255,255,0.85)", borderColor: colors.primary, borderStyle: "dashed" },
  markerOn: { backgroundColor: colors.primary, borderColor: colors.primaryForeground },
});
