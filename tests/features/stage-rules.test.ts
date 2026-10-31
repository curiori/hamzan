import { describe, expect, test } from "bun:test";
import type { Activity } from "@/game/hamster-brain";
import { ABOVE_ALL, calmCourse, courseLaps, courseNotes, coveringGood, groovesWithout, hamsterDepth, look, NIGHT_BLUE, nightTint, perchedOn, PLAYABLE_EXCEPT, rearrangedUnder, stageGoods, walkAxis, walkMs } from "@/features/room/stage-rules";
import { courseIn, placedGoods, pushSpot, seatIn, SLOTS } from "@/game/room";

const at = { x: 200, y: 210 };

describe("timing and depth", () => {
  test("a walk ends on the axis that moves most, so a walk along a row still takes its time", () => {
    // Reanimated calls back at once when a value is already at its target (desk, wheel and house share y 214)
    expect(walkAxis({ x: 52, y: 214 }, { x: 137, y: 214 })).toBe("x");
    expect(walkAxis({ x: 200, y: 190 }, { x: 200, y: 250 })).toBe("y");
    expect(walkAxis({ x: 100, y: 200 }, { x: 140, y: 230 })).toBe("x");
    expect(walkAxis({ x: 100, y: 200 }, { x: 100, y: 200 })).toBeNull();
  });

  test("walks take distance over speed and are slower with reduce motion", () => {
    expect(walkMs(at, { x: 240, y: 210 }, false, false)).toBe(1000);
    expect(walkMs(at, { x: 330, y: 210 }, true, false)).toBe(1000);
    expect(walkMs(at, { x: 228, y: 210 }, false, true)).toBe(1000);
  });

  test("the hamster is drawn in front of whatever lies between where it is and where it goes", () => {
    const walk = (y: number): Activity => ({ kind: "walk", to: { x: 100, y }, dash: false, carry: false });
    expect(hamsterDepth(walk(240), at)).toBe(240);
    expect(hamsterDepth(walk(190), at)).toBe(210);
    expect(hamsterDepth({ kind: "idle", act: "blink", ms: 1000 }, at)).toBe(210);
    expect(hamsterDepth({ kind: "play", good: "swing", variant: "normal", ms: 5000 }, at)).toBe(ABOVE_ALL);
    expect(hamsterDepth({ kind: "play", good: "hammock", variant: "normal", ms: 5000 }, at)).toBe(ABOVE_ALL);
    // up the ladder the hamster is in front of it; sitting in the cushion it sinks in behind the cushion's front
    expect(hamsterDepth({ kind: "play", good: "ladder", variant: "normal", ms: 5000 }, at)).toBe(ABOVE_ALL);
    expect(hamsterDepth({ kind: "play", good: "cushion", variant: "normal", ms: 5000 }, at)).toBe(210);
    // eating at the very front, the hamster is in front of any small good standing there
    expect(hamsterDepth({ kind: "eat", snack: "apple", ms: 2600 }, at)).toBe(ABOVE_ALL);
  });
});

