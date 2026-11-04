import { lpAny } from "@/course/progress";
import { hasStar2 } from "@/domain/progression";
import { ResultScreen } from "@/features/result/result-screen";
import { levelPlan } from "@/session/requests";
import { useSessionRunner } from "@/session/use-session-runner";
import { usePlayStore } from "@/state/play-store";
import { todayOf } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Notice } from "@/ui/notice";

export default function ResultRoute() {
  const summary = usePlayStore((s) => s.summary);
  const ctx = usePlayStore((s) => s.resultCtx);
  const profile = useAppStore((s) => activeProfile(s));
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const runner = useSessionRunner();
  if (!summary || !ctx || !profile) return <Notice text="けっかが ありません" actionLabel="ホームへ" onAction={runner.goHome} />;

  // a diagnosis set goes back to the diagnosis screen, which opened it
  if (ctx.kind === "placement")
    return <ResultScreen summary={summary} title={ctx.title} wear={profile.wearing} nextLabel="つぎへ" onNext={runner.quit} onRetry={null} onHome={runner.quit} />;

  const day = profile.sessions[ctx.sessionDate ?? todayOf(dayOffset)];
  const moreInSession = ctx.inSession && !!day && day.done < day.plan.length;
  const levelId = ctx.kind === "extra" || ctx.kind === "main" ? ctx.levelId : null;
  const retry = levelId
    ? () => {
        const p = activeProfile(useAppStore.getState());
        if (!p) return;
        const lp = lpAny(p.progress, levelId);
        runner.startPlan(levelPlan(p, levelId, hasStar2(lp) ? "S" : lp.mode, todayOf(dayOffset), "extra"), true);
      }
    : null;

  return (
    <ResultScreen
      summary={summary}
      title={ctx.title}
      wear={profile.wearing}
      nextLabel={moreInSession ? "つぎへ" : null}
      onNext={() => runner.startNextPart(true)}
      onRetry={retry}
      onHome={runner.goHome}
    />
  );
}
