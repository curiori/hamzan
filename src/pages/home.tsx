import { useCallback, useState } from "react";
import { LEVEL, SPEC, STAGES, validateSpec, type Mode } from "@/domain/spec";
import { seedOf } from "@/domain/rng";
import { buildMixed, buildSet, buildWarmup, spread } from "@/domain/setBuilder";
import { masteredLevels, resolveSlot, type SessionPart } from "@/domain/session";
import { hasStar2, lpOf } from "@/domain/progression";
import { KID_LEVEL_NAME, KID_STAGE_NAME, MODE_LABEL } from "@/i18n/ja";
import {
  activeProfile,
  setSeed,
  todayOf,
  useAppStore,
  warmupLevels,
  weakFacts,
  yesterdaysMisses,
  type Profile,
  type SetKind,
  type SetSummary,
} from "@/lib/store";
import { PlayScreen, type PlayOutcome, type PlayRequest } from "@/features/play";
import { ResultScreen } from "@/features/result";
import { HomeView, RoomView } from "@/features/home-view";
import { FirstSteps, Onboarding, PlacementView } from "@/features/onboarding";
import { ParentArea, ParentGate } from "@/features/parent";

const SPEC_ERRORS = validateSpec();

interface Ctx {
  kind: SetKind;
  levelId: string | null;
  mode: Mode;
  fixed?: boolean;
  sessionPart?: number;
  stage?: number;
  inSession: boolean;
  title: string;
}

function levelRequest(p: Profile, levelId: string, mode: Mode, date: string, kind: SetKind, sessionPart?: number): { req: PlayRequest; ctx: Ctx } {
  const { seed, fixed } = setSeed(p, levelId, mode, date);
  const lv = LEVEL[levelId];
  return {
    req: {
      key: `${levelId}-${seed}-${Date.now()}`,
      title: KID_LEVEL_NAME[levelId],
      subtitle: `${MODE_LABEL[mode]}・レベル ${levelId}`,
      mode,
      problems: buildSet(levelId, lv.setSize, seed, weakFacts(p, levelId, date)),
    },
    ctx: { kind, levelId, mode, fixed, sessionPart, inSession: sessionPart !== undefined, title: KID_LEVEL_NAME[levelId] },
  };
}

