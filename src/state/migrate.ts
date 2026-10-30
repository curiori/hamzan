import { unlockedRewards } from "@/game/achievements";
import { emptyWallet } from "@/game/economy";
import { autoLayout } from "@/game/room";
import { rewardStats } from "./profile";
import type { Profile } from "./types";

// Saved data moves forward one version at a time. A version this app does not know is refused, so the read
// counts as failed and nothing overwrites it.

type ProfileV1 = Omit<Profile, "wallet" | "inventory" | "room" | "ledger" | "settings"> & { settings: Omit<Profile["settings"], "shop"> };

/** Version 1 → 2: an empty wallet, no shop items, the earned room goods laid out, and the shop switched on. */
function profileV2(p: ProfileV1): Profile {
  const base: Profile = { ...p, settings: { ...p.settings, shop: true }, wallet: emptyWallet(), inventory: {}, ledger: [], room: { layout: {}, wallpaper: null, floor: null } };
  return { ...base, room: { ...base.room, layout: autoLayout(unlockedRewards(rewardStats(base))) } };
}

export function migrate(persisted: unknown, version: number): unknown {
  if (version !== 1) throw new Error(`saved data version ${version} is not supported`);
  const s = persisted as { profiles?: ProfileV1[] };
  return { ...s, profiles: (s.profiles ?? []).map(profileV2) };
}
