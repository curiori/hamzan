import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { planDay } from "@/course/day";
import { isJukuLevel, isJukuStage } from "@/course/levels";
import { jukuEntries, jukuOf } from "@/course/progress";
import type { LocalDate } from "@/domain/dates";
import { applyPlacementResult, startPlacement, type PlacementState } from "@/domain/placement";
import { LEVEL } from "@/domain/spec";
import { writeChildFrom } from "@/domain/timing";
import { appendLedger } from "@/game/economy";
import { placeIn, placeNew, roomGoods, type SlotId } from "@/game/room";
import { buy, shopItem, type BuyResult } from "@/game/shop";
import { closeUnit, openUnit } from "@/juku/track";
import { migrate } from "./migrate";
import { hashPin, makeSalt } from "./pin";
import { reconcileProfile } from "./reconcile";
import { newProfile, ownedGoods, placementOutcome, todayOf } from "./profile";
import { recordSet as recordSetPure } from "./record-set";
import type { DevSettings, PinRecord, Profile, SessionDay, SetRun, SetSummary } from "./types";

export const STORAGE_KEY = "hamzan-ios-v1";
export const DEFAULT_DEV: DevSettings = { dayOffset: 0, unlockAll: false, shortPlacement: false, roomAllGoods: false };

export interface AppState {
  pin: PinRecord | null;
  profiles: Profile[];
  activeId: string | null;
  dev: DevSettings;
  /** the stored state has been read (not persisted) */
  hydrated: boolean;
  /** the stored state could not be read; nothing is saved until the next launch, so the stored records survive (not persisted) */
  loadError: boolean;
  setPin: (pin: string) => void;
  checkPin: (pin: string) => boolean;
  addProfile: (nickname: string, grade: number, activate?: boolean) => string;
  updateProfile: (id: string, patch: Partial<Pick<Profile, "nickname" | "grade" | "settings" | "wearing">>) => void;
  deleteProfile: (id: string) => void;
  resetProfileData: (id: string) => void;
  switchProfile: (id: string) => void;
  saveInputTest: (profileId: string, perDigitSec: number[]) => void;
  beginPlacement: () => void;
  /** test tool: finish the diagnosis as if it ended at levelId (null = everything ★2) */
  skipPlacementTo: (levelId: string | null) => void;
  ackPlacement: () => void;
  /** parent: opens or closes a 塾の単元 of one child; a day whose practice has not started is planned again */
  setJukuUnit: (profileId: string, unitId: string, open: boolean) => void;
  ensureSession: () => { day: SessionDay; date: LocalDate } | null;
  skipSessionPart: (index: number) => void;
  recordSet: (run: SetRun) => SetSummary;
  /** test tool: n seeds for the active child, logged as a gift */
  giftSeeds: (n: number) => void;
  /** the room goods the active child has seen out in the room (no write when nothing changed) */
  markRoomSeen: (goods: string[]) => void;
  /** spends the active child's seeds; nothing changes unless the result is ok */
  buyItem: (itemId: string) => BuyResult;
  /** puts a good out in a free slot of its kind; false when there is no room (it stays stored) */
  placeNewGood: (goodId: string) => boolean;
  /** rearranging: a good into a slot, or null to store what is there */
  placeGood: (slotId: SlotId, goodId: string | null) => void;
  setDecor: (kind: "wallpaper" | "floor", id: string | null) => void;
  /** gives the hamster one of the active child's snacks; false when there is none */
  feedSnack: (id: string) => boolean;
  setDev: (patch: Partial<DevSettings>) => void;
}

export const activeProfile = (s: Pick<AppState, "profiles" | "activeId">): Profile | null => s.profiles.find((p) => p.id === s.activeId) ?? null;

