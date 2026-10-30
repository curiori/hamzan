// The hamster room in design coordinates (400×260, scaled to the screen width): where goods can stand
// (slots), where the hamster can walk (FLOOR), and the automatic placement of owned goods.

export const ROOM_W = 400;
export const ROOM_H = 260;
/** The hamster sprite in the room, in design units; its feet are its position. */
export const HAMSTER_W = 66;
export const HAMSTER_H = 57;
/** Where the hamster's feet may be. */
export const FLOOR = { x0: 36, x1: 364, y0: 188, y1: 252 } as const;

export type Point = { x: number; y: number };
export type SlotKind = "floorLarge" | "floorSmall" | "wall" | "ceiling" | "sill";
export type SlotId = "floorL1" | "floorL2" | "floorL3" | "floorS1" | "floorS2" | "floorS3" | "wall1" | "wall2" | "ceil1" | "ceil2" | "sill";

interface Slot {
  kind: SlotKind;
  /** top-left of the good's 60×60 drawing, and its scale */
  x: number;
  y: number;
  scale: number;
  /** where the hamster stands to use the good */
  spot: Point;
  /** drawing order: the bottom edge of the good, farther back first */
  depth: number;
}

const ART_BOX = 60;
const slot = (kind: SlotKind, x: number, y: number, scale: number, spot: Point): Slot => ({ kind, x, y, scale, spot, depth: y + ART_BOX * scale });

// Close to the web prototype's layout, with the floor extended downward.
export const SLOTS: Record<SlotId, Slot> = {
  floorL1: slot("floorLarge", 10, 120, 1.35, { x: 52, y: 214 }),
  floorL2: slot("floorLarge", 92, 108, 1.5, { x: 137, y: 214 }),
  floorL3: slot("floorLarge", 300, 110, 1.5, { x: 345, y: 214 }),
  floorS1: slot("floorSmall", 12, 196, 0.95, { x: 44, y: 248 }),
  floorS2: slot("floorSmall", 172, 212, 0.8, { x: 200, y: 236 }),
  floorS3: slot("floorSmall", 276, 210, 0.8, { x: 262, y: 248 }),
  wall1: slot("wall", 20, 50, 0.85, { x: 46, y: 192 }),
  wall2: slot("wall", 82, 40, 0.85, { x: 108, y: 192 }),
  ceil1: slot("ceiling", 248, 0, 1.15, { x: 282, y: 194 }),
  ceil2: slot("ceiling", 330, 6, 1.1, { x: 362, y: 194 }),
  sill: slot("sill", 170, 43, 0.75, { x: 196, y: 190 }),
};

const SLOT_IDS = Object.keys(SLOTS) as SlotId[];

/** The slot kind each room good needs, rewards and shop goods (wearables are not room goods). */
export const GOOD_KIND: Record<string, SlotKind> = {
  desk: "floorLarge",
  wheel: "floorLarge",
  house: "floorLarge",
  tunnel: "floorSmall",
  bowl: "floorSmall",
  flower: "sill",
  swing: "ceiling",
  hammock: "ceiling",
  ball: "floorSmall",
  blocks: "floorSmall",
  cushion: "floorSmall",
  ladder: "floorSmall",
  grass: "sill",
  lamp: "wall",
  bookshelf: "floorLarge",
  slide: "floorLarge",
  bridge: "ceiling",
  bed: "floorSmall",
  piano: "floorLarge",
  goldwheel: "floorLarge",
};

export const DEFAULT_SLOT: Record<string, SlotId> = {
  desk: "floorL1",
  wheel: "floorL2",
  house: "floorL3",
  tunnel: "floorS1",
  bowl: "floorS3",
  flower: "sill",
  swing: "ceil1",
  hammock: "ceil2",
  ball: "floorS2",
  blocks: "floorS2",
  cushion: "floorS2",
  ladder: "floorS2",
  grass: "sill",
  lamp: "wall1",
  bookshelf: "floorL1",
  slide: "floorL3",
  bridge: "ceil1",
  bed: "floorS2",
  piano: "floorL2",
  goldwheel: "floorL2",
};

/** Where the hamster sits to eat a snack it was given: in front, near the middle of the floor. */
export const FRONT: Point = { x: 200, y: 248 };

