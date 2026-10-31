import type { Mood, Pose } from "@/art/hamster";
import type { Activity } from "@/game/hamster-brain";
import { COURSES, courseIn, GOOD_KIND, pushSpot, seatIn, seatMoveMs, type CourseStep, type Point, type SlotId } from "@/game/room";
import { itemName } from "@/game/shop";

// How the room screen shows each activity: walk speeds, drawing depth, which hamster drawing, and the
// words a screen reader hears. Pure, so bun can test it.

/** design units per second */
export const WALK_SPEED = 40;
export const DASH_SPEED = 130;
export const CALM_WALK_SPEED = 28;
/** depth that puts the hamster over every good (sitting on the swing or in the hammock) */
export const ABOVE_ALL = 1000;

export function walkMs(from: Point, to: Point, dash: boolean, reduceMotion: boolean): number {
  const speed = reduceMotion ? CALM_WALK_SPEED : dash ? DASH_SPEED : WALK_SPEED;
  return Math.round((Math.hypot(to.x - from.x, to.y - from.y) / speed) * 1000);
}

/**
 * The axis whose animation reports the end of a walk: the one that moves most. Reanimated calls back at once
 * when a value is already at its target, so an axis that does not move would end the walk before it starts.
 * Null when the walk does not move at all.
 */
export function walkAxis(from: Point, to: Point): "x" | "y" | null {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx === 0 && dy === 0) return null;
  return dx >= dy ? "x" : "y";
}

/** Goods that are only looked at: the hamster never goes to play with them. */
export const PLAYABLE_EXCEPT = ["lamp"];

/** A placed good as the moving room needs it: where to stand to use it, where to sit on it, where to push it from, and the way over it. */
export interface StageGood {
  id: string;
  spot: Point;
  seat?: Point;
  push?: { at: Point; face: 1 | -1 };
  course?: { steps: CourseStep[]; ms: number };
}

/** The goods the hamster plays with; the ball is walked to from the side it is pushed from, so nothing steps back before pushing. */
export function stageGoods(placed: { id: string; slot: SlotId; spot: Point }[]): StageGood[] {
  return placed
    .filter((g) => !PLAYABLE_EXCEPT.includes(g.id))
    .map((g) => {
      const push = pushSpot(g.id, g.slot);
      return { id: g.id, spot: push ? push.at : g.spot, seat: seatIn(g.id, g.slot), push, course: courseIn(g.id, g.slot) };
    });
}

/**
 * Whether the hamster is up on its good (a seat, a course or the bed it sleeps in) rather than on the floor: where it
 * stands then is the spot it went up from.
 */
export const perchedOn = (a: Activity): boolean =>
  (a.kind === "play" && (seatMoveMs(a.good) > 0 || !!COURSES[a.good])) || (a.kind === "sleep" && !!a.inBed);

/**
 * When a course's keys sound, in ms from the start of one time over it: evenly over each leg with notes, each in the
 * middle of its share of the leg, the keys rising from 0.
 */
export function courseNotes(course: { steps: CourseStep[] }): { at: number; key: number }[] {
  const notes: { at: number; key: number }[] = [];
  let start = 0;
  for (const st of course.steps) {
    const n = st.notes ?? 0;
    for (let i = 0; i < n; i++) notes.push({ at: Math.round(start + ((i + 0.5) * st.ms) / n), key: notes.length });
    start += st.ms;
  }
  return notes;
}

/**
 * How many times the hamster goes over a course in a play of about `ms`, and when the play ends: with the last time
 * over it, so the hamster never walks on the spot after arriving back.
 */
export function courseLaps(lapMs: number, ms: number): { laps: number; ends: number } {
  const laps = Math.max(1, Math.round(ms / lapMs));
  return { laps, ends: laps * lapMs };
}

/** A course as the hamster goes over it with reduce motion: no leg faster than a calm walk (and its notes slower with it). */
export function calmCourse(course: { steps: CourseStep[]; ms: number }, from: Point): { steps: CourseStep[]; ms: number } {
  let was = from;
  const steps = course.steps.map((st) => {
    const ms = Math.max(st.ms, walkMs(was, st.to, false, true));
    was = st.to;
    return { ...st, ms };
  });
  return { steps, ms: steps.reduce((sum, st) => sum + st.ms, 0) };
}

/** Whether the hamster is swaying to music it no longer has: the headphones came off. */
export const groovesWithout = (a: Activity, wear: string | null | undefined): boolean => a.kind === "idle" && a.act === "groove" && wear !== "headphones";

/** The goods an activity uses: the good played with, or the house or the bed slept in. */
const usedGoods = (a: Activity): string[] => {
  if (a.kind === "play") return [a.good];
  if (a.kind === "sleep") return a.inHouse ? ["house"] : a.inBed ? ["bed"] : [];
  return [];
};
const samePoint = (a?: Point, b?: Point) => a?.x === b?.x && a?.y === b?.y;

/**
 * Whether rearranging the room put away or moved a good the hamster is using or heading for (now or later in its
 * plan). It must then stop and choose again, or it goes on using a good that is no longer there.
 */
export function rearrangedUnder(b: { now: Activity; plan: Activity[] }, before: StageGood[], after: StageGood[]): boolean {
  if (before === after) return false;
  return [b.now, ...b.plan].flatMap(usedGoods).some((id) => {
    const was = before.find((g) => g.id === id);
    const is = after.find((g) => g.id === id);
    return !was || !is || !samePoint(was.spot, is.spot) || !samePoint(was.seat, is.seat);
  });
}

