import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cancelAnimation, Easing, runOnJS, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { createBrain, isNight, stepBrain, type Activity, type Brain, type BrainEvent, type World } from "@/game/hamster-brain";
import { clampToFloor, type Point } from "@/game/room";
import { walkMs } from "./stage-rules";

/** A placed good as the room needs it: where to stand, and for hanging goods where to sit. */
export interface StageGood {
  id: string;
  spot: Point;
  seat?: Point;
}

export interface Motion {
  /** feet position in design units */
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** vertical offset in design units (negative is up) */
  hop: SharedValue<number>;
  /** degrees */
  tilt: SharedValue<number>;
  /** 1 faces right, -1 faces left */
  flip: SharedValue<number>;
  /** 0..1, picks the walking frame */
  step: SharedValue<number>;
  /** degrees of the wheel */
  spin: SharedValue<number>;
  /** degrees of the swing or hammock */
  sway: SharedValue<number>;
  /** 0..1 eyelids */
  blink: SharedValue<number>;
}

const HOME: Point = { x: 200, y: 222 };
const SEAT_MOVE_MS = 300;
const SURPRISE_MS = 900;
const TUNNEL_SHIFT = 44;

/**
 * Runs the hamster brain while `active` (the room is on screen and the app in front): animates each activity on
 * the UI thread and asks the brain for the next one when it ends. While inactive nothing runs and nothing advances.
 */