describe("look", () => {
  test("walking shows the side view, with full cheeks when carrying seeds", () => {
    expect(look({ kind: "walk", to: at, dash: false, carry: false })).toMatchObject({ view: "side", cheeks: false, label: "さんぽ ちゅう" });
    expect(look({ kind: "walk", to: at, dash: true, carry: false }).label).toBe("はしって いる");
    expect(look({ kind: "walk", to: at, dash: false, carry: true })).toMatchObject({ view: "side", cheeks: true, label: "たねを はこんで いる" });
  });

  test("inside the house or the tunnel the hamster is hidden, and the house says Zzz", () => {
    expect(look({ kind: "play", good: "house", variant: "normal", ms: 5000 })).toMatchObject({ view: "hidden", bubble: "Zzz" });
    expect(look({ kind: "play", good: "tunnel", variant: "normal", ms: 5000 })).toMatchObject({ view: "hidden", bubble: null });
    expect(look({ kind: "sleep", inHouse: true, ms: 20000 })).toMatchObject({ view: "hidden", bubble: "Zzz", label: "おうちで ねて いる" });
  });

  test("each good and reaction has its pose, bubble and label", () => {
    expect(look({ kind: "play", good: "desk", variant: "normal", ms: 5000 })).toMatchObject({ view: "front", pose: "read", bubble: "なるほど", label: "べんきょうづくえで あそんで いる" });
    expect(look({ kind: "play", good: "bowl", variant: "normal", ms: 5000 })).toMatchObject({ view: "front", pose: "cheeks" });
    expect(look({ kind: "play", good: "hammock", variant: "normal", ms: 5000 })).toMatchObject({ view: "front", pose: "sleep" });
    expect(look({ kind: "play", good: "wheel", variant: "normal", ms: 5000 })).toMatchObject({ view: "side" });
    expect(look({ kind: "sleep", inHouse: false, ms: 9000 })).toMatchObject({ view: "front", pose: "sleep", bubble: "Zzz", label: "ねて いる" });
    expect(look({ kind: "react", how: "hop", ms: 900 })).toMatchObject({ view: "front", mood: "happy", bubble: "きゅっ" });
    expect(look({ kind: "react", how: "pet", ms: 1600 })).toMatchObject({ view: "front", pose: "pet" });
    expect(look({ kind: "celebrate", ms: 2400 })).toMatchObject({ view: "front", mood: "cheer", label: "おいわい ちゅう" });
    expect(look({ kind: "idle", act: "groom", ms: 2000 })).toMatchObject({ view: "front", mood: "idle", bubble: null });
  });

  test("new plays read their good's name", () => {
    const play = (good: string) => look({ kind: "play", good, variant: "normal", ms: 5000 });
    expect(play("ball")).toMatchObject({ view: "side", bubble: "ころころ", label: "ころころボールで あそんで いる" });
    expect(play("blocks")).toMatchObject({ view: "front", bubble: "がらがら", label: "つみきで あそんで いる" });
    expect(play("grass")).toMatchObject({ view: "front", bubble: "くんくん", label: "まどべの くさで あそんで いる" });
    expect(play("cushion")).toMatchObject({ view: "front", mood: "happy", bubble: "ふかふか", label: "クッションで あそんで いる" });
    expect(play("ladder")).toMatchObject({ view: "front", bubble: null, label: "はしごで あそんで いる" });
    expect(look({ kind: "eat", snack: "apple", ms: 2600 })).toMatchObject({ view: "front", pose: "cheeks", cheeks: true, bubble: "もぐもぐ", label: "りんごを たべて いる" });
    expect(play("bookshelf")).toMatchObject({ view: "front", pose: "read", bubble: "ふむふむ", label: "ほんだなで あそんで いる" });
    expect(play("slide")).toMatchObject({ view: "side", bubble: "わーい", label: "すべりだいで あそんで いる" });
    expect(play("bridge")).toMatchObject({ view: "side", bubble: "どきどき", label: "つりばしで あそんで いる" });
    expect(play("piano")).toMatchObject({ view: "side", bubble: "♪", label: "おもちゃの ピアノで あそんで いる" });
    expect(play("goldwheel")).toMatchObject({ view: "side", bubble: "きらきら", label: "きんの まわしぐるまで あそんで いる" });
    expect(play("bed")).toMatchObject({ view: "front", pose: "sleep", bubble: "ごろん", label: "ふわふわベッドで あそんで いる" });
    expect(look({ kind: "sleep", inHouse: false, inBed: true, ms: 30000 })).toMatchObject({ view: "front", pose: "sleep", bubble: "Zzz", label: "ベッドで ねて いる" });
    expect(look({ kind: "idle", act: "groove", ms: 3000 })).toMatchObject({ view: "front", mood: "happy", bubble: "♪", label: "おんがくを きいて いる" });
  });
});

describe("the saved room", () => {
  test("the night is darker without a lamp", () => {
    expect(nightTint(false, false)).toBe(0);
    expect(nightTint(false, true)).toBe(0);
    expect(nightTint(true, false)).toBe(0.3);
    expect(nightTint(true, true)).toBe(0.12);
  });

  test("the night blue reads blue, not gray, over the plain wall", () => {
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const wall = rgb("#FBF1DF");
    const blue = rgb(NIGHT_BLUE);
    // the wall as seen through the night blue laid over it at strength a
    const seen = (a: number) => wall.map((w, i) => (1 - a) * w + a * blue[i]);
    const [r, g, b] = seen(nightTint(true, false));
    expect(b - r).toBeGreaterThanOrEqual(20);
    expect(b - g).toBeGreaterThanOrEqual(15);
    // a lamp out lightens the night
    const sum = (c: number[]) => c.reduce((total, v) => total + v, 0);
    expect(sum(seen(nightTint(true, true)))).toBeGreaterThan(sum(seen(nightTint(true, false))));
  });

  test("the lamp lights the room but is not played with", () => {
    expect(PLAYABLE_EXCEPT).toEqual(["lamp"]);
  });
});

