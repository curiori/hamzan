import { unlockedRewards } from "@/game/achievements";
import { emptyWallet } from "@/game/economy";
import { autoLayout } from "@/game/room";
import { rewardStats } from "./profile";
import { legacyCourseRecord } from "./reconcile";
import type { Profile } from "./types";

// Saved data moves forward one version at a time. A version this app does not know is refused, so the read
// counts as failed and nothing overwrites it. After moving, every profile is reconciled with the course
// (src/state/reconcile.ts), which also runs on every load.

type ProfileV2 = Omit<Profile, "course">;
type ProfileV1 = Omit<ProfileV2, "wallet" | "inventory" | "room" | "ledger" | "settings"> & { settings: Omit<Profile["settings"], "shop"> };

/** Version 1 → 2: an empty wallet, no shop items, the earned room goods laid out (and counted as seen), and the shop switched on. */
function profileV2(p: ProfileV1): ProfileV2 {
  const base: ProfileV2 = {
    ...p,
    settings: { ...p.settings, shop: true },
    wallet: emptyWallet(),
    inventory: {},
    ledger: [],
    room: { layout: {}, wallpaper: null, floor: null, seen: [] },
  };
  const layout = autoLayout(unlockedRewards(rewardStats({ ...base, course: legacyCourseRecord(base) })));
  return { ...base, room: { ...base.room, layout, seen: Object.values(layout) } };
}

/** what version 2 could hold that version 3 has no more: the 塾 build's units, its day parts and its check sets */
type V2Extras = { juku?: unknown; sessions: Record<string, { plan: { kind: string; slot?: "frontier" | "pending" }[] }>; sets: { kind: string }[] };

/** Version 2 → 3: one course. The 塾 units go, a 塾 day part becomes the main part it was, its checks become checks. */
function profileV3(p: ProfileV2 & V2Extras): Profile {
  const { juku: _units, ...rest } = p;
  const sessions = Object.fromEntries(
    Object.entries(rest.sessions).map(([d, day]) => [d, { ...day, plan: day.plan.map((part) => (part.kind === "juku" ? { kind: "slot", slot: part.slot ?? "frontier" } : part)) }]),
  );
  const sets = rest.sets.map((s) => (s.kind === "juku_check" ? { ...s, kind: "check" } : s));
  return { ...(rest as unknown as Profile), sessions: sessions as unknown as Profile["sessions"], sets: sets as Profile["sets"], course: legacyCourseRecord(rest) };
}

export function migrate(persisted: unknown, version: number): unknown {
  if (version !== 1 && version !== 2) throw new Error(`saved data version ${version} is not supported`);
  const s = persisted as { profiles?: unknown[] };
  const v2 = version === 1 ? (s.profiles ?? []).map((p) => profileV2(p as ProfileV1)) : ((s.profiles ?? []) as ProfileV2[]);
  return { ...s, profiles: v2.map((p) => profileV3(p as ProfileV2 & V2Extras)) };
}
