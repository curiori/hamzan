import type { Mood, Pose } from "@/art/hamster";
import { REWARDS } from "@/game/achievements";
import type { Activity } from "@/game/hamster-brain";
import { GOOD_KIND, type Point, type RoomLayout } from "@/game/room";

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

/** The saved room without the goods the child no longer has (records deleted, a reward's condition lost). */
export function roomGoods(layout: RoomLayout, owned: string[]): RoomLayout {
  const has = new Set(owned);
  return Object.fromEntries(Object.entries(layout).filter(([, id]) => id !== undefined && has.has(id))) as RoomLayout;
}

/** Goods whose bottom edge is above this are drawn behind the hamster. */
export function hamsterDepth(a: Activity, from: Point): number {
  if (a.kind === "walk") return Math.max(from.y, a.to.y);
  if (a.kind === "play" && GOOD_KIND[a.good] === "ceiling") return ABOVE_ALL;
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

export const goodName = (id: string) => REWARDS.find((r) => r.id === id)?.name ?? "グッズ";
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
    case "play": {
      const label = `${goodName(a.good)}で あそんで いる`;
      switch (a.good) {
        case "house":
          return { view: "hidden", mood: "idle", cheeks: false, bubble: "Zzz", label };
        case "tunnel":
          return { view: "hidden", mood: "idle", cheeks: false, bubble: null, label };
        case "wheel":
          return { view: "side", mood: "idle", cheeks: false, bubble: null, label };
        case "desk":
          return front(label, { pose: "read", bubble: "なるほど" });
        case "bowl":
          return front(label, { pose: "cheeks" });
        case "hammock":
          return front(label, { pose: "sleep", bubble: "Zzz" });
        case "swing":
          return front(label, { mood: "happy" });
        case "flower":
          return front(label, { bubble: "くんくん" });
        default:
          return front(label);
      }
    }
  }
}