describe("the stage's goods", () => {
  test("the ball is walked to from the side it is pushed from, and the lamp is left out", () => {
    const goods = stageGoods(placedGoods({ floorS2: "ball", floorL2: "wheel", ceil1: "swing", wall1: "lamp" }));
    expect(goods.map((g) => g.id).sort()).toEqual(["ball", "swing", "wheel"]);
    const ball = goods.find((g) => g.id === "ball");
    expect(ball?.spot).toEqual(pushSpot("ball", "floorS2")?.at);
    expect(ball?.push).toEqual(pushSpot("ball", "floorS2"));
    expect(goods.find((g) => g.id === "wheel")?.spot).toEqual(SLOTS.floorL2.spot);
    expect(goods.find((g) => g.id === "swing")?.seat).toEqual(seatIn("swing", "ceil1"));
  });

  test("course goods carry their course", () => {
    const goods = stageGoods(placedGoods({ floorL3: "slide", floorL2: "wheel" }));
    expect(goods.find((g) => g.id === "slide")?.course).toEqual(courseIn("slide", "floorL3"));
    expect(goods.find((g) => g.id === "wheel")?.course).toBeUndefined();
  });

  test("the piano plays its five keys in order while the hamster crosses them", () => {
    const piano = courseIn("piano", "floorL2") ?? { steps: [] };
    const notes = courseNotes(piano);
    expect(notes.map((n) => n.key)).toEqual([0, 1, 2, 3, 4]);
    // evenly over the 2000 ms walk across the keys, which starts 400 ms in: each note in the middle of its fifth
    expect(notes.map((n) => n.at)).toEqual([600, 1000, 1400, 1800, 2200]);
    expect(courseNotes(courseIn("slide", "floorL3") ?? { steps: [] })).toEqual([]);
  });

  test("a course play ends when its last time over the course does, so the hamster never steps in place", () => {
    // the bridge (4600 ms a time), the piano (2900) and the slide (2350) in plays the brain makes 4 to 8 s long
    expect(courseLaps(4600, 5000)).toEqual({ laps: 1, ends: 4600 });
    expect(courseLaps(4600, 7000)).toEqual({ laps: 2, ends: 9200 });
    expect(courseLaps(2900, 8000)).toEqual({ laps: 3, ends: 8700 });
    expect(courseLaps(2350, 4000)).toEqual({ laps: 2, ends: 4700 });
    // a course longer than the play still goes over once
    expect(courseLaps(13900, 4000)).toEqual({ laps: 1, ends: 13900 });
  });

  test("with reduce motion no leg of a course is faster than a calm walk", () => {
    const bridge = courseIn("bridge", "ceil1") ?? { steps: [], ms: 0 };
    const from = SLOTS.ceil1.spot;
    const calm = calmCourse(bridge, from);
    let was = from;
    for (const [i, st] of calm.steps.entries()) {
      expect(st.to).toEqual(bridge.steps[i].to);
      expect(st.ms).toBeGreaterThanOrEqual(Math.max(bridge.steps[i].ms, walkMs(was, st.to, false, true)));
      was = st.to;
    }
    expect(calm.ms).toBe(calm.steps.reduce((sum, st) => sum + st.ms, 0));
    // up from the floor onto the bridge in about five seconds rather than half of one
    expect(calm.steps[0].ms).toBeGreaterThan(4000);
    // the piano's five keys spread over its slower walk across them
    const piano = calmCourse(courseIn("piano", "floorL2") ?? { steps: [], ms: 0 }, SLOTS.floorL2.spot);
    const notes = courseNotes(piano);
    expect(notes.map((n) => n.key)).toEqual([0, 1, 2, 3, 4]);
    expect(notes[4].at).toBeGreaterThan(notes[0].at + 4 * 400);
  });

  test("taking the headphones off ends a sway to the music", () => {
    const groove: Activity = { kind: "idle", act: "groove", ms: 3000 };
    expect(groovesWithout(groove, null)).toBe(true);
    expect(groovesWithout(groove, "ribbon")).toBe(true);
    expect(groovesWithout(groove, "headphones")).toBe(false);
    expect(groovesWithout({ kind: "idle", act: "blink", ms: 1000 }, null)).toBe(false);
  });

  test("perched activities count as standing at the spot", () => {
    const play = (good: string): Activity => ({ kind: "play", good, variant: "normal", ms: 5000 });
    for (const good of ["swing", "ladder", "bed", "slide", "bridge", "piano"]) expect(perchedOn(play(good))).toBe(true);
    for (const good of ["wheel", "ball"]) expect(perchedOn(play(good))).toBe(false);
    expect(perchedOn({ kind: "sleep", inHouse: false, inBed: true, ms: 30000 })).toBe(true);
    expect(perchedOn({ kind: "sleep", inHouse: true, ms: 30000 })).toBe(false);
    expect(perchedOn({ kind: "walk", to: at, dash: false, carry: false })).toBe(false);
  });

  test("the cushion or the bed drawn over the hamster in it lets a tap through to the hamster", () => {
    const play = (good: string): Activity => ({ kind: "play", good, variant: "normal", ms: 5000 });
    const placed = placedGoods({ floorS2: "bed", floorS3: "cushion", ceil1: "swing", floorL3: "slide", floorS1: "ball" });
    expect(coveringGood(play("bed"), SLOTS.floorS2.spot, placed)).toBe("bed");
    expect(coveringGood({ kind: "sleep", inHouse: false, inBed: true, ms: 30000 }, SLOTS.floorS2.spot, placed)).toBe("bed");
    expect(coveringGood(play("cushion"), SLOTS.floorS3.spot, placed)).toBe("cushion");
    // up on the swing or the slide the hamster is drawn over its good; beside the ball it is not in it
    expect(coveringGood(play("swing"), SLOTS.ceil1.spot, placed)).toBeNull();
    expect(coveringGood(play("slide"), SLOTS.floorL3.spot, placed)).toBeNull();
    expect(coveringGood(play("ball"), pushSpot("ball", "floorS1")?.at ?? at, placed)).toBeNull();
    expect(coveringGood({ kind: "idle", act: "blink", ms: 1000 }, SLOTS.floorS2.spot, placed)).toBeNull();
  });
});