/** What a screen reader calls each slot while rearranging. */
export const SLOT_NAME: Record<SlotId, string> = {
  floorL1: "ゆか おおきい 1",
  floorL2: "ゆか おおきい 2",
  floorL3: "ゆか おおきい 3",
  floorS1: "ゆか ちいさい 1",
  floorS2: "ゆか ちいさい 2",
  floorS3: "ゆか ちいさい 3",
  wall1: "かべ 1",
  wall2: "かべ 2",
  ceil1: "てんじょう 1",
  ceil2: "てんじょう 2",
  sill: "まどべ",
};

/** good id in each used slot */
export type RoomLayout = Partial<Record<SlotId, string>>;

/**
 * Where the hamster sits on a good, in the good's 60×60 box, how long getting there takes, and whether the good
 * rocks it. The hanging goods hang low enough to keep a seated hamster inside the room; the ladder is climbed to
 * its top rung; the cushion is sat in and the bed lain in.
 */
export const SEATS: Record<string, { at: Point; moveMs: number; sway?: boolean }> = {
  swing: { at: { x: 30, y: 49 }, moveMs: 300, sway: true },
  hammock: { at: { x: 30, y: 49 }, moveMs: 300, sway: true },
  ladder: { at: { x: 30, y: 6 }, moveMs: 900 },
  cushion: { at: { x: 30, y: 47 }, moveMs: 300 },
  bed: { at: { x: 30, y: 46 }, moveMs: 300 },
};

/** The hamster's feet when it sits on `goodId` in `slotId`, in room units; undefined for goods without a seat. */
export function seatIn(goodId: string, slotId: SlotId): Point | undefined {
  const seat = SEATS[goodId]?.at;
  const sl = SLOTS[slotId];
  return seat ? { x: sl.x + seat.x * sl.scale, y: sl.y + seat.y * sl.scale } : undefined;
}

/** How long the hamster takes to get onto a good's seat; 0 for goods without one. */
export const seatMoveMs = (goodId: string): number => SEATS[goodId]?.moveMs ?? 0;

/** Whether sitting on the good rocks the hamster (the hanging ones). */
export const seatSways = (goodId: string): boolean => !!SEATS[goodId]?.sway;

/** the ball in its 60×60 box, and how far the side-view hamster's nose is ahead of its feet */
const BALL = { x: 30, r: 16, floor: 57 };
const NOSE = 22;

/**
 * Where the hamster stands to push the ball and which way it faces (1 right, -1 left): beside the ball with its nose
 * at the ball, on the side with floor to stand on. Undefined for other goods.
 */
export function pushSpot(goodId: string, slotId: SlotId): { at: Point; face: 1 | -1 } | undefined {
  if (goodId !== "ball") return undefined;
  const sl = SLOTS[slotId];
  const cx = sl.x + BALL.x * sl.scale;
  const reach = BALL.r * sl.scale + NOSE;
  const y = Math.min(FLOOR.y1, Math.max(FLOOR.y0, sl.y + BALL.floor * sl.scale));
  const face: 1 | -1 = cx - reach >= FLOOR.x0 ? 1 : -1;
  return { at: { x: Math.min(FLOOR.x1, Math.max(FLOOR.x0, cx - face * reach)), y }, face };
}

/** One leg of a good's course: where the hamster's feet go and how long it takes; `notes` keys sound on the way, `ease` "in" speeds up (sliding). */
export interface CourseStep {
  to: Point;
  ms: number;
  notes?: number;
  ease?: "in";
}

/**
 * The way the hamster goes over a good, in the good's 60×60 box, starting from the spot where it stands to use it:
 * up the slide's ladder and down the slide, across the rope bridge and back, over the piano's keys.
 */
export const COURSES: Record<string, CourseStep[]> = {
  slide: [
    { to: { x: 16, y: 58 }, ms: 500 },
    { to: { x: 18, y: 10 }, ms: 900 },
    { to: { x: 44, y: 56 }, ms: 450, ease: "in" },
  ],
  bridge: [
    { to: { x: 6, y: 50 }, ms: 500 },
    { to: { x: 54, y: 50 }, ms: 1800 },
    { to: { x: 6, y: 50 }, ms: 1800 },
  ],
  piano: [
    { to: { x: 8, y: 50 }, ms: 400 },
    { to: { x: 52, y: 50 }, ms: 2000, notes: 5 },
  ],
};
/** the last leg, back to the spot */
const COURSE_BACK_MS = 500;

