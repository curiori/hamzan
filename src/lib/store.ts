import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { LEVEL, LEVELS, RULE_NUMBERS, SPEC, STAGES, type Coeffs, type Mode } from "@/domain/spec";
import { addDays, diffDays, toLocalDate, type LocalDate } from "@/domain/dates";
import { hashString, seedOf } from "@/domain/rng";
import type { Answer, Problem, ProblemInstance } from "@/domain/problem";
import { mixedTargetSec, targetSec, writeChildFrom, type TimeOptions } from "@/domain/timing";
import { judgeSet, starsOf, type SetResult } from "@/domain/judge";
import { classifyError, type ErrorTypeId } from "@/domain/errors";
import {
  applySetResult,
  demote,
  hasStar2,
  isMastered,
  isUnlocked,
  lpOf,
  practiceTarget,
  pendingStar3,
  type ProgressEvent,
  type ProgressMap,
} from "@/domain/progression";
import { applyReview, scheduleOnMastery, type ReviewItem } from "@/domain/review";
import { planDailySession, type SessionPart, type StageCheckRecord } from "@/domain/session";
import {
  addPlacementTime,
  applyMiniCheck,
  applyPlacementResult,
  applyStageCheck,
  startPlacement,
  type PlacementState,
} from "@/domain/placement";
import { makeInstance } from "@/domain/generators";
import { REWARDS, unlockedRewards, type RewardStats } from "@/lib/rewards";

// Everything is stored on this device only (C-1). One record per child profile.

export type Screen = "home" | "room" | "play" | "parent";
export type SetKind = "main" | "extra" | "review" | "warmup" | "placement" | "stage_check" | "challenge";

export interface Settings {
  timer: boolean;
  autoSubmit: boolean;
  sound: boolean;
  vibration: boolean;
  coeffs: { star2: Coeffs; star3: Coeffs } | null;
}
export const DEFAULT_SETTINGS: Settings = { timer: false, autoSubmit: true, sound: true, vibration: true, coeffs: null };

export interface SetAttempt {
  id: string;
  kind: SetKind;
  levelId: string | null;
  mode: Mode;
  date: LocalDate;
  startedAt: number;
  n: number;
  errors: number;
  perProblemSec: number;
  target2: number;
  target3: number;
  result: SetResult | "pass" | "fail" | "done";
}

export interface FactStat {
  levelId: string;
  problem: Problem;
  attempts: number;
  errors: number;
  errorDates: LocalDate[];
  lastErrorDate: LocalDate | null;
  lastSlowDate: LocalDate | null;
  lastLatencyMs: number | null;
  lastSeen: LocalDate;
}

export interface ErrorRecord {
  date: LocalDate;
  levelId: string;
  factKey: string;
  type: ErrorTypeId;
  problem: Problem;
}

export interface SessionDay {
  plan: SessionPart[];
  done: number;
  goal: boolean;
}

export interface Profile {
  id: string;
  nickname: string;
  grade: number;
  createdAt: number;
  writeSecPerDigit: number | null;
  writeTestedAt: LocalDate | null;
  settings: Settings;
  progress: ProgressMap;
  reviews: ReviewItem[];
  sets: SetAttempt[];
  facts: Record<string, FactStat>;
  errors: ErrorRecord[];
  stageChecks: Record<number, StageCheckRecord>;
  sessions: Record<LocalDate, SessionDay>;
  challenge: { lastDate: LocalDate | null; bestSec: number | null };
  placement: PlacementState | null;
  placementDone: boolean;
  /** the child has seen the end-of-diagnosis screen */
  placementSeen?: boolean;
  /** ★2 / mastered counts handed out by the diagnosis — goods only count what comes after */
  rewardBaseline?: { star2: number; mastered: number };
  wearing: string | null;
}

export interface ProblemResult {
  inst: ProblemInstance;
  /** first answer correct (H: no blank had to be revealed; M: memo and answer right) */
  correct: boolean;
  given: Answer | null;
  latencyMs: number;
}

