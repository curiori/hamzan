import { create } from "zustand";
import type { PlayContext, PlayPlan } from "@/session/requests";
import type { SetSummary } from "./types";

// The set being played and the summary of the last finished set. Lives in memory only; the play and
// result screens read it, so nothing has to travel through route parameters.

export interface PlayState {
  plan: PlayPlan | null;
  summary: SetSummary | null;
  resultCtx: PlayContext | null;
  begin: (plan: PlayPlan) => void;
  showResult: (summary: SetSummary, ctx: PlayContext) => void;
  clear: () => void;
}

export const usePlayStore = create<PlayState>()((set) => ({
  plan: null,
  summary: null,
  resultCtx: null,
  begin: (plan) => set({ plan, summary: null, resultCtx: null }),
  showResult: (summary, ctx) => set({ plan: null, summary, resultCtx: ctx }),
  clear: () => set({ plan: null, summary: null, resultCtx: null }),
}));