/** the color laid over the room at night at nightTint's strength: a clear blue, so the warm wall does not turn gray */
export const NIGHT_BLUE = "#1C3AB0";

/** How dark the room's night blue is: none by day, lighter when a lamp is out. */
export const nightTint = (night: boolean, lampPlaced: boolean): number => (night ? (lampPlaced ? 0.12 : 0.3) : 0);

/** The goods to save as seen after a visit: none under the test switch's every good, which leaves the records alone. */
export const roomSeenToSave = (allGoods: boolean, shown: string[]): string[] | null => (allGoods ? null : shown);

/** Goods whose bottom edge is above this are drawn behind the hamster. */
export function hamsterDepth(a: Activity, from: Point): number {
  if (a.kind === "walk") return Math.max(from.y, a.to.y);
  // hanging goods, the top of the ladder and eating at the front put the hamster in front of everything
  if (a.kind === "play" && (GOOD_KIND[a.good] === "ceiling" || a.good === "ladder")) return ABOVE_ALL;
  if (a.kind === "eat") return ABOVE_ALL;
  return from.y;
}

/**
 * The good drawn over the hamster sitting or lying in it (the cushion, the bed): it lets a press through, so the
 * hamster under it answers a tap. Null when the hamster is not in a good or is drawn over it.
 */
export function coveringGood(a: Activity, from: Point, placed: { id: string; depth: number }[]): string | null {
  if (!perchedOn(a)) return null;
  const id = a.kind === "play" ? a.good : "bed";
  const good = placed.find((g) => g.id === id);
  return good && good.depth > hamsterDepth(a, from) ? id : null;
}

export interface Look {
  view: "front" | "side" | "hidden";
  mood: Mood;
  pose?: Pose;
  cheeks: boolean;
  bubble: string | null;
  label: string;
}

const front = (label: string, extra: Partial<Look> = {}): Look => ({ view: "front", mood: "idle", cheeks: false, bubble: null, label, ...extra });

const IDLE_LABEL = { blink: "ひとやすみ ちゅう", ear: "ひとやすみ ちゅう", look: "きょろきょろ して いる", groom: "けづくろい ちゅう", groove: "おんがくを きいて いる" } as const;

export function look(a: Activity): Look {
  switch (a.kind) {
    case "walk":
      return { view: "side", mood: "idle", cheeks: a.carry, bubble: null, label: a.carry ? "たねを はこんで いる" : a.dash ? "はしって いる" : "さんぽ ちゅう" };
    case "idle":
      return a.act === "groove" ? front(IDLE_LABEL.groove, { mood: "happy", bubble: "♪" }) : front(IDLE_LABEL[a.act]);
    case "sleep":
      if (a.inBed) return front("ベッドで ねて いる", { pose: "sleep", bubble: "Zzz" });
      return a.inHouse
        ? { view: "hidden", mood: "idle", cheeks: false, bubble: "Zzz", label: "おうちで ねて いる" }
        : front("ねて いる", { pose: "sleep", bubble: "Zzz" });
    case "react":
      return a.how === "hop" ? front("よろこんで いる", { mood: "happy", bubble: "きゅっ" }) : front("なでられて いる", { pose: "pet" });
    case "celebrate":
      return front("おいわい ちゅう", { mood: "cheer" });
    case "eat":
      return front(`${itemName(a.snack)}を たべて いる`, { pose: "cheeks", cheeks: true, bubble: "もぐもぐ" });
    case "play": {
      const label = `${itemName(a.good)}で あそんで いる`;
      switch (a.good) {
        case "house":
          return { view: "hidden", mood: "idle", cheeks: false, bubble: "Zzz", label };
        case "tunnel":
          return { view: "hidden", mood: "idle", cheeks: false, bubble: null, label };
        case "wheel":
          return { view: "side", mood: "idle", cheeks: false, bubble: null, label };
        case "goldwheel":
          return { view: "side", mood: "idle", cheeks: false, bubble: "きらきら", label };
        case "slide":
          return { view: "side", mood: "idle", cheeks: false, bubble: "わーい", label };
        case "bridge":
          return { view: "side", mood: "idle", cheeks: false, bubble: "どきどき", label };
        case "piano":
          return { view: "side", mood: "idle", cheeks: false, bubble: "♪", label };
        case "ball":
          return { view: "side", mood: "idle", cheeks: false, bubble: "ころころ", label };
        case "desk":
          return front(label, { pose: "read", bubble: "なるほど" });
        case "bookshelf":
          return front(label, { pose: "read", bubble: "ふむふむ" });
        case "bowl":
          return front(label, { pose: "cheeks" });
        case "hammock":
          return front(label, { pose: "sleep", bubble: "Zzz" });
        case "bed":
          return front(label, { pose: "sleep", bubble: "ごろん" });
        case "swing":
        case "ladder":
          return front(label, { mood: "happy" });
        case "flower":
        case "grass":
          return front(label, { bubble: "くんくん" });
        case "blocks":
          return front(label, { bubble: "がらがら" });
        case "cushion":
          return front(label, { mood: "happy", bubble: "ふかふか" });
        default:
          return front(label);
      }
    }
  }
}

/** The hamster thrown out of a wheel: a surprised face from the front, without the good's bubble (the golden wheel's sparkle). */
export const surprisedLook = (lk: Look): Look => ({ ...lk, view: "front", mood: "oops", pose: undefined, bubble: null });
