import { PlayScreen } from "@/features/play/play-screen";
import { useSessionRunner } from "@/session/use-session-runner";
import { usePlayStore } from "@/state/play-store";
import { activeProfile, useAppStore } from "@/state/store";
import { Notice } from "@/ui/notice";

export default function PlayRoute() {
  const plan = usePlayStore((s) => s.plan);
  const profile = useAppStore((s) => activeProfile(s));
  const runner = useSessionRunner();
  if (!plan || !profile) return <Notice text="ひらける もんだいが ありません" actionLabel="ホームへ" onAction={runner.goHome} />;
  return <PlayScreen key={plan.req.key} req={plan.req} settings={profile.settings} wear={profile.wearing} onFinish={runner.finish} onQuit={runner.quit} />;
}
