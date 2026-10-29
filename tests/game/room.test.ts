import { describe, expect, test } from "bun:test";
import { REWARDS } from "@/game/achievements";
import {
  autoLayout,
  clampToFloor,
  DEFAULT_SLOT,
  FLOOR,
  fits,
  HAMSTER_H,
  HAMSTER_W,
  placedGoods,
  ROOM_H,
  ROOM_W,
  SLOTS,
  toRoom,
  toScreen,
  type SlotKind,
} from "@/game/room";

const ART_BOX = 60;

describe("autoLayout", () => {
  test("every reward good gets its default slot and wearables get none", () => {
    const layout = autoLayout(REWARDS.map((r) => r.id));
    const slotOf = Object.fromEntries(Object.entries(layout).map(([slot, id]) => [id, slot]));
    expect(slotOf).toEqual(DEFAULT_SLOT);
    expect(Object.values(layout)).not.toContain("hachimaki");
    expect(Object.values(layout)).not.toContain("crown");
  });

  test("goods with a free default slot keep it even when listed after others", () => {
    const kinds: Record<string, SlotKind> = { extra: "floorLarge", desk: "floorLarge" };
    const layout = autoLayout(["extra", "desk"], kinds);
    expect(layout.floorL1).toBe("desk");
    expect(Object.values(layout)).toContain("extra");
  });

  test("when a kind is full the next good is stored", () => {
    const kinds: Record<string, SlotKind> = { a: "floorLarge", b: "floorLarge", c: "floorLarge", d: "floorLarge" };
    const layout = autoLayout(["a", "b", "c", "d"], kinds);
    expect(Object.values(layout).sort()).toEqual(["a", "b", "c"]);
  });

  test("goods without a kind are not placed", () => {
    expect(autoLayout(["unknown"])).toEqual({});
  });
});

describe("fits", () => {
  test("a good only fits slots of its kind", () => {
    expect(fits("wheel", "floorL3")).toBe(true);
    expect(fits("wheel", "sill")).toBe(false);
    expect(fits("crown", "floorL1")).toBe(false);
  });
});

describe("slots", () => {
  test("the room has 3 large and 3 small floor slots, 2 wall, 2 ceiling and 1 sill", () => {
    const count = (k: SlotKind) => Object.values(SLOTS).filter((s) => s.kind === k).length;
    expect([count("floorLarge"), count("floorSmall"), count("wall"), count("ceiling"), count("sill")]).toEqual([3, 3, 2, 2, 1]);
  });

  test("slots stay inside the room and every spot is on the floor", () => {
    for (const s of Object.values(SLOTS)) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + ART_BOX * s.scale).toBeLessThanOrEqual(ROOM_W);
      expect(s.y + ART_BOX * s.scale).toBeLessThanOrEqual(ROOM_H);
      expect(clampToFloor(s.spot)).toEqual(s.spot);
    }
  });

  test("placedGoods lists the placed goods back to front with their spots", () => {
    const goods = placedGoods(autoLayout(REWARDS.map((r) => r.id)));
    expect(goods).toHaveLength(8);
    expect(goods.map((g) => g.depth)).toEqual([...goods.map((g) => g.depth)].sort((a, b) => a - b));
    const wheel = goods.find((g) => g.id === "wheel");
    expect(wheel?.slot).toBe("floorL2");
    expect(wheel?.spot).toEqual(SLOTS.floorL2.spot);
  });
});

describe("coordinates", () => {
  test("screen and room coordinates convert both ways at 320 and 430 points", () => {
    for (const width of [320, 430]) {
      const corner = toScreen({ x: ROOM_W, y: ROOM_H }, width);
      expect(corner.x).toBeCloseTo(width);
      expect(corner.y).toBeCloseTo((width * ROOM_H) / ROOM_W);
      const p = { x: 123, y: 210 };
      const back = toRoom(toScreen(p, width), width);
      expect(back.x).toBeCloseTo(p.x);
      expect(back.y).toBeCloseTo(p.y);
    }
  });

  test("clampToFloor keeps any point on the floor", () => {
    expect(clampToFloor({ x: -50, y: 999 })).toEqual({ x: FLOOR.x0, y: FLOOR.y1 });
    expect(clampToFloor({ x: 999, y: -5 })).toEqual({ x: FLOOR.x1, y: FLOOR.y0 });
    const inside = { x: (FLOOR.x0 + FLOOR.x1) / 2, y: (FLOOR.y0 + FLOOR.y1) / 2 };
    expect(clampToFloor(inside)).toEqual(inside);
  });

  test("the hamster drawn with its feet anywhere on the floor stays inside the room", () => {
    expect(FLOOR.x0 - HAMSTER_W / 2).toBeGreaterThanOrEqual(0);
    expect(FLOOR.x1 + HAMSTER_W / 2).toBeLessThanOrEqual(ROOM_W);
    expect(FLOOR.y0 - HAMSTER_H).toBeGreaterThanOrEqual(0);
    expect(FLOOR.y1).toBeLessThanOrEqual(ROOM_H);
  });
});
