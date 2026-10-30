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

/** The slot kind each room good needs (wearables are not room goods). */
export const GOOD_KIND: Record<string, SlotKind> = {
  desk: "floorLarge",
  wheel: "floorLarge",
  house: "floorLarge",
  tunnel: "floorSmall",
  bowl: "floorSmall",
  flower: "sill",
  swing: "ceiling",
  hammock: "ceiling",
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
};

/** good id in each used slot */
export type RoomLayout = Partial<Record<SlotId, string>>;

/** Where the hamster sits on a hanging good, in the good's 60×60 box; the art hangs low enough to keep it inside the room. */
export const SEATS: Record<string, Point> = { swing: { x: 30, y: 49 }, hammock: { x: 30, y: 49 } };

/** The hamster's feet when it sits on `goodId` hung in `slotId`, in room units; undefined for goods without a seat. */
export function seatIn(goodId: string, slotId: SlotId): Point | undefined {
  const seat = SEATS[goodId];
  const sl = SLOTS[slotId];
  return seat ? { x: sl.x + seat.x * sl.scale, y: sl.y + seat.y * sl.scale } : undefined;
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