describe("rearranging under the hamster", () => {
  const before = stageGoods(placedGoods({ floorL3: "house", floorS2: "ball", floorS3: "bowl", ceil1: "swing" }));
  const without = (id: string) => before.filter((g) => g.id !== id);
  // the ball moved to the bowl's slot, the bowl stored
  const movedBall = stageGoods(placedGoods({ floorL3: "house", floorS3: "ball", ceil1: "swing" }));
  const play = (good: string): Activity => ({ kind: "play", good, variant: "normal", ms: 5000 });
  const walk: Activity = { kind: "walk", to: { x: 100, y: 220 }, dash: false, carry: false };

  test("a good the hamster uses, or is on its way to, that is put away or moved", () => {
    expect(rearrangedUnder({ now: play("swing"), plan: [] }, before, without("swing"))).toBe(true);
    expect(rearrangedUnder({ now: { kind: "sleep", inHouse: true, ms: 30000 }, plan: [] }, before, without("house"))).toBe(true);
    expect(rearrangedUnder({ now: play("ball"), plan: [] }, before, movedBall)).toBe(true);
    expect(rearrangedUnder({ now: walk, plan: [play("ball")] }, before, movedBall)).toBe(true);
    // the bowl's seeds are carried home to the house
    expect(rearrangedUnder({ now: play("bowl"), plan: [{ ...walk, carry: true }, play("house")] }, before, without("house"))).toBe(true);
  });

  test("a bed slept in that is put away wakes the hamster", () => {
    const withBed = stageGoods(placedGoods({ floorL3: "house", floorS2: "bed" }));
    const noBed = withBed.filter((g) => g.id !== "bed");
    expect(rearrangedUnder({ now: { kind: "sleep", inHouse: false, inBed: true, ms: 30000 }, plan: [] }, withBed, noBed)).toBe(true);
  });

  test("changes to other goods, or to nothing the hamster uses, leave it alone", () => {
    expect(rearrangedUnder({ now: play("swing"), plan: [] }, before, movedBall)).toBe(false);
    expect(rearrangedUnder({ now: { kind: "sleep", inHouse: false, ms: 9000 }, plan: [] }, before, without("house"))).toBe(false);
    expect(rearrangedUnder({ now: walk, plan: [] }, before, [])).toBe(false);
    expect(rearrangedUnder({ now: { kind: "eat", snack: "apple", ms: 2600 }, plan: [] }, before, [])).toBe(false);
    expect(rearrangedUnder({ now: play("swing"), plan: [] }, before, before)).toBe(false);
  });
});
