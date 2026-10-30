import { describe, expect, test } from "bun:test";
import { buy, itemName, SHOP, shopItem } from "@/game/shop";
import { newProfile } from "@/state/profile";
import type { Profile } from "@/state/types";

const AT = { now: 1000, date: "2026-10-30" };

function withSeeds(seeds: number): Profile {
  const p = newProfile("t", 3, { id: "p1", now: 1 });
  return { ...p, wallet: { ...p.wallet, seeds, lifetime: seeds } };
}

describe("shop", () => {
  test("prices, kinds and names match the design", () => {
    expect(Object.fromEntries(SHOP.map((i) => [i.id, [i.kind, i.price, i.name]]))).toEqual({
      ball: ["good", 60, "ころころボール"],
      blocks: ["good", 80, "つみき"],
      grass: ["good", 90, "まどべの くさ"],
      cushion: ["good", 100, "クッション"],
      ladder: ["good", 120, "はしご"],
      lamp: ["good", 150, "ランプ"],
      bookshelf: ["good", 180, "ほんだな"],
      slide: ["good", 200, "すべりだい"],
      bridge: ["good", 250, "つりばし"],
      bed: ["good", 300, "ふわふわベッド"],
      piano: ["good", 400, "おもちゃの ピアノ"],
      goldwheel: ["good", 600, "きんの まわしぐるま"],
      ribbon: ["wear", 120, "リボン"],
      glasses: ["wear", 150, "めがね"],
      scarf: ["wear", 180, "マフラー"],
      beret: ["wear", 200, "ベレーぼう"],
      headphones: ["wear", 250, "ヘッドホン"],
      "wall-sky": ["wallpaper", 150, "そらいろの かべがみ"],
      "wall-forest": ["wallpaper", 250, "もりの かべがみ"],
      "wall-night": ["wallpaper", 350, "よぞらの かべがみ"],
      "floor-grass": ["floor", 200, "しばふの ゆか"],
      broccoli: ["snack", 10, "ブロッコリー"],
      apple: ["snack", 15, "りんご"],
      carrot: ["snack", 15, "にんじん"],
    });
    // the shelves list each kind cheapest first
    expect(SHOP.map((i) => i.id)).toEqual([
      "ball", "blocks", "grass", "cushion", "ladder", "lamp", "bookshelf", "slide", "bridge", "bed", "piano", "goldwheel",
      "ribbon", "glasses", "scarf", "beret", "headphones",
      "wall-sky", "wall-forest", "wall-night", "floor-grass",
      "broccoli", "apple", "carrot",
    ]);
    expect(shopItem("lamp")?.price).toBe(150);
    expect(shopItem("crown")).toBeUndefined();
    expect(itemName("desk")).toBe("べんきょうづくえ");
    expect(itemName("scarf")).toBe("マフラー");
  });

  test("buying takes the price, adds the item and logs it", () => {
    const p = withSeeds(100);
    const r = buy(p, "ball", AT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.wallet.seeds).toBe(40);
    expect(r.profile.wallet.lifetime).toBe(100);
    expect(r.profile.inventory).toEqual({ ball: 1 });
    expect(r.profile.ledger.at(-1)).toEqual({ at: 1000, date: "2026-10-30", delta: -60, reason: "buy", ref: "ball" });
    // whether it goes out in the room is asked on the screen
    expect(r.profile.room).toBe(p.room);
  });

  test("a short wallet buys nothing and says how many are missing", () => {
    expect(buy(withSeeds(50), "ball", AT)).toEqual({ ok: false, reason: "short", need: 10 });
  });

  test("goods and wear are bought once, snacks again and again", () => {
    const first = buy(withSeeds(500), "ball", AT);
    if (!first.ok) throw new Error("ball");
    expect(buy(first.profile, "ball", AT)).toEqual({ ok: false, reason: "owned" });
    let p = first.profile;
    for (let i = 0; i < 3; i++) {
      const r = buy(p, "carrot", AT);
      if (!r.ok) throw new Error("carrot");
      p = r.profile;
    }
    expect(p.inventory.carrot).toBe(3);
    expect(p.wallet.seeds).toBe(500 - 60 - 45);
  });

  test("rewards are not for sale", () => {
    expect(buy(withSeeds(1000), "crown", AT)).toEqual({ ok: false, reason: "unknown" });
  });
});
