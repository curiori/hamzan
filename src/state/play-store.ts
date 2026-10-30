import { create } from "zustand";
import type { PlayContext, PlayPlan } from "@/session/requests";
import type { SetSummary } from "./types";

// The set being played and the summary of the last finished set. Lives in memory only; the play and
// result screens read it, so nothing has to travel through route parameters. Each screen keeps its
// picture while the next one slides in: the plan stays after the set ends, and the summary stays
// after the next set begins.

/** a second start this soon after the last one is a double tap, not a new set */
export const START_GUARD_MS = 1000;

export interface PlayState {
  plan: PlayPlan | null;
  summary: SetSummary | null;
  resultCtx: PlayContext | null;
  /** the current plan's set has been recorded; a second finish of the same set is ignored */
  recorded: boolean;
  startedAt: number;
  /** false when a set began less than START_GUARD_MS ago */
  begin: (plan: PlayPlan, now?: number) => boolean;
  showResult: (summary: SetSummary, ctx: PlayContext) => void;
  clear: () => void;
}

export const usePlayStore = create<PlayState>()((set, get) => ({
  plan: null,
  summary: null,
  resultCtx: null,
  recorded: false,
  startedAt: -Infinity,
  begin: (plan, now = Date.now()) => {
    if (now - get().startedAt < START_GUARD_MS) return false;
    set({ plan, recorded: false, startedAt: now });
    return true;
  },
  showResult: (summary, ctx) => set({ summary, resultCtx: ctx, recorded: true }),
  clear: () => set({ plan: null, summary: null, resultCtx: null, recorded: false }),
}));