/** A good's course in room units for its slot, kept where the hamster fits and ending back at the spot; undefined for goods without one. */
export function courseIn(goodId: string, slotId: SlotId): { steps: CourseStep[]; ms: number } | undefined {
  const course = COURSES[goodId];
  if (!course) return undefined;
  const sl = SLOTS[slotId];
  const steps: CourseStep[] = [
    ...course.map((s) => ({
      ...s,
      to: { x: clamp(sl.x + s.to.x * sl.scale, FLOOR.x0, FLOOR.x1), y: clamp(sl.y + s.to.y * sl.scale, HAMSTER_H - 1, FLOOR.y1) },
    })),
    { to: { ...sl.spot }, ms: COURSE_BACK_MS },
  ];
  return { steps, ms: steps.reduce((sum, s) => sum + s.ms, 0) };
}

export const fits = (goodId: string, slotId: SlotId) => GOOD_KIND[goodId] === SLOTS[slotId].kind;

/** Goods go to their default slot when it is free, then to any free slot of their kind; the rest are stored. */
export function autoLayout(owned: string[], kinds: Record<string, SlotKind> = GOOD_KIND): RoomLayout {
  const layout: RoomLayout = {};
  const rest: string[] = [];
  for (const id of owned) {
    if (!kinds[id]) continue;
    const d = DEFAULT_SLOT[id];
    if (d && SLOTS[d].kind === kinds[id] && !layout[d]) layout[d] = id;
    else rest.push(id);
  }
  for (const id of rest) {
    const free = SLOT_IDS.find((s) => SLOTS[s].kind === kinds[id] && !layout[s]);
    if (free) layout[free] = id;
  }
  return layout;
}

/** The placed goods, farthest back first. */
export function placedGoods(layout: RoomLayout): { id: string; slot: SlotId; spot: Point; depth: number }[] {
  return SLOT_IDS.flatMap((s) => {
    const id = layout[s];
    return id ? [{ id, slot: s, spot: SLOTS[s].spot, depth: SLOTS[s].depth }] : [];
  }).sort((a, b) => a.depth - b.depth);
}

/** A newly owned good goes to its default slot when free, else to a free slot of its kind; with no room it stays stored. */
export function placeNew(layout: RoomLayout, goodId: string, kinds: Record<string, SlotKind> = GOOD_KIND): RoomLayout {
  const kind = kinds[goodId];
  if (!kind || Object.values(layout).includes(goodId)) return layout;
  const d = DEFAULT_SLOT[goodId];
  const slot = d && SLOTS[d].kind === kind && !layout[d] ? d : SLOT_IDS.find((s) => SLOTS[s].kind === kind && !layout[s]);
  return slot ? { ...layout, [slot]: goodId } : layout;
}

/** Rearranging: put a good in a slot, taking it from any other slot; null stores what is there. A good that does not fit changes nothing. */
export function placeIn(layout: RoomLayout, slotId: SlotId, goodId: string | null, kinds: Record<string, SlotKind> = GOOD_KIND): RoomLayout {
  if (goodId !== null && kinds[goodId] !== SLOTS[slotId].kind) return layout;
  const next: RoomLayout = {};
  for (const s of SLOT_IDS) {
    const id = layout[s];
    if (id && id !== goodId && s !== slotId) next[s] = id;
  }
  if (goodId !== null) next[slotId] = goodId;
  return next;
}

/** Owned goods that are in no slot (しまってある); wearables are not goods. */
export function storedGoods(layout: RoomLayout, owned: string[], kinds: Record<string, SlotKind> = GOOD_KIND): string[] {
  const placed = new Set(Object.values(layout));
  return owned.filter((id) => kinds[id] && !placed.has(id));
}

/** Rearranging one slot: the owned goods of its kind, stored (from null) or out in another slot, but not the one already there. */
export function slotChoices(slotId: SlotId, layout: RoomLayout, owned: string[], kinds: Record<string, SlotKind> = GOOD_KIND): { id: string; from: SlotId | null }[] {
  const where = new Map<string, SlotId>();
  for (const s of SLOT_IDS) {
    const id = layout[s];
    if (id) where.set(id, s);
  }
  return owned.filter((id) => kinds[id] === SLOTS[slotId].kind && layout[slotId] !== id).map((id) => ({ id, from: where.get(id) ?? null }));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export const clampToFloor = (p: Point): Point => ({ x: clamp(p.x, FLOOR.x0, FLOOR.x1), y: clamp(p.y, FLOOR.y0, FLOOR.y1) });

export function toScreen(p: Point, width: number): Point {
  const s = width / ROOM_W;
  return { x: p.x * s, y: p.y * s };
}

export function toRoom(p: Point, width: number): Point {
  const s = ROOM_W / width;
  return { x: p.x * s, y: p.y * s };
}
