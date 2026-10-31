import { mulberry32, type Rng } from "@/domain/rng";
import { clampToFloor, COURSES, FLOOR, FRONT, type Point } from "./room";

// What the room hamster does next. Pure and seeded: the room screen animates each activity and asks again
// when it ends or when the child touches something. There are no needs to fill (no hunger, no energy).

export const MIN_ACTIVITY_MS = 600;
/** walks shorter than this are skipped, so nothing ends the moment it starts; only a course's spot is walked to from closer */
export const MIN_WALK = 24;
/**
 * A course is gone over from its good's spot and comes back there each time, so a play on it walks to the spot from
 * this close too: begun off the spot, it would jump back to it. A shift under 1 unit does not show.
 */
const COURSE_NEAR = 1;

const IDLE_MS: [number, number] = [1500, 4000];
const PLAY_MS: [number, number] = [4000, 8000];
const NIGHT_SLEEP_MS: [number, number] = [20000, 40000];
const NAP_MS: [number, number] = [8000, 15000];
const HOP_MS = 900;
const PET_MS = 1600;
/** eating a snack the child gave */
export const EAT_MS = 2600;
const CELEBRATE_MS = 2400;
const STORE_FOOD_MS = 1500;
const TURN_MS = 900;
const TUMBLE_CHANCE = 0.2;
const DASH_STEPS: [number, number] = [2, 3];
const DAY_WEIGHTS = { idle: 30, walk: 25, play: 35, dash: 5, nap: 5 };
const NIGHT_WEIGHTS = { sleep: 75, idle: 15, walk: 10 };

export type IdleAct = "blink" | "ear" | "look" | "groom" | "groove";
export type Activity =
  | { kind: "idle"; act: IdleAct; ms: number }
  | { kind: "walk"; to: Point; dash: boolean; carry: boolean }
  | { kind: "play"; good: string; variant: "normal" | "tumble"; ms: number }
  | { kind: "sleep"; inHouse: boolean; ms: number; inBed?: boolean }
  | { kind: "react"; how: "hop" | "pet"; ms: number }
  | { kind: "celebrate"; ms: number }
  | { kind: "eat"; snack: string; ms: number };

export interface World {
  goods: { id: string; spot: Point }[];
  night: boolean;
  reduceMotion: boolean;
  /** what the hamster has on: with headphones it sometimes sways to the music */
  wear?: string | null;
}

export interface Brain {
  /** where the current activity started */
  pos: Point;
  now: Activity;
  plan: Activity[];
  lastGood: string | null;
  /** state of the random numbers for the next step */
  seed: number;
}

export type BrainEvent =
  | { type: "done" }
  | { type: "tap" }
  | { type: "press" }
  | { type: "tapGood"; good: string }
  | { type: "tapFloor"; at: Point }
  | { type: "feed"; snack: string }
  /** the room was rearranged under the hamster: drop the plan and choose again */
  | { type: "rearranged" };

const IDLE_ACTS: IdleAct[] = ["blink", "ear", "look", "groom"];
/** with headphones on, a third of the idle moments are spent swaying to the music */
const idleActs = (w: World): IdleAct[] => (w.wear === "headphones" ? [...IDLE_ACTS, "groove", "groove"] : IDLE_ACTS);
const wheels = new Set(["wheel", "goldwheel"]);

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function pickWeighted<K extends string>(r: Rng, weights: Record<K, number>): K {
  const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => w > 0);
  let roll = r.next() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [k, w] of entries) {
    roll -= w;
    if (roll < 0) return k;
  }
  return entries[entries.length - 1][0];
}

/** A walk to `to`, or nothing when the hamster is already there (closer than `near`). */
const goTo = (from: Point, to: Point, dash = false, carry = false, near = MIN_WALK): Activity[] => (dist(from, to) < near ? [] : [{ kind: "walk", to, dash, carry }]);

/** A random floor point far enough away to be worth walking to. */
function farPoint(r: Rng, from: Point): Point {
  let best = from;
  for (let i = 0; i < 8; i++) {
    const p = { x: r.int(FLOOR.x0, FLOOR.x1), y: r.int(FLOOR.y0, FLOOR.y1) };
    if (dist(from, p) >= MIN_WALK) return p;
    if (dist(from, p) > dist(from, best)) best = p;
  }
  // the floor is far wider than MIN_WALK, so the opposite side always is
  return { x: from.x < (FLOOR.x0 + FLOOR.x1) / 2 ? FLOOR.x1 : FLOOR.x0, y: best.y };
}

const house = (w: World) => w.goods.find((g) => g.id === "house") ?? null;

/** Walk to a good, use it, and for the food bowl carry the seeds home afterwards. */
function playPlan(r: Rng, w: World, from: Point, good: { id: string; spot: Point }, dash = false): Activity[] {
  const tumble = wheels.has(good.id) && !w.reduceMotion && r.next() < TUMBLE_CHANCE;
  const near = COURSES[good.id] ? COURSE_NEAR : MIN_WALK;
  const acts: Activity[] = [...goTo(from, good.spot, dash, false, near), { kind: "play", good: good.id, variant: tumble ? "tumble" : "normal", ms: r.int(...PLAY_MS) }];
  const h = house(w);
  if (good.id === "bowl" && h) acts.push(...goTo(good.spot, h.spot, false, true), { kind: "play", good: "house", variant: "normal", ms: STORE_FOOD_MS });
  return acts;
}