export interface SetRun {
  kind: SetKind;
  mode: Mode;
  levelId: string | null;
  results: ProblemResult[];
  interrupted: boolean;
  fixedSet?: boolean;
  sessionPart?: number;
  stage?: number;
  placementPhase?: "stageCheck" | "mini";
  activeSec: number;
}

export interface SetSummary {
  kind: SetKind;
  levelId: string | null;
  mode: Mode;
  result: SetResult | null;
  stars: number;
  n: number;
  errors: number;
  perProblemSec: number;
  t2: number;
  t3: number;
  prevBest: number | null;
  events: ProgressEvent[];
  nextMode: Mode | null;
  reviews: { levelId: string; passed: boolean; demoted: boolean }[];
  stageCheck: { stage: number; passed: boolean } | null;
  placement: PlacementState | null;
  challengeBest: { sec: number | null; isNew: boolean } | null;
  goalReached: boolean;
  newRewards: string[];
}

interface AppState {
  pin: { hash: string; salt: string } | null;
  profiles: Profile[];
  activeId: string | null;
  dev: { dayOffset: number; unlockAll: boolean; shortPlacement: boolean };
  screen: Screen;
  setScreen: (s: Screen) => void;
  setPin: (pin: string) => void;
  checkPin: (pin: string) => boolean;
  addProfile: (nickname: string, grade: number, activate?: boolean) => string;
  updateProfile: (id: string, patch: Partial<Pick<Profile, "nickname" | "grade" | "settings" | "wearing">>) => void;
  deleteProfile: (id: string) => void;
  resetProfileData: (id: string) => void;
  switchProfile: (id: string) => void;
  saveInputTest: (perDigitSec: number[]) => void;
  beginPlacement: () => void;
  /** test tool: finish the diagnosis as if it ended at levelId (null = everything ★2) */
  skipPlacementTo: (levelId: string | null) => void;
  ackPlacement: () => void;
  ensureSession: () => SessionDay | null;
  skipSessionPart: (index: number) => void;
  recordSet: (run: SetRun) => SetSummary;
  setDev: (patch: Partial<AppState["dev"]>) => void;
}

// ---------- helpers usable from components ----------
export const todayOf = (dayOffset: number) => toLocalDate(Date.now() + dayOffset * 86400000);
export const timeOpts = (p: Profile): TimeOptions => ({ writeChild: p.writeSecPerDigit, override: p.settings.coeffs });
export const activeProfile = (s: Pick<AppState, "profiles" | "activeId">) => s.profiles.find((p) => p.id === s.activeId) ?? null;

export function rewardStats(p: Profile): RewardStats {
  const lps = LEVELS.map((l) => lpOf(p.progress, l.id));
  const base = p.rewardBaseline ?? { star2: 0, mastered: 0 };
  return {
    cleanSets: p.sets.filter((s) => s.kind !== "warmup" && s.kind !== "placement" && s.n > 0 && s.errors === 0).length,
    star2Levels: Math.max(0, lps.filter(hasStar2).length - base.star2),
    mastered: Math.max(0, lps.filter(isMastered).length - base.mastered),
    goalDays: Object.values(p.sessions).filter((d) => d.goal).length,
    stageChecksPassed: Object.values(p.stageChecks).filter((c) => c.passed && !c.byPlacement).length,
  };
}

/** what the diagnosis hands out: earlier levels as ★2, cleared stages, and the reward baseline */
function placementOutcome(applied: { progress: ProgressMap; clearedStages: number[] }, date: LocalDate) {
  const lps = LEVELS.map((l) => lpOf(applied.progress, l.id));
  return {
    stageChecks: Object.fromEntries(applied.clearedStages.map((id) => [id, { date, passed: true, byPlacement: true }])) as Record<number, StageCheckRecord>,
    rewardBaseline: { star2: lps.filter(hasStar2).length, mastered: lps.filter(isMastered).length },
  };
}