export function useRoomBrain({
  goods,
  start,
  active,
  reduceMotion,
}: {
  goods: StageGood[];
  start: { celebrate: boolean; newGood: string | null };
  active: boolean;
  reduceMotion: boolean;
}) {
  const x = useSharedValue(HOME.x);
  const y = useSharedValue(HOME.y);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const flip = useSharedValue(1);
  const step = useSharedValue(0);
  const spin = useSharedValue(0);
  const sway = useSharedValue(0);
  const blink = useSharedValue(0);
  // one object for the whole life of the room, so memoized goods do not redraw when the activity changes
  const motion = useMemo<Motion>(() => ({ x, y, hop, tilt, flip, step, spin, sway, blink }), [x, y, hop, tilt, flip, step, spin, sway, blink]);
  const [state, setState] = useState<{ brain: Brain; from: Point; seq: number } | null>(null);
  const [surprised, setSurprised] = useState(false);
  const brainRef = useRef<Brain | null>(null);
  const fromRef = useRef<Point>(HOME);
  const seqRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const goodsRef = useRef(goods);
  const rmRef = useRef(reduceMotion);
  const startRef = useRef(start);
  useEffect(() => {
    goodsRef.current = goods;
    rmRef.current = reduceMotion;
    startRef.current = start;
  });

  const world = useCallback((): World => ({ goods: goodsRef.current, night: isNight(new Date().getHours()), reduceMotion: rmRef.current }), []);

  const stopAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (const v of [x, y, hop, tilt, flip, step, spin, sway, blink]) cancelAnimation(v);
    hop.value = 0;
    tilt.value = 0;
    step.value = 0;
    sway.value = 0;
    blink.value = 0;
    setSurprised(false);
  }, [x, y, hop, tilt, flip, step, spin, sway, blink]);

  /** where the hamster stands now; a hamster up on a swing counts as standing below it */
  const here = useCallback((): Point => {
    const now = brainRef.current?.now;
    const up = now?.kind === "play" && goodsRef.current.some((g) => g.id === now.good && g.seat);
    return up ? fromRef.current : clampToFloor({ x: x.value, y: y.value });
  }, [x, y]);

  const apply = useCallback(
    (next: Brain, from: Point) => {
      brainRef.current = next;
      fromRef.current = from;
      seqRef.current += 1;
      setState({ brain: next, from, seq: seqRef.current });
    },
    [],
  );

  /** Feed an event to the brain; the running animation stops where it is first. */
  const send = useCallback(
    (ev: BrainEvent) => {
      const b = brainRef.current;
      if (!b) return;
      const h = here();
      const next = stepBrain(b, world(), ev, h);
      if (next === b) return;
      stopAll();
      x.value = h.x;
      y.value = h.y;
      apply(next, h);
    },
    [apply, here, stopAll, world, x, y],
  );

  // pause and resume with the screen: nothing runs while hidden, and the hamster picks up from where it stands
  useEffect(() => {
    if (!active) {
      stopAll();
      return;
    }
    const b = brainRef.current;
    const h = here();
    x.value = h.x;
    y.value = h.y;
    if (!b) apply(createBrain(Date.now() >>> 0, world(), h, startRef.current), h);
    else apply(stepBrain(b, world(), { type: "done" }, h), h);
  }, [active, apply, here, stopAll, world, x, y]);

  // run the current activity (a state that is no longer the latest, e.g. right after resuming, is skipped)
  useEffect(() => {
    if (!state || !active || state.seq !== seqRef.current) return;
    const { brain, from, seq } = state;
    const a: Activity = brain.now;
    const rm = rmRef.current;
    const done = () => {
      if (seqRef.current === seq) send({ type: "done" });
    };
    const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));

    if (a.kind === "walk") {
      const ms = walkMs(from, a.to, a.dash, rm);
      flip.value = a.to.x < from.x ? -1 : 1;
      step.value = withRepeat(withTiming(1, { duration: a.dash ? 90 : 160 }), -1, true);
      x.value = withTiming(a.to.x, { duration: ms, easing: Easing.linear });
      y.value = withTiming(a.to.y, { duration: ms, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(done)();
      });
      return;
    }

    if (a.kind === "idle") {
      if (a.act === "blink") blink.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 120 }), withDelay(300, withTiming(1, { duration: 80 })), withTiming(0, { duration: 120 }));
      if (a.act === "ear") tilt.value = withSequence(withTiming(5, { duration: 90 }), withTiming(-4, { duration: 90 }), withTiming(0, { duration: 90 }));
      if (a.act === "groom") tilt.value = withRepeat(withSequence(withTiming(6, { duration: 220 }), withTiming(-6, { duration: 220 })), 3, true, () => {
        tilt.value = withTiming(0, { duration: 150 });
      });
      if (a.act === "look") {
        flip.value = -flip.value;
        later(a.ms / 2, () => (flip.value = -flip.value));
      }
    }

    if (a.kind === "play") {
      const good = goodsRef.current.find((g) => g.id === a.good);
      if (good?.seat) {
        // up onto the swing or into the hammock, sway, and back down before the end
        x.value = withTiming(good.seat.x, { duration: SEAT_MOVE_MS });
        y.value = withTiming(good.seat.y, { duration: SEAT_MOVE_MS });
        const amp = rm ? 4 : 10;
        sway.value = withRepeat(withSequence(withTiming(amp, { duration: 700 }), withTiming(-amp, { duration: 700 })), -1, true);
        tilt.value = withRepeat(withSequence(withTiming(amp * 0.6, { duration: 700 }), withTiming(-amp * 0.6, { duration: 700 })), -1, true);
        later(Math.max(0, a.ms - SEAT_MOVE_MS), () => {
          cancelAnimation(tilt);
          cancelAnimation(sway);
          tilt.value = withTiming(0, { duration: 150 });
          sway.value = withTiming(0, { duration: 400 });
          x.value = withTiming(from.x, { duration: SEAT_MOVE_MS });
          y.value = withTiming(from.y, { duration: SEAT_MOVE_MS });
        });
      } else if (a.good === "wheel") {
        step.value = withRepeat(withTiming(1, { duration: 90 }), -1, true);
        spin.value = withRepeat(withTiming(360, { duration: rm ? 1400 : 500, easing: Easing.linear }), -1, false);
        if (a.variant === "tumble")
          later(Math.max(0, a.ms - SURPRISE_MS), () => {
            cancelAnimation(step);
            setSurprised(true);
            hop.value = withSequence(withTiming(-12, { duration: 180 }), withTiming(0, { duration: 220 }));
            x.value = withTiming(clampToFloor({ x: from.x + 18 * flip.value, y: from.y }).x, { duration: 400 });
          });
      } else if (a.good === "tunnel") {
        // in at one end, out at the other
        x.value = withDelay(300, withTiming(clampToFloor({ x: from.x + TUNNEL_SHIFT, y: from.y }).x, { duration: Math.max(300, a.ms - 600) }));
      } else if (a.good === "flower") {
        tilt.value = withRepeat(withSequence(withTiming(-8, { duration: 300 }), withTiming(0, { duration: 300 })), 4);
      } else if (a.good === "bowl") {
        hop.value = withRepeat(withSequence(withTiming(-1.5, { duration: 150 }), withTiming(0, { duration: 150 })), -1);
      }
    }

    if (a.kind === "react") {
      if (a.how === "hop")
        if (rm) tilt.value = withSequence(withTiming(-8, { duration: 200 }), withTiming(0, { duration: 250 }));
        else hop.value = withSequence(withTiming(-16, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) }));
      else tilt.value = withRepeat(withSequence(withTiming(3, { duration: 400 }), withTiming(-3, { duration: 400 })), 2, true);
    }

    if (a.kind === "celebrate") {
      if (rm) tilt.value = withRepeat(withSequence(withTiming(6, { duration: 400 }), withTiming(-6, { duration: 400 })), 3, true);
      else hop.value = withRepeat(withSequence(withTiming(-14, { duration: 160 }), withTiming(0, { duration: 160 })), 3);
    }

    later(a.ms, done);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [state, active, send, x, y, hop, tilt, flip, step, spin, sway, blink]);

  return { activity: state?.brain.now ?? null, from: state?.from ?? HOME, send, motion, surprised };
}