/** The night's sleep goes to the bed when there is one; other sleeps (and nights without a bed) to the house. */
function sleepPlan(w: World, from: Point, ms: number, night = false): Activity[] {
  const bed = night ? w.goods.find((g) => g.id === "bed") : undefined;
  if (bed) return [...goTo(from, bed.spot), { kind: "sleep", inHouse: false, inBed: true, ms }];
  const h = house(w);
  return h ? [...goTo(from, h.spot), { kind: "sleep", inHouse: true, ms }] : [{ kind: "sleep", inHouse: false, ms }];
}

function choose(r: Rng, w: World, here: Point, lastGood: string | null): Activity[] {
  if (w.night) {
    const what = pickWeighted(r, NIGHT_WEIGHTS);
    if (what === "sleep") return sleepPlan(w, here, r.int(...NIGHT_SLEEP_MS), true);
    if (what === "walk") return [{ kind: "walk", to: farPoint(r, here), dash: false, carry: false }];
    return [{ kind: "idle", act: r.pick(idleActs(w)), ms: r.int(...IDLE_MS) }];
  }
  const what = pickWeighted(r, { ...DAY_WEIGHTS, play: w.goods.length ? DAY_WEIGHTS.play : 0, dash: w.reduceMotion ? 0 : DAY_WEIGHTS.dash });
  if (what === "play") {
    const choices = w.goods.length >= 2 ? w.goods.filter((g) => g.id !== lastGood) : w.goods;
    return playPlan(r, w, here, r.pick(choices));
  }
  if (what === "walk") return [{ kind: "walk", to: farPoint(r, here), dash: false, carry: false }];
  if (what === "dash") {
    const acts: Activity[] = [];
    let at = here;
    for (let i = r.int(...DASH_STEPS); i > 0; i--) {
      const to = farPoint(r, at);
      acts.push({ kind: "walk", to, dash: true, carry: false });
      at = to;
    }
    return acts;
  }
  if (what === "nap") return sleepPlan(w, here, r.int(...NAP_MS));
  return [{ kind: "idle", act: r.pick(idleActs(w)), ms: r.int(...IDLE_MS) }];
}

/** Runs one step with the brain's random numbers and hands back the seed for the next one. */
function withRng<T>(seed: number, f: (r: Rng) => T): [T, number] {
  const r = mulberry32(seed);
  const out = f(r);
  return [out, Math.floor(r.next() * 4294967296)];
}

function begin(acts: Activity[], here: Point, lastGood: string | null, seed: number): Brain {
  const [now, ...plan] = acts;
  return { pos: here, now, plan, lastGood: now.kind === "play" ? now.good : lastGood, seed };
}

const playsOnlyOwned = (plan: Activity[], w: World) => plan.every((a) => a.kind !== "play" || w.goods.some((g) => g.id === a.good));

export function createBrain(seed: number, world: World, here: Point, start: { celebrate: boolean; newGood: string | null }): Brain {
  const [acts, next] = withRng(seed, (r) => {
    const out: Activity[] = start.celebrate ? [{ kind: "celebrate", ms: CELEBRATE_MS }] : [];
    const fresh = start.newGood ? world.goods.find((g) => g.id === start.newGood) : undefined;
    if (fresh) out.push(...playPlan(r, world, here, fresh, !world.reduceMotion));
    return out.length ? out : choose(r, world, here, null);
  });
  return begin(acts, here, null, next);
}

export function stepBrain(b: Brain, world: World, ev: BrainEvent, here: Point): Brain {
  if (ev.type === "tapGood" && !world.goods.some((g) => g.id === ev.good)) return b;
  // a position that is not a number would freeze the hamster for good
  if (ev.type === "tapFloor" && !(Number.isFinite(ev.at.x) && Number.isFinite(ev.at.y))) return b;
  const [acts, next] = withRng(b.seed, (r): Activity[] => {
    switch (ev.type) {
      case "tap":
        return [{ kind: "react", how: "hop", ms: HOP_MS }];
      case "press":
        return [{ kind: "react", how: "pet", ms: PET_MS }];
      case "tapGood": {
        const good = world.goods.find((g) => g.id === ev.good);
        return good ? playPlan(r, world, here, good) : [];
      }
      case "tapFloor": {
        const to = clampToFloor(ev.at);
        return dist(here, to) < MIN_WALK ? [{ kind: "idle", act: "look", ms: TURN_MS }] : [{ kind: "walk", to, dash: false, carry: false }];
      }
      case "feed":
        // to the front of the room, where the child can watch it eat
        return [...goTo(here, FRONT), { kind: "eat", snack: ev.snack, ms: EAT_MS }];
      case "rearranged":
        // the plan was made for goods that were put away or moved
        return choose(r, world, here, b.lastGood);
      case "done": {
        const plan = playsOnlyOwned(b.plan, world) ? b.plan : [];
        return plan.length ? plan : choose(r, world, here, b.lastGood);
      }
    }
  });
  if (!acts.length) return b;
  return begin(acts, here, b.lastGood, next);
}

export const isNight = (hour: number) => hour >= 20 || hour < 6;

/** The first good owned now that was not owned at the last visit; nothing when there was no last visit. */
export function newlyOwned(seen: string[] | null, owned: string[]): string | null {
  if (!seen) return null;
  return owned.find((id) => !seen.includes(id)) ?? null;
}
