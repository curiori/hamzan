import type { Mood, Pose } from "@/art/hamster";
import type { Activity } from "@/game/hamster-brain";
import { GOOD_KIND, pushSpot, seatIn, type Point, type SlotId } from "@/game/room";
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

/** A placed good as the moving room needs it: where to stand to use it, where to sit on it, and where to push it from. */
export interface StageGood {
  id: string;
  spot: Point;
  seat?: Point;
  push?: { at: Point; face: 1 | -1 };
}

/** The goods the hamster plays with; the ball is walked to from the side it is pushed from, so nothing steps back before pushing. */
export function stageGoods(placed: { id: string; slot: SlotId; spot: Point }[]): StageGood[] {
  return placed
    .filter((g) => !PLAYABLE_EXCEPT.includes(g.id))
    .map((g) => {
      const push = pushSpot(g.id, g.slot);
      return { id: g.id, spot: push ? push.at : g.spot, seat: seatIn(g.id, g.slot), push };
    });
}

/** The goods an activity uses: the good played with, or the house slept in. */
const usedGoods = (a: Activity): string[] => (a.kind === "play" ? [a.good] : a.kind === "sleep" && a.inHouse ? ["house"] : []);
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

/** How dark the room's night blue is: none by day, lighter when a lamp is out. */
export const nightTint = (night: boolean, lampPlaced: boolean): number => (night ? (lampPlaced ? 0.12 : 0.3) : 0);

/** Goods whose bottom edge is above this are drawn behind the hamster. */
export function hamsterDepth(a: Activity, from: Point): number {
  if (a.kind === "walk") return Math.max(from.y, a.to.y);
  // hanging goods, the top of the ladder and eating at the front put the hamster in front of everything
  if (a.kind === "play" && (GOOD_KIND[a.good] === "ceiling" || a.good === "ladder")) return ABOVE_ALL;
  if (a.kind === "eat") return ABOVE_ALL;
  return from.y;
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

const IDLE_LABEL = { blink: "ひとやすみ ちゅう", ear: "ひとやすみ ちゅう", look: "きょろきょろ して いる", groom: "けづくろい ちゅう" } as const;

export function look(a: Activity): Look {
  switch (a.kind) {
    case "walk":
      return { view: "side", mood: "idle", cheeks: a.carry, bubble: null, label: a.carry ? "たねを はこんで いる" : a.dash ? "はしって いる" : "さんぽ ちゅう" };
    case "idle":
      return front(IDLE_LABEL[a.act]);
    case "sleep":
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
        case "ball":
          return { view: "side", mood: "idle", cheeks: false, bubble: "ころころ", label };
        case "desk":
          return front(label, { pose: "read", bubble: "なるほど" });
        case "bowl":
          return front(label, { pose: "cheeks" });
        case "hammock":
          return front(label, { pose: "sleep", bubble: "Zzz" });
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
