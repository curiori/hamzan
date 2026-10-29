import { useRouter } from "expo-router";
import { useCallback } from "react";
import { usePlayStore } from "@/state/play-store";
import { activeProfile, useAppStore } from "@/state/store";
import type { ProblemResult } from "@/state/types";
import { nextSessionPlan, type PlayPlan } from "./requests";

export interface PlayOutcome {
  results: ProblemResult[];
  interrupted: boolean;
  activeSec: number;
}

/** Moves the child through sets: today's session parts, single practice sets, the result screen and back. */
export function useSessionRunner() {
  const router = useRouter();

  const startPlan = useCallback(
    (plan: PlayPlan, replace = false) => {
      usePlayStore.getState().begin(plan);
      if (replace) router.replace("/play");
      else router.push("/play");
    },
    [router],
  );

  const goHome = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace("/");
  }, [router]);

  /** Next part of today's session; parts with nothing to ask are marked done. */
  const startNextPart = useCallback(
    (replace = false) => {
      const app = useAppStore.getState();
      const session = app.ensureSession();
      const p = activeProfile(useAppStore.getState());
      if (!session || !p) return goHome();
      const { plan, skipped } = nextSessionPlan(session.day, p, session.date, app.dev.unlockAll);
      skipped.forEach((i) => useAppStore.getState().skipSessionPart(i));
      if (plan) startPlan(plan, replace);
      else goHome();
    },
    [goHome, startPlan],
  );

  const finish = useCallback(
    (o: PlayOutcome) => {
      const { plan, summary: shown } = usePlayStore.getState();
      // a set is recorded once; the summary is cleared when the next set begins
      if (!plan || shown) return;
      const { ctx } = plan;
      const summary = useAppStore.getState().recordSet({
        kind: ctx.kind,
        mode: ctx.mode,
        levelId: ctx.levelId,
        results: o.results,
        interrupted: o.interrupted,
        fixedSet: ctx.fixed,
        sessionPart: ctx.sessionPart,
        sessionDate: ctx.sessionDate,
        stage: ctx.stage,
        placementPhase: ctx.placementPhase,
        activeSec: o.activeSec,
      });
      usePlayStore.getState().showResult(summary, ctx);
      router.replace("/result");
    },
    [router],
  );

  /** Leave a set without recording it. */
  const quit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  return { startPlan, startNextPart, finish, quit, goHome };
}
