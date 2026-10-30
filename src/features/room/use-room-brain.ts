import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type EasingFunction,
  type SharedValue,
} from "react-native-reanimated";
import { createBrain, isNight, stepBrain, type Activity, type Brain, type BrainEvent, type World } from "@/game/hamster-brain";
import { clampToFloor, seatMoveMs, seatSways, type Point } from "@/game/room";
import { rearrangedUnder, walkAxis, walkMs, type StageGood } from "./stage-rules";

// The room makes its own calm moves when the system asks to reduce motion (slow walks, a nod instead of a hop),
// so Reanimated must play them instead of cutting every animation to its end. Callbacks stay on withTiming and
// withRepeat themselves, so the Reanimated plugin turns them into worklets.
const KEEP = ReduceMotion.Never;
const tween = (to: number, duration: number, easing?: EasingFunction) =>
  // an explicit `easing: undefined` would replace Reanimated's default easing
  withTiming(to, easing ? { duration, easing, reduceMotion: KEEP } : { duration, reduceMotion: KEEP });
const chain = (...steps: number[]) => withSequence(KEEP, ...steps);
const loop = (anim: number, reps: number, reverse = false) => withRepeat(anim, reps, reverse, undefined, KEEP);
const after = (ms: number, anim: number) => withDelay(ms, anim, KEEP);

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
  /** degrees of the wheel or the ball */
  spin: SharedValue<number>;
  /** degrees of the swing, the hammock or the top block */
  sway: SharedValue<number>;
  /** 0..1 eyelids */
  blink: SharedValue<number>;
}

const HOME: Point = { x: 200, y: 222 };
const SURPRISE_MS = 900;
const TUNNEL_SHIFT = 44;
/** stepping from the good's spot to the side of the ball */
const PUSH_MOVE_MS = 400;
/** when the wobbling top block falls, from the start of the blocks play */
const BLOCKS_FALL_MS = 1820;

