import { describe, expect, test } from "bun:test";
import { REWARDS } from "@/game/achievements";
import { createBrain, isNight, MIN_ACTIVITY_MS, MIN_WALK, newlyOwned, stepBrain, type Activity, type Brain, type World } from "@/game/hamster-brain";
import { autoLayout, FLOOR, placedGoods, type Point } from "@/game/room";

const allGoods = placedGoods(autoLayout(REWARDS.map((r) => r.id))).map(({ id, spot }) => ({ id, spot }));
const only = (...ids: string[]) => allGoods.filter((g) => ids.includes(g.id));
const world = (patch: Partial<World> = {}): World => ({ goods: allGoods, night: false, reduceMotion: false, ...patch });
const calm = { celebrate: false, newGood: null };
const HOME: Point = { x: 200, y: 220 };

/** Where the hamster stands once `a` is over, having started it at `from`. */
const endOf = (a: Activity, from: Point) => (a.kind === "walk" ? a.to : from);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const onFloor = (p: Point) => p.x >= FLOOR.x0 && p.x <= FLOOR.x1 && p.y >= FLOOR.y0 && p.y <= FLOOR.y1;

/** Lets every activity finish `n` times, as the room screen does, and returns each activity with where it began. */
function run(seed: number, w: World, n: number, start = calm) {
  let here = HOME;
  let b = createBrain(seed, w, here, start);
  const seen: { a: Activity; from: Point }[] = [{ a: b.now, from: here }];
  for (let i = 0; i < n; i++) {
    here = endOf(b.now, here);
    b = stepBrain(b, w, { type: "done" }, here);
    seen.push({ a: b.now, from: here });
  }
  return seen;
}

/** Steps until the current activity matches, returning the brain and where the hamster is when it starts. */
function until(seed: number, w: World, match: (a: Activity) => boolean): { b: Brain; here: Point } {
  let here = HOME;
  let b = createBrain(seed, w, here, calm);
  for (let i = 0; i < 2000 && !match(b.now); i++) {
    here = endOf(b.now, here);
    b = stepBrain(b, w, { type: "done" }, here);
  }
  if (!match(b.now)) throw new Error("activity never came");
  return { b, here };
}

const plays = (seen: { a: Activity }[]) => seen.flatMap(({ a }) => (a.kind === "play" ? [a.good] : []));