/** factKeys to weight ×2: wrong, or slower than T★2, within the last weakFactWindowDays. */
export function weakFacts(p: Profile, levelId: string, date: LocalDate): Set<string> {
  const win = SPEC.rules.setGeneration.weakFactWindowDays;
  const recent = (d: LocalDate | null) => d !== null && diffDays(date, d) < win;
  return new Set(
    Object.entries(p.facts)
      .filter(([, f]) => f.levelId === levelId && (recent(f.lastErrorDate) || recent(f.lastSlowDate)))
      .map(([k]) => k),
  );
}

export function setIndexToday(p: Profile, levelId: string, date: LocalDate): number {
  return p.sets.filter((s) => s.levelId === levelId && s.date === date).length;
}

/** Seed for a level's set: fixed during the first N days of S mode, otherwise hash(profile, level, date, index). */
export function setSeed(p: Profile, levelId: string, mode: Mode, date: LocalDate): { seed: number; fixed: boolean } {
  const lp = lpOf(p.progress, levelId);
  const days = SPEC.rules.setGeneration.fixedSetDaysForNewLevelSpeed;
  if (mode === "S" && !hasStar2(lp) && (lp.fixedSetDates.length < days || lp.fixedSetDates.includes(date)))
    return { seed: seedOf(p.id, levelId, "fixed"), fixed: true };
  return { seed: seedOf(p.id, levelId, date, setIndexToday(p, levelId, date)), fixed: false };
}

/** Problems missed yesterday (warm-up source). */
export function yesterdaysMisses(p: Profile, date: LocalDate): ProblemInstance[] {
  const y = addDays(date, -1);
  return p.errors.filter((e) => e.date === y).map((e) => makeInstance(e.levelId, e.problem));
}

/** Current stage = the stage of today's practice target. */
export function currentStage(p: Profile, unlockAll: boolean): number {
  const t = practiceTarget(p.progress, unlockAll)?.level ?? pendingStar3(p.progress);
  return t ? t.stage : STAGES[STAGES.length - 1].id;
}

export function warmupLevels(p: Profile, unlockAll: boolean): string[] {
  const stage = currentStage(p, unlockAll);
  const open = (id: string) => isUnlocked(p.progress, id, unlockAll);
  const here = LEVELS.filter((l) => l.stage === stage && l.enumerable && open(l.id)).map((l) => l.id);
  return here.length ? here : LEVELS.filter((l) => l.enumerable && open(l.id) && l.stage <= stage).map((l) => l.id);
}

function pinHash(pin: string, salt: string): string {
  let h = `${salt}:${pin}`;
  for (let i = 0; i < 2000; i++) h = hashString(h + salt).toString(36);
  return h;
}

const newProfile = (nickname: string, grade: number): Profile => ({
  id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
  nickname,
  grade,
  createdAt: Date.now(),
  writeSecPerDigit: null,
  writeTestedAt: null,
  settings: { ...DEFAULT_SETTINGS },
  progress: {},
  reviews: [],
  sets: [],
  facts: {},
  errors: [],
  stageChecks: {},
  sessions: {},
  challenge: { lastDate: null, bestSec: null },
  placement: null,
  placementDone: false,
  wearing: null,
});

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      // storage unavailable — keep going in memory
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // storage unavailable
    }
  },
};

