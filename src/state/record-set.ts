import { diffDays, type LocalDate } from "@/domain/dates";
import { classifyError } from "@/domain/errors";
import { judgeSet, starsOf } from "@/domain/judge";
import { addPlacementTime, applyMiniCheck, applyPlacementResult, applyStageCheck } from "@/domain/placement";
import { applySetResult, demote, hasStar2, isMastered, lpOf } from "@/domain/progression";
import { applyReview, scheduleOnMastery } from "@/domain/review";
import { LEVEL, RULE_NUMBERS, SPEC } from "@/domain/spec";
import { mixedTargetSec, targetSec } from "@/domain/timing";
import { REWARDS, unlockedRewards } from "@/game/achievements";
import { placementOutcome, rewardStats, timeOpts } from "./profile";
import type { Profile, ProblemResult, SetAttempt, SetRun, SetSummary } from "./types";

const MAX_SETS = 600;
const MAX_FACTS = 4000;
const ERROR_KEEP_DAYS = 60;

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Records one finished (or interrupted) set. Pure: returns a new profile and the summary for the result screen. */
export function recordSet(p0: Profile, run: SetRun, ctx: { date: LocalDate; now: number }): { profile: Profile; summary: SetSummary } {
  const { date, now } = ctx;
  const opts = timeOpts(p0);
  const rewardsBefore = new Set(unlockedRewards(rewardStats(p0)));
  const p: Profile = {
    ...p0,
    progress: { ...p0.progress },
    facts: { ...p0.facts },
    errors: p0.errors.filter((e) => diffDays(date, e.date) <= ERROR_KEEP_DAYS),
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
  if (factKeys.length > MAX_FACTS)
    factKeys
      .sort((a, b) => p.facts[a].lastSeen.localeCompare(p.facts[b].lastSeen))
      .slice(0, factKeys.length - MAX_FACTS)
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
    let st =
      run.placementPhase === "stageCheck" ? applyStageCheck(p.placement, errors, perProblemSec, t2, t3) : applyMiniCheck(p.placement, errors, perProblemSec, t2);
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
      id: `${now.toString(36)}${p0.sets.length}`,
      kind: run.kind,
      levelId: run.levelId,
      mode: run.mode,
      date,
      startedAt: now,
      n,
      errors,
      perProblemSec,
      target2: t2,
      target3: t3,
      result: attemptResult,
    },
  ].slice(-MAX_SETS);

  const after = unlockedRewards(rewardStats(p));
  summary.newRewards = after.filter((id) => !rewardsBefore.has(id));
  const wear = REWARDS.find((r) => r.wear && summary.newRewards.includes(r.id));
  if (wear) p.wearing = wear.id;

  return { profile: p, summary };
}
