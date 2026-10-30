import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { LocalDate } from "@/domain/dates";
import { applyPlacementResult, startPlacement, type PlacementState } from "@/domain/placement";
import { planDailySession } from "@/domain/session";
import { LEVEL } from "@/domain/spec";
import { writeChildFrom } from "@/domain/timing";
import { appendLedger } from "@/game/economy";
import { migrate } from "./migrate";
import { hashPin, makeSalt } from "./pin";
import { newProfile, placementOutcome, todayOf } from "./profile";
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
  ensureSession: () => { day: SessionDay; date: LocalDate } | null;
  skipSessionPart: (index: number) => void;
  recordSet: (run: SetRun) => SetSummary;
  /** test tool: n seeds for the active child, logged as a gift */
  giftSeeds: (n: number) => void;
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
              const sessions = Object.fromEntries(Object.entries(p.sessions).filter(([d, day]) => d !== date || day.done > 0));
              return {
                ...p,
                ...placementOutcome(applied, date),
                placement: st,
                placementDone: true,
                placementSeen: true,
                progress: applied.progress,
                reviews: applied.reviews,
                sessions,
              };
            });
          },
          ackPlacement: () => patchActive((p) => ({ ...p, placementSeen: true })),

          ensureSession: () => {
            const s = get();
            const p = activeProfile(s);
            if (!p) return null;
            const date = today();
            const existing = p.sessions[date];
            if (existing) return { day: existing, date };
            const day: SessionDay = {
              plan: planDailySession({ progress: p.progress, reviews: p.reviews, stageChecks: p.stageChecks, date, unlockAll: s.dev.unlockAll }),
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
            const { profile, summary } = recordSetPure(p0, run, { date: today(), now: now() });
            set((s) => ({ profiles: s.profiles.map((q) => (q.id === profile.id ? profile : q)) }));
            return summary;
          },

          giftSeeds: (n) =>
            patchActive((p) => ({
              ...p,
              wallet: { ...p.wallet, seeds: p.wallet.seeds + n, lifetime: p.wallet.lifetime + n },
              ledger: appendLedger(p.ledger, { at: now(), date: today(), delta: n, reason: "gift" }),
            })),

          setDev: (patch) => set((s) => ({ dev: { ...s.dev, ...patch } })),
        };
      },
      {
        name: STORAGE_KEY,
        version: 2,
        storage: createJSONStorage(() => guarded),
        partialize: (s) => ({ pin: s.pin, profiles: s.profiles, activeId: s.activeId, dev: s.dev }),
        // version 1 moves to 2; data from any other version is left untouched (the read counts as failed)
        migrate: (persisted, version) => migrate(persisted, version) as AppState,
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