/** How a visit to the room begins; a new object means a new visit. */
export interface RoomStart {
  celebrate: boolean;
  newGood: string | null;
}

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
  start: RoomStart;
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
  const usedStart = useRef<RoomStart | null>(null);
  useEffect(() => {
    goodsRef.current = goods;
    rmRef.current = reduceMotion;
  });

  const world = useCallback((): World => ({ goods: goodsRef.current, night: isNight(new Date().getHours()), reduceMotion: rmRef.current }), []);

  const stopAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (const v of [x, y, hop, tilt, flip, step, spin, sway, blink]) cancelAnimation(v);
    hop.value = 0;
    tilt.value = 0;
    step.value = 0;
    // a turn restarts from where it began, so a spin cut off halfway would jump on every turn after it
    spin.value = 0;
    sway.value = 0;
    blink.value = 0;
    setSurprised(false);
  }, [x, y, hop, tilt, flip, step, spin, sway, blink]);

  /** where the hamster stands now; a hamster up on a seat counts as standing below it, also when that good was just put away */
  const here = useCallback((): Point => {
    const now = brainRef.current?.now;
    const up = now?.kind === "play" && seatMoveMs(now.good) > 0;
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

  // rearranging the room: when a good the hamster uses or heads for is put away or moved, it stops and chooses again
  const placedRef = useRef(goods);
  useEffect(() => {
    const before = placedRef.current;
    placedRef.current = goods;
    const b = brainRef.current;
    if (b && rearrangedUnder(b, before, goods)) send({ type: "rearranged" });
  }, [goods, send]);

  // pause and resume with the screen: nothing runs while hidden, and the hamster picks up from where it stands;
  // a new visit begins a fresh plan, which opens with the celebration or the new good
  useEffect(() => {
    if (!active) {
      // a walk that ends on the UI thread just as the room hides must not move the brain on
      seqRef.current += 1;
      stopAll();
      return;
    }
    const b = brainRef.current;
    const h = here();
    stopAll();
    x.value = h.x;
    y.value = h.y;
    if (!b || usedStart.current !== start) {
      usedStart.current = start;
      apply(createBrain(Date.now() >>> 0, world(), h, start), h);
    } else if (b.now.kind === "walk") {
      // a walk cut short by the app going away goes on from here, so the plan's next step still happens at its place
      apply({ ...b, pos: h }, h);
    } else apply(stepBrain(b, world(), { type: "done" }, h), h);
  }, [active, start, apply, here, stopAll, world, x, y]);

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
      const axis = walkAxis(from, a.to);
      flip.value = a.to.x < from.x ? -1 : 1;
      step.value = loop(tween(1, a.dash ? 90 : 160), -1, true);
      if (axis === "x")
        x.value = withTiming(a.to.x, { duration: ms, easing: Easing.linear, reduceMotion: KEEP }, (finished) => {
          if (finished) runOnJS(done)();
        });
      else x.value = tween(a.to.x, ms, Easing.linear);
      if (axis === "y")
        y.value = withTiming(a.to.y, { duration: ms, easing: Easing.linear, reduceMotion: KEEP }, (finished) => {
          if (finished) runOnJS(done)();
        });
      else y.value = tween(a.to.y, ms, Easing.linear);
      if (axis === null) later(0, done);
    }

    if (a.kind === "idle") {
      if (a.act === "blink") blink.value = chain(tween(1, 80), tween(0, 120), after(300, tween(1, 80)), tween(0, 120));
      if (a.act === "ear") tilt.value = chain(tween(5, 90), tween(-4, 90), tween(0, 90));
      if (a.act === "groom")
        tilt.value = withRepeat(
          chain(tween(6, 220), tween(-6, 220)),
          3,
          true,
          (finished) => {
            // a cancelled groom must not straighten the next activity's tilt
            if (finished) tilt.value = withTiming(0, { duration: 150, reduceMotion: KEEP });
          },
          KEEP,
        );
      if (a.act === "look") {
        flip.value = -flip.value;
        later(a.ms / 2, () => (flip.value = -flip.value));
      }
    }

    if (a.kind === "play") {
      const good = goodsRef.current.find((g) => g.id === a.good);
      if (good?.seat) {
        // onto the seat (the swing, the hammock, up the ladder or into the cushion) and back before the end
        const moveMs = seatMoveMs(a.good);
        x.value = tween(good.seat.x, moveMs);
        y.value = tween(good.seat.y, moveMs);
        if (seatSways(a.good)) {
          const amp = rm ? 4 : 10;
          sway.value = loop(chain(tween(amp, 700), tween(-amp, 700)), -1, true);
          tilt.value = loop(chain(tween(amp * 0.6, 700), tween(-amp * 0.6, 700)), -1, true);
        } else if (a.good === "cushion" && !rm) hop.value = after(moveMs, loop(chain(tween(-3, 260), tween(0, 260)), 2));
        later(Math.max(0, a.ms - moveMs), () => {
          cancelAnimation(tilt);
          cancelAnimation(sway);
          tilt.value = tween(0, 150);
          sway.value = tween(0, 400);
          x.value = tween(from.x, moveMs);
          y.value = tween(from.y, moveMs);
        });
      } else if (good?.push) {
        // beside the ball, nudging it while it rolls
        const { at, face } = good.push;
        flip.value = face;
        step.value = loop(tween(1, 160), -1, true);
        y.value = tween(at.y, PUSH_MOVE_MS);
        x.value = chain(tween(at.x, PUSH_MOVE_MS), loop(chain(tween(at.x + face * 4, 350), tween(at.x, 350)), -1));
        spin.value = after(PUSH_MOVE_MS, loop(tween(360 * face, rm ? 2400 : 1200, Easing.linear), -1));
      } else if (a.good === "wheel") {
        step.value = loop(tween(1, 90), -1, true);
        spin.value = loop(tween(360, rm ? 1400 : 500, Easing.linear), -1);
        if (a.variant === "tumble")
          later(Math.max(0, a.ms - SURPRISE_MS), () => {
            cancelAnimation(step);
            setSurprised(true);
            hop.value = chain(tween(-12, 180), tween(0, 220));
            x.value = tween(clampToFloor({ x: from.x + 18 * flip.value, y: from.y }).x, 400);
          });
      } else if (a.good === "tunnel") {
        // in at one end, out at the other
        x.value = after(300, tween(clampToFloor({ x: from.x + TUNNEL_SHIFT, y: from.y }).x, Math.max(300, a.ms - 600)));
      } else if (a.good === "blocks") {
        // the top block wobbles and topples, and is stacked again before the end
        const amp = rm ? 4 : 9;
        sway.value = chain(loop(chain(tween(amp, 220), tween(-amp, 220)), 3), tween(0, 120), tween(80, 380, Easing.in(Easing.quad)));
        if (!rm) hop.value = after(BLOCKS_FALL_MS, chain(tween(-8, 150), tween(0, 200)));
        later(Math.max(0, a.ms - 700), () => {
          sway.value = tween(0, 450);
        });
      } else if (a.good === "flower" || a.good === "grass") {
        tilt.value = loop(chain(tween(-8, 300), tween(0, 300)), 4);
      } else if (a.good === "bowl") {
        hop.value = loop(chain(tween(-1.5, 150), tween(0, 150)), -1);
      }
    }

    if (a.kind === "react") {
      if (a.how === "hop")
        if (rm) tilt.value = chain(tween(-8, 200), tween(0, 250));
        else hop.value = chain(tween(-16, 200, Easing.out(Easing.quad)), tween(0, 250, Easing.in(Easing.quad)));
      else tilt.value = loop(chain(tween(3, 400), tween(-3, 400)), 2, true);
    }

    if (a.kind === "celebrate") {
      if (rm) tilt.value = loop(chain(tween(6, 400), tween(-6, 400)), 3, true);
      else hop.value = loop(chain(tween(-14, 160), tween(0, 160)), 3);
    }

    if (a.kind === "eat") {
      // nibbling
      if (rm) tilt.value = loop(chain(tween(-3, 300), tween(0, 300)), -1);
      else hop.value = loop(chain(tween(-2, 150), tween(0, 150)), -1);
    }

    // a walk ends when it arrives; everything else after its time
    if (a.kind !== "walk") later(a.ms, done);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [state, active, send, x, y, hop, tilt, flip, step, spin, sway, blink]);

  return { activity: state?.brain.now ?? null, from: state?.from ?? HOME, send, motion, surprised };
}
