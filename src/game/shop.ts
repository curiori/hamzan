import type { LocalDate } from "@/domain/dates";
import { REWARDS } from "@/game/achievements";
import { appendLedger } from "@/game/economy";
import type { Profile } from "@/state/types";

// What the shop sells for sunflower seeds: no money, no random draws, nothing for a limited time, and the rewards
// that practice brings are never for sale. Prices live here, in one place.

export type ShopKind = "good" | "wear" | "wallpaper" | "floor" | "snack";

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  price: number;
}

export const SHOP: ShopItem[] = [
  { id: "ball", kind: "good", name: "ころころボール", price: 60 },
  { id: "blocks", kind: "good", name: "つみき", price: 80 },
  { id: "grass", kind: "good", name: "まどべの くさ", price: 90 },
  { id: "cushion", kind: "good", name: "クッション", price: 100 },
  { id: "ladder", kind: "good", name: "はしご", price: 120 },
  { id: "lamp", kind: "good", name: "ランプ", price: 150 },
  { id: "bookshelf", kind: "good", name: "ほんだな", price: 180 },
  { id: "slide", kind: "good", name: "すべりだい", price: 200 },
  { id: "bridge", kind: "good", name: "つりばし", price: 250 },
  { id: "bed", kind: "good", name: "ふわふわベッド", price: 300 },
  { id: "piano", kind: "good", name: "おもちゃの ピアノ", price: 400 },
  { id: "goldwheel", kind: "good", name: "きんの まわしぐるま", price: 600 },
  { id: "ribbon", kind: "wear", name: "リボン", price: 120 },
  { id: "glasses", kind: "wear", name: "めがね", price: 150 },
  { id: "scarf", kind: "wear", name: "マフラー", price: 180 },
  { id: "beret", kind: "wear", name: "ベレーぼう", price: 200 },
  { id: "headphones", kind: "wear", name: "ヘッドホン", price: 250 },
  { id: "wall-sky", kind: "wallpaper", name: "そらいろの かべがみ", price: 150 },
  { id: "wall-forest", kind: "wallpaper", name: "もりの かべがみ", price: 250 },
  { id: "wall-night", kind: "wallpaper", name: "よぞらの かべがみ", price: 350 },
  { id: "floor-grass", kind: "floor", name: "しばふの ゆか", price: 200 },
  { id: "broccoli", kind: "snack", name: "ブロッコリー", price: 10 },
  { id: "apple", kind: "snack", name: "りんご", price: 15 },
  { id: "carrot", kind: "snack", name: "にんじん", price: 15 },
];

export const shopItem = (id: string): ShopItem | undefined => SHOP.find((i) => i.id === id);

/** The name of a shop item or a reward. */
export const itemName = (id: string): string => shopItem(id)?.name ?? REWARDS.find((r) => r.id === id)?.name ?? "グッズ";

export type BuyResult = { ok: true; profile: Profile } | { ok: false; reason: "short"; need: number } | { ok: false; reason: "owned" | "unknown" };

/** Spends seeds on an item. Snacks can be bought again and again, everything else once; whether a good goes out in the room is asked on the screen. */
export function buy(p: Profile, itemId: string, at: { now: number; date: LocalDate }): BuyResult {
  const item = shopItem(itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (item.kind !== "snack" && (p.inventory[itemId] ?? 0) > 0) return { ok: false, reason: "owned" };
  if (p.wallet.seeds < item.price) return { ok: false, reason: "short", need: item.price - p.wallet.seeds };
  return {
    ok: true,
    profile: {
      ...p,
      wallet: { ...p.wallet, seeds: p.wallet.seeds - item.price },
      inventory: { ...p.inventory, [itemId]: (p.inventory[itemId] ?? 0) + 1 },
      ledger: appendLedger(p.ledger, { at: at.now, date: at.date, delta: -item.price, reason: "buy", ref: itemId }),
    },
  };
}