export function createAppStore(storage: StateStorage, deps: { now?: () => number; random?: () => number } = {}) {
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  let markHydrated = (_failed: boolean) => {};
  // Writes are allowed only after the stored state was read successfully: a failed or unknown read
  // must never be followed by a write that replaces every child's records with an empty state.
  let writable = false;
  let loadResult: { failed: boolean } | null = null;
  const guarded: StateStorage = {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => (writable ? storage.setItem(key, value) : undefined),
    removeItem: (key) => (writable ? storage.removeItem(key) : undefined),
  };
  const finishLoad = (failed: boolean) => {
    loadResult = { failed };
    markHydrated(failed);
    writable = !failed;
  };

  const store = create<AppState>()(
    persist(
      (set, get) => {
        markHydrated = (failed) => set({ hydrated: true, loadError: failed });
        const today = () => todayOf(get().dev.dayOffset, now());
        const patchProfile = (id: string, fn: (p: Profile) => Profile) =>
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? fn(p) : p)) }));
        const patchActive = (fn: (p: Profile) => Profile) => {
          const id = get().activeId;
          if (id) patchProfile(id, fn);
        };

        return {
          pin: null,
          profiles: [],
          activeId: null,
          dev: { ...DEFAULT_DEV },
          hydrated: false,
          loadError: false,

          setPin: (pin) => {
            const salt = makeSalt(random);
            set({ pin: { salt, hash: hashPin(pin, salt) } });
          },
          checkPin: (pin) => {
            const p = get().pin;
            return !!p && hashPin(pin, p.salt) === p.hash;
          },

          addProfile: (nickname, grade, activate = true) => {
            const p = newProfile(nickname, grade, { now: now(), random });
            set((s) => ({ profiles: [...s.profiles, p], activeId: activate || !s.activeId ? p.id : s.activeId }));
            return p.id;
          },
          updateProfile: (id, patch) => patchProfile(id, (p) => ({ ...p, ...patch })),
          deleteProfile: (id) =>
            set((s) => {
              const profiles = s.profiles.filter((p) => p.id !== id);
              return { profiles, activeId: s.activeId === id ? (profiles[0]?.id ?? null) : s.activeId };
            }),
          resetProfileData: (id) =>
            patchProfile(id, (p) => ({ ...newProfile(p.nickname, p.grade, { id: p.id, now: now(), random }), settings: p.settings })),
          switchProfile: (id) => set({ activeId: id }),

          saveInputTest: (profileId, perDigitSec) =>
            patchProfile(profileId, (p) => ({ ...p, writeSecPerDigit: writeChildFrom(perDigitSec), writeTestedAt: today() })),

          beginPlacement: () => patchActive((p) => ({ ...p, placement: p.placement ?? startPlacement(p.grade) })),

          skipPlacementTo: (levelId) => {
            const date = today();
            patchActive((p) => {
              const base = p.placement ?? startPlacement(p.grade);
              const st: PlacementState = {
                ...base,
                phase: "done",
                masteredStages: [],
                pendingFrontier: null,
                result: { frontier: levelId, mode: levelId ? LEVEL[levelId].modes[0] : "S" },
              };
              const applied = applyPlacementResult(st, date);
              const outcome = placementOutcome(applied, date);
              const sessions = Object.fromEntries(Object.entries(p.sessions).filter(([d, day]) => d !== date || day.done > 0));
              return {
                ...p,
                rewardBaseline: outcome.rewardBaseline,
                placement: st,
                placementDone: true,
                placementSeen: true,
                // the diagnosis writes stages 0–5 only; 塾の単元 keep their records
                progress: { ...jukuEntries(p.progress), ...applied.progress },
                reviews: [...applied.reviews, ...p.reviews.filter((r) => isJukuLevel(r.levelId))],
                stageChecks: { ...Object.fromEntries(Object.entries(p.stageChecks).filter(([s]) => isJukuStage(Number(s)))), ...outcome.stageChecks },
                sessions,
              };
            });
          },
          ackPlacement: () => patchActive((p) => ({ ...p, placementSeen: true })),

          setJukuUnit: (profileId, unitId, open) => {
            const date = today();
            patchProfile(profileId, (p) => {
              const juku = open ? openUnit(jukuOf(p), unitId, date, p.progress) : closeUnit(jukuOf(p), unitId);
              if (juku === jukuOf(p)) return p;
              // today's plan is made again with (or without) the unit, unless the child has already started it
              const sessions = Object.fromEntries(Object.entries(p.sessions).filter(([d, day]) => d !== date || day.done > 0));
              return { ...p, juku, sessions };
            });
          },

          ensureSession: () => {
            const s = get();
            const p = activeProfile(s);
            if (!p) return null;
            const date = today();
            const existing = p.sessions[date];
            if (existing) return { day: existing, date };
            const day: SessionDay = {
              plan: planDay({ progress: p.progress, reviews: p.reviews, stageChecks: p.stageChecks, date, unlockAll: s.dev.unlockAll, juku: jukuOf(p) }),
              done: 0,
              goal: false,
            };
            patchActive((q) => ({ ...q, sessions: { ...q.sessions, [date]: day } }));
            return { day, date };
          },
          skipSessionPart: (index) => {
            const date = today();
            patchActive((p) => {
              const d = p.sessions[date];
              if (!d || d.done > index) return p;
              const done = index + 1;
              return { ...p, sessions: { ...p.sessions, [date]: { ...d, done, goal: d.goal || done >= d.plan.length } } };
            });
          },

          recordSet: (run) => {
            const p0 = activeProfile(get());
            if (!p0) throw new Error("no profile");
            const { profile, summary } = recordSetPure(p0, run, { date: today(), now: now(), unlockAll: get().dev.unlockAll });
            set((s) => ({ profiles: s.profiles.map((q) => (q.id === profile.id ? profile : q)) }));
            return summary;
          },

          giftSeeds: (n) =>
            patchActive((p) => ({
              ...p,
              wallet: { ...p.wallet, seeds: p.wallet.seeds + n, lifetime: p.wallet.lifetime + n },
              ledger: appendLedger(p.ledger, { at: now(), date: today(), delta: n, reason: "gift" }),
            })),
          markRoomSeen: (goods) => {
            const p = activeProfile(get());
            if (!p || (p.room.seen.length === goods.length && goods.every((g) => p.room.seen.includes(g)))) return;
            patchActive((q) => ({ ...q, room: { ...q.room, seen: [...goods] } }));
          },
          buyItem: (itemId) => {
            const p = activeProfile(get());
            if (!p) return { ok: false, reason: "unknown" };
            const r = buy(p, itemId, { now: now(), date: today() });
            if (r.ok) patchProfile(p.id, () => r.profile);
            return r;
          },
          placeNewGood: (goodId) => {
            const p = activeProfile(get());
            if (!p) return false;
            if (Object.values(p.room.layout).includes(goodId)) return true;
            // goods the child no longer has give their slots up
            const layout = placeNew(roomGoods(p.room.layout, ownedGoods(p)), goodId);
            if (!Object.values(layout).includes(goodId)) return false;
            patchProfile(p.id, (q) => ({ ...q, room: { ...q.room, layout } }));
            return true;
          },
          placeGood: (slotId, goodId) => patchActive((p) => ({ ...p, room: { ...p.room, layout: placeIn(p.room.layout, slotId, goodId) } })),
          setDecor: (kind, id) => patchActive((p) => ({ ...p, room: { ...p.room, [kind]: id } })),
          feedSnack: (id) => {
            const p = activeProfile(get());
            if (!p || shopItem(id)?.kind !== "snack" || (p.inventory[id] ?? 0) <= 0) return false;
            patchProfile(p.id, (q) => ({ ...q, inventory: { ...q.inventory, [id]: (q.inventory[id] ?? 0) - 1 } }));
            return true;
          },

          setDev: (patch) => set((s) => ({ dev: { ...s.dev, ...patch } })),
        };
      },
      {
        name: STORAGE_KEY,
        version: 3,
        storage: createJSONStorage(() => guarded),
        partialize: (s) => ({ pin: s.pin, profiles: s.profiles, activeId: s.activeId, dev: s.dev }),
        // versions 1 and 2 move to 3; data from any other version is left untouched (the read counts as failed)
        migrate: (persisted, version) => migrate(persisted, version) as AppState,
        // every load meets the course this version has: new levels, renamed ids, levels it does not know (kept)
        merge: (persisted, current) => {
          const s = { ...current, ...((persisted ?? {}) as Partial<AppState>) };
          return { ...s, profiles: (s.profiles ?? []).map((p) => reconcileProfile(p)) };
        },
        // runs after a successful or failed read, so the app never waits forever on broken data
        onRehydrateStorage: () => (_state, error) => finishLoad(!!error),
      },
    ),
  );
  // A synchronous failed read happens inside create(), whose initial state then replaces the flags.
  if (loadResult && !store.getState().hydrated) {
    const failed = (loadResult as { failed: boolean }).failed;
    writable = false;
    store.setState({ hydrated: true, loadError: failed });
    writable = !failed;
  }
  return store;
}