export function HomePage() {
  const profile = useAppStore((s) => activeProfile(s));
  const hasPin = useAppStore((s) => !!s.pin);
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const unlockAll = useAppStore((s) => s.dev.unlockAll);
  const recordSet = useAppStore((s) => s.recordSet);
  const ensureSession = useAppStore((s) => s.ensureSession);
  const skipSessionPart = useAppStore((s) => s.skipSessionPart);
  const saveInputTest = useAppStore((s) => s.saveInputTest);
  const beginPlacement = useAppStore((s) => s.beginPlacement);
  const ackPlacement = useAppStore((s) => s.ackPlacement);
  const [play, setPlay] = useState<{ req: PlayRequest; ctx: Ctx } | null>(null);
  const [result, setResult] = useState<{ summary: SetSummary; ctx: Ctx } | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const date = todayOf(dayOffset);
  // leaving the parent screen by any route locks it again
  if (screen !== "parent" && parentOpen) setParentOpen(false);

  const start = useCallback(
    (x: { req: PlayRequest; ctx: Ctx }) => {
      setResult(null);
      setPlay(x);
      setScreen("play");
      window.scrollTo({ top: 0 });
    },
    [setScreen],
  );

  const partRequest = useCallback(
    (part: SessionPart, idx: number, p: Profile): { req: PlayRequest; ctx: Ctx } | null => {
      if (part.kind === "warmup") {
        const levels = warmupLevels(p, unlockAll);
        const missed = yesterdaysMisses(p, date);
        if (!levels.length && !missed.length) return null;
        const problems = buildWarmup(levels, missed, seedOf(p.id, "warmup", date), 80);
        if (!problems.length) return null;
        return {
          req: { key: `w${date}`, title: "ウォームアップ", subtitle: `${SPEC.rules.dailySession.warmup.seconds}びょう・はんていなし`, mode: "S", problems, warmupSec: SPEC.rules.dailySession.warmup.seconds },
          ctx: { kind: "warmup", levelId: null, mode: "S", sessionPart: idx, inSession: true, title: "ウォームアップ" },
        };
      }
      if (part.kind === "slot") {
        const r = resolveSlot(part.slot, p.progress, unlockAll);
        return r ? levelRequest(p, r.levelId, r.mode, date, "main", idx) : null;
      }
      if (part.kind === "stageCheck") {
        if (p.stageChecks[part.stage]) return null;
        const sc = STAGES[part.stage].stageCheck;
        const seed = seedOf(p.id, "stageCheck", part.stage, date);
        return {
          req: { key: `sc${part.stage}${date}`, title: `ステージ${part.stage}「${KID_STAGE_NAME[part.stage]}」`, subtitle: "ステージチェック", mode: "S", problems: buildMixed(sc.levels, spread(sc.levels, sc.problems, seed), seed) },
          ctx: { kind: "stage_check", levelId: null, mode: "S", stage: part.stage, sessionPart: idx, inSession: true, title: "ステージチェック" },
        };
      }
      const levels = part.levelIds.filter((id) => p.reviews.some((r) => r.levelId === id));
      if (!levels.length) return null;
      const seed = seedOf(p.id, "review", date, idx);
      return {
        req: {
          key: `rv${date}${idx}`,
          title: levels.map((id) => KID_LEVEL_NAME[id]).join("・"),
          subtitle: "ふくしゅう",
          mode: "S",
          problems: buildMixed(levels, levels.map(() => SPEC.rules.spacedReview.problemsPerLevel), seed),
        },
        ctx: { kind: "review", levelId: null, mode: "S", sessionPart: idx, inSession: true, title: "ふくしゅう" },
      };
    },
    [date, unlockAll],
  );

  const nextSessionPart = useCallback(() => {
    const day = ensureSession();
    if (!day) return;
    for (let idx = day.done; idx < day.plan.length; idx++) {
      const p = activeProfile(useAppStore.getState());
      if (!p) return;
      const x = partRequest(day.plan[idx], idx, p);
      if (x) return start(x);
      skipSessionPart(idx);
    }
    setPlay(null);
    setResult(null);
    setScreen("home");
  }, [ensureSession, partRequest, skipSessionPart, start, setScreen]);

  const finish = (o: PlayOutcome) => {
    if (!play) return;
    const { ctx } = play;
    const summary = recordSet({
      kind: ctx.kind,
      mode: ctx.mode,
      levelId: ctx.levelId,
      results: o.results,
      interrupted: o.interrupted,
      fixedSet: ctx.fixed,
      sessionPart: ctx.sessionPart,
      stage: ctx.stage,
      activeSec: o.activeSec,
    });
    setPlay(null);
    setResult({ summary, ctx });
  };

  const goHome = () => {
    setPlay(null);
    setResult(null);
    setScreen("home");
  };

  if (SPEC_ERRORS.length)
    return (
      <section className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-xl font-black">カリキュラムの読み込みでエラーがあります</h1>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {SPEC_ERRORS.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>
    );

  if (!hasPin || !profile)
    return (
      <div id="work" tabIndex={-1} className="outline-none">
        <Onboarding />
      </div>
    );

  let body;
  if (screen === "parent")
    body = parentOpen ? (
      <ParentArea
        onExit={() => {
          setParentOpen(false);
          goHome();
        }}
      />
    ) : (
      <ParentGate onUnlock={() => setParentOpen(true)} onBack={goHome} />
    );
  else if (!profile.writeTestedAt && !profile.placementDone && !profile.placement)
    body = (
      <FirstSteps
        key={profile.id}
        nickname={profile.nickname}
        onDone={(s) => {
          saveInputTest(s);
          beginPlacement();
        }}
      />
    );
  else if ((!profile.placementDone || !profile.placementSeen) && screen !== "room")
    body = (
      <PlacementView
        onFinished={() => {
          ackPlacement();
          goHome();
        }}
      />
    );
  else if (screen === "room") body = <RoomView />;
  else if (screen === "play" && play)
    body = (
      <PlayScreen
        key={play.req.key}
        req={play.req}
        timer={profile.settings.timer}
        autoSubmit={profile.settings.autoSubmit}
        sound={profile.settings.sound}
        vibration={profile.settings.vibration}
        wear={profile.wearing}
        onFinish={finish}
        onQuit={goHome}
      />
    );
  else if (screen === "play" && result) {
    const { summary, ctx } = result;
    const day = profile.sessions[date];
    const moreInSession = ctx.inSession && !!day && day.done < day.plan.length;
    const canRetry = (ctx.kind === "extra" || ctx.kind === "main") && ctx.levelId;
    body = (
      <ResultScreen
        summary={summary}
        title={ctx.title}
        wear={profile.wearing}
        nextLabel={moreInSession ? "つぎへ" : null}
        onNext={nextSessionPart}
        onRetry={
          canRetry && ctx.levelId
            ? () => {
                const p = activeProfile(useAppStore.getState());
                const id = ctx.levelId as string;
                if (!p) return;
                const lp = lpOf(p.progress, id);
                start(levelRequest(p, id, hasStar2(lp) ? "S" : lp.mode, date, "extra"));
              }
            : null
        }
        onHome={goHome}
      />
    );
  } else
    body = (
      <HomeView
        date={date}
        onStartSession={nextSessionPart}
        onPractice={(levelId, mode) => start(levelRequest(profile, levelId, mode, date, "extra"))}
        onChallenge={() => {
          const mastered = masteredLevels(profile.progress);
          const seed = seedOf(profile.id, "challenge", date);
          const n = SPEC.rules.dailySession.weeklyChallenge.problems;
          start({
            req: { key: `ch${date}`, title: "チャレンジ", subtitle: "じこベストに ちょうせん", mode: "S", problems: buildMixed(mastered, spread(mastered, n, seed), seed) },
            ctx: { kind: "challenge", levelId: null, mode: "S", inSession: false, title: "チャレンジ" },
          });
        }}
      />
    );

  return (
    <div id="work" tabIndex={-1} className="flex h-full flex-col outline-none">
      {body}
    </div>
  );
}