const round2 = (x: number) => Math.round(x * 100) / 100;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const patchActive = (fn: (p: Profile) => Profile) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === s.activeId ? fn(p) : p)) }));

      return {
        pin: null,
        profiles: [],
        activeId: null,
        dev: { dayOffset: 0, unlockAll: false, shortPlacement: false },
        screen: "home",
        setScreen: (screen) => set({ screen }),

        setPin: (pin) => {
          const salt = Math.random().toString(36).slice(2, 10);
          set({ pin: { salt, hash: pinHash(pin, salt) } });
        },
        checkPin: (pin) => {
          const p = get().pin;
          return !!p && pinHash(pin, p.salt) === p.hash;
        },

        addProfile: (nickname, grade, activate = true) => {
          const p = newProfile(nickname, grade);
          set((s) => ({ profiles: [...s.profiles, p], activeId: activate || !s.activeId ? p.id : s.activeId }));
          return p.id;
        },
        updateProfile: (id, patch) => set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        deleteProfile: (id) =>
          set((s) => {
            const profiles = s.profiles.filter((p) => p.id !== id);
            return { profiles, activeId: s.activeId === id ? (profiles[0]?.id ?? null) : s.activeId };
          }),
        resetProfileData: (id) =>
          set((s) => ({
            profiles: s.profiles.map((p) => (p.id === id ? { ...newProfile(p.nickname, p.grade), id: p.id, settings: p.settings } : p)),
          })),
        switchProfile: (id) => set({ activeId: id, screen: "home" }),

        saveInputTest: (perDigitSec) =>
          patchActive((p) => ({ ...p, writeSecPerDigit: writeChildFrom(perDigitSec), writeTestedAt: todayOf(get().dev.dayOffset) })),

        beginPlacement: () => patchActive((p) => ({ ...p, placement: p.placement ?? startPlacement(p.grade) })),

        skipPlacementTo: (levelId) => {
          const date = todayOf(get().dev.dayOffset);
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
            return { ...p, ...placementOutcome(applied, date), placement: st, placementDone: true, placementSeen: true, progress: applied.progress, reviews: applied.reviews, sessions };
          });
        },
        ackPlacement: () => patchActive((p) => ({ ...p, placementSeen: true })),

        ensureSession: () => {
          const s = get();
          const p = activeProfile(s);
          if (!p) return null;
          const date = todayOf(s.dev.dayOffset);
          const existing = p.sessions[date];
          if (existing) return existing;
          const day: SessionDay = {
            plan: planDailySession({ progress: p.progress, reviews: p.reviews, stageChecks: p.stageChecks, date, unlockAll: s.dev.unlockAll }),
            done: 0,
            goal: false,
          };
          patchActive((q) => ({ ...q, sessions: { ...q.sessions, [date]: day } }));
          return day;
        },

        skipSessionPart: (index) => {
          const date = todayOf(get().dev.dayOffset);
          patchActive((p) => {
            const d = p.sessions[date];
            if (!d || d.done > index) return p;
            const done = index + 1;
            return { ...p, sessions: { ...p.sessions, [date]: { ...d, done, goal: d.goal || done >= d.plan.length } } };
          });
        },

        recordSet: (run) => {
          const s = get();
          const p0 = activeProfile(s);
          if (!p0) throw new Error("no profile");
          const date = todayOf(s.dev.dayOffset);
          const opts = timeOpts(p0);
          const rewardsBefore = new Set(unlockedRewards(rewardStats(p0)));
          const p: Profile = {
            ...p0,
            progress: { ...p0.progress },
            facts: { ...p0.facts },
            errors: p0.errors.filter((e) => diffDays(date, e.date) <= 60),
            reviews: [...p0.reviews],
            stageChecks: { ...p0.stageChecks },
            sessions: { ...p0.sessions },
          };

          const n = run.results.length;
          const errors = run.results.filter((r) => !r.correct).length;
          const perProblemSec = n ? round2(run.results.reduce((a, r) => a + r.latencyMs, 0) / n / 1000) : 0;
          const ids = run.results.map((r) => r.inst.levelId);
          const t2 = run.levelId ? targetSec(LEVEL[run.levelId], 2, opts) : mixedTargetSec(ids, 2, opts);
          const t3 = run.levelId ? targetSec(LEVEL[run.levelId], 3, opts) : mixedTargetSec(ids, 3, opts);

          // facts and mistakes
          const win = SPEC.rules.setGeneration.weakFactWindowDays;
          for (const r of run.results) {
            const k = r.inst.factKey;
            const prev = p.facts[k];
            const errorDates = (prev?.errorDates ?? []).filter((d) => diffDays(date, d) < win);
            if (!r.correct) errorDates.push(date);
            const slow = run.mode === "S" && run.kind !== "warmup" && r.latencyMs / 1000 > targetSec(LEVEL[r.inst.levelId], 2, opts);
            p.facts[k] = {
              levelId: r.inst.levelId,
              problem: r.inst.problem,
              attempts: (prev?.attempts ?? 0) + 1,
              errors: (prev?.errors ?? 0) + (r.correct ? 0 : 1),
              errorDates,
              lastErrorDate: r.correct ? (prev?.lastErrorDate ?? null) : date,
              lastSlowDate: slow ? date : (prev?.lastSlowDate ?? null),
              lastLatencyMs: run.kind === "warmup" ? (prev?.lastLatencyMs ?? null) : r.latencyMs,
              lastSeen: date,
            };
            if (!r.correct && r.given)
              p.errors.push({ date, levelId: r.inst.levelId, factKey: k, type: classifyError(r.inst, r.given, errorDates.length), problem: r.inst.problem });
          }
          const factKeys = Object.keys(p.facts);
          if (factKeys.length > 4000)
            factKeys
              .sort((a, b) => p.facts[a].lastSeen.localeCompare(p.facts[b].lastSeen))
              .slice(0, factKeys.length - 4000)
              .forEach((k) => delete p.facts[k]);

          const summary: SetSummary = {
            kind: run.kind,
            levelId: run.levelId,
            mode: run.mode,
            result: null,
            stars: 0,
            n,
            errors,
            perProblemSec,
            t2,
            t3,
            prevBest: run.levelId ? lpOf(p0.progress, run.levelId).personalBestSec : null,
            events: [],
            nextMode: null,
            reviews: [],
            stageCheck: null,
            placement: null,
            challengeBest: null,
            goalReached: false,
            newRewards: [],
          };
          let attemptResult: SetAttempt["result"] = "done";

          if ((run.kind === "main" || run.kind === "extra") && run.levelId) {
            const lv = LEVEL[run.levelId];
            const result = judgeSet({ firstCorrect: run.results.map((r) => r.correct), perProblemSec, t2, t3, timed: run.mode === "S", interrupted: run.interrupted });
            const before = lpOf(p.progress, run.levelId);
            const out = applySetResult(before, lv, { result, mode: run.mode, errors, perProblemSec, t2, date, fixedSet: run.fixedSet });
            p.progress[run.levelId] = out.progress;
            if (out.events.includes("mastered")) {
              p.reviews = [...p.reviews.filter((r) => r.levelId !== run.levelId), scheduleOnMastery(run.levelId, date)];
            }
            summary.result = result;
            summary.stars = starsOf(result);
            summary.events = out.events;
            summary.nextMode = out.progress.mode !== before.mode ? out.progress.mode : null;
            attemptResult = result;
          } else if (run.kind === "review") {
            const byLevel = new Map<string, ProblemResult[]>();
            run.results.forEach((r) => byLevel.set(r.inst.levelId, [...(byLevel.get(r.inst.levelId) ?? []), r]));
            for (const [levelId, rs] of byLevel) {
              const item = p.reviews.find((r) => r.levelId === levelId);
              if (!item || run.interrupted) continue;
              const sec = rs.reduce((a, r) => a + r.latencyMs, 0) / rs.length / 1000;
              const passed = rs.every((r) => r.correct) && sec <= targetSec(LEVEL[levelId], 2, opts);
              const out = applyReview(item, passed, date);
              p.reviews = p.reviews.filter((r) => r.levelId !== levelId).concat(out.item ? [out.item] : []);
              if (out.demoted) p.progress[levelId] = demote(lpOf(p.progress, levelId));
              summary.reviews.push({ levelId, passed, demoted: out.demoted });
            }
            attemptResult = run.interrupted ? "interrupted" : summary.reviews.every((r) => r.passed) ? "pass" : "fail";
          } else if (run.kind === "stage_check" && run.stage !== undefined && !run.interrupted) {
            const passed = errors <= RULE_NUMBERS.stageCheckMaxMisses && perProblemSec <= t2;
            p.stageChecks[run.stage] = { date, passed };
            if (!passed) {
              const misses = new Map<string, number>();
              run.results.filter((r) => !r.correct).forEach((r) => misses.set(r.inst.levelId, (misses.get(r.inst.levelId) ?? 0) + 1));
              const max = Math.max(0, ...misses.values());
              for (const [levelId, m] of misses)
                if (m === max && hasStar2(lpOf(p.progress, levelId)) && !isMastered(lpOf(p.progress, levelId)))
                  p.progress[levelId] = { ...lpOf(p.progress, levelId), priority: true };
            }
            summary.stageCheck = { stage: run.stage, passed };
            attemptResult = passed ? "pass" : "fail";
          } else if (run.kind === "placement" && p.placement && !run.interrupted) {
            let st = run.placementPhase === "stageCheck" ? applyStageCheck(p.placement, errors, perProblemSec, t2, t3) : applyMiniCheck(p.placement, errors, perProblemSec, t2);
            st = addPlacementTime(st, date, run.activeSec);
            if (st.phase === "done") {
              const applied = applyPlacementResult(st, date);
              p.progress = applied.progress;
              p.reviews = applied.reviews;
              const outcome = placementOutcome(applied, date);
              p.stageChecks = outcome.stageChecks;
              p.rewardBaseline = outcome.rewardBaseline;
              p.placementDone = true;
            }
            p.placement = st;
            summary.placement = st;
            attemptResult = errors <= RULE_NUMBERS.stageCheckMaxMisses ? "pass" : "fail";
          } else if (run.kind === "placement" && p.placement) {
            p.placement = addPlacementTime(p.placement, date, run.activeSec);
            summary.placement = p.placement;
          } else if (run.kind === "challenge") {
            const isNew = !run.interrupted && errors === 0 && (p.challenge.bestSec === null || perProblemSec < p.challenge.bestSec);
            p.challenge = { lastDate: date, bestSec: isNew ? perProblemSec : p.challenge.bestSec };
            summary.challengeBest = { sec: p.challenge.bestSec, isNew };
          }
          if (run.interrupted) attemptResult = "interrupted";

          if (run.sessionPart !== undefined && p.sessions[date]) {
            const d = p.sessions[date];
            const done = Math.max(d.done, run.sessionPart + 1);
            const goal = d.goal || done >= d.plan.length;
            summary.goalReached = goal && !d.goal;
            p.sessions[date] = { ...d, done, goal };
          }

          p.sets = [
            ...p0.sets,
            {
              id: `${Date.now().toString(36)}${p0.sets.length}`,
              kind: run.kind,
              levelId: run.levelId,
              mode: run.mode,
              date,
              startedAt: Date.now(),
              n,
              errors,
              perProblemSec,
              target2: t2,
              target3: t3,
              result: attemptResult,
            },
          ].slice(-600);

          const after = unlockedRewards(rewardStats(p));
          summary.newRewards = after.filter((id) => !rewardsBefore.has(id));
          const wear = REWARDS.find((r) => r.wear && summary.newRewards.includes(r.id));
          if (wear) p.wearing = wear.id;

          set((st) => ({ profiles: st.profiles.map((q) => (q.id === p.id ? p : q)) }));
          return summary;
        },

        setDev: (patch) => set((s) => ({ dev: { ...s.dev, ...patch } })),
      };
    },
    {
      name: "hamzan-anzan-v2",
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ pin: s.pin, profiles: s.profiles, activeId: s.activeId, dev: s.dev }),
    },
  ),
);