describe("choosing what to do", () => {
  test("the same seed gives the same activities", () => {
    expect(run(7, world(), 300)).toEqual(run(7, world(), 300));
    expect(run(8, world(), 300)).not.toEqual(run(7, world(), 300));
  });

  test("walks never leave the floor, even for taps outside it", () => {
    for (const { a } of run(3, world(), 1500)) if (a.kind === "walk") expect(onFloor(a.to)).toBe(true);
    const b = stepBrain(createBrain(3, world(), HOME, calm), world(), { type: "tapFloor", at: { x: -100, y: 999 } }, HOME);
    expect(b.now.kind).toBe("walk");
    if (b.now.kind === "walk") expect(onFloor(b.now.to)).toBe(true);
  });

  test("plays only with goods in the world and ignores taps on goods it does not have", () => {
    const w = world({ goods: only("wheel", "bowl") });
    const goods = new Set(plays(run(5, w, 1500)));
    expect([...goods].every((g) => g === "wheel" || g === "bowl")).toBe(true);
    expect(goods.size).toBe(2);
    const b = createBrain(5, w, HOME, calm);
    const after = stepBrain(b, w, { type: "tapGood", good: "swing" }, HOME);
    expect(after.now).toEqual(b.now);
    expect(after.plan).toEqual(b.plan);
  });

  test("does not pick the same good twice in a row when it has two or more", () => {
    const p = plays(run(11, world(), 3000));
    expect(p.length).toBeGreaterThan(50);
    for (let i = 1; i < p.length; i++) expect(p[i]).not.toBe(p[i - 1]);
  });

  test("at night it mostly sleeps in its house and a tap wakes it", () => {
    const w = world({ night: true });
    const seen = run(13, w, 500).map(({ a }) => a).filter((a) => a.kind !== "walk");
    const sleeps = seen.filter((a) => a.kind === "sleep");
    expect(sleeps.length / seen.length).toBeGreaterThanOrEqual(0.7);
    expect(sleeps.every((a) => a.kind === "sleep" && a.inHouse)).toBe(true);
    const { b, here } = until(13, w, (a) => a.kind === "sleep");
    const woke = stepBrain(b, w, { type: "tap" }, here);
    expect(woke.now).toMatchObject({ kind: "react", how: "hop" });
  });

  test("reduce motion never dashes or tumbles", () => {
    for (const { a } of run(17, world({ reduceMotion: true }), 3000)) {
      if (a.kind === "walk") expect(a.dash).toBe(false);
      if (a.kind === "play") expect(a.variant).toBe("normal");
    }
  });

  test("a goal day starts with a celebration and a new good gets a rush", () => {
    const w = world();
    const b = createBrain(19, w, HOME, { celebrate: true, newGood: "wheel" });
    expect(b.now.kind).toBe("celebrate");
    const wheelSpot = allGoods.find((g) => g.id === "wheel")?.spot;
    expect(b.plan[0]).toMatchObject({ kind: "walk", to: wheelSpot, dash: true });
    expect(b.plan[1]).toMatchObject({ kind: "play", good: "wheel" });
  });

  test("a tap mid-walk reacts from where the hamster is", () => {
    const w = world();
    const { b, here } = until(23, w, (a) => a.kind === "walk");
    const halfway = b.now.kind === "walk" ? { x: (here.x + b.now.to.x) / 2, y: (here.y + b.now.to.y) / 2 } : here;
    const tapped = stepBrain(b, w, { type: "tap" }, halfway);
    expect(tapped.now).toMatchObject({ kind: "react", how: "hop" });
    expect(tapped.pos).toEqual(halfway);
    expect(tapped.plan).toEqual([]);
  });

  test("never stalls: timed activities last at least MIN_ACTIVITY_MS and walks cover at least MIN_WALK", () => {
    const worlds = [world({ goods: [] }), world({ night: true, goods: only("wheel", "bowl") }), world({ goods: only("desk") })];
    for (const w of worlds)
      for (const { a, from } of run(29, w, 500)) {
        if (a.kind === "walk") expect(dist(from, a.to)).toBeGreaterThanOrEqual(MIN_WALK);
        else expect(a.ms).toBeGreaterThanOrEqual(MIN_ACTIVITY_MS);
      }
  });

  test("goods that left the world are dropped from the plan", () => {
    const b = createBrain(31, world(), HOME, { celebrate: false, newGood: "wheel" });
    expect(b.now).toMatchObject({ kind: "walk" });
    const w = world({ goods: allGoods.filter((g) => g.id !== "wheel") });
    const next = stepBrain(b, w, { type: "done" }, b.now.kind === "walk" ? b.now.to : HOME);
    expect(next.now).not.toMatchObject({ kind: "play", good: "wheel" });
    expect(next.plan.some((a) => a.kind === "play" && a.good === "wheel")).toBe(false);
  });
});

describe("time and goods", () => {
  test("isNight is true from 20:00 to 5:59", () => {
    expect([19, 20, 23, 0, 5, 6].map(isNight)).toEqual([false, true, true, true, true, false]);
  });

  test("newlyOwned names a good gained since the last visit and nothing on the first visit", () => {
    expect(newlyOwned(null, ["bowl"])).toBeNull();
    expect(newlyOwned(["bowl"], ["bowl", "wheel"])).toBe("wheel");
    expect(newlyOwned(["bowl", "wheel"], ["bowl", "wheel"])).toBeNull();
    expect(newlyOwned(["bowl", "wheel"], ["wheel"])).toBeNull();
  });
});
