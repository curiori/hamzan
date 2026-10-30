import { describe, expect, test } from "bun:test";
import type { Activity } from "@/game/hamster-brain";
import { ABOVE_ALL, hamsterDepth, look, walkMs } from "@/features/room/stage-rules";

const at = { x: 200, y: 210 };

describe("timing and depth", () => {
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
});
