import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { challengeAvailable } from "@/domain/session";
import { LevelSheet } from "@/features/home/level-sheet";
import { StageMap } from "@/features/home/stage-map";
import { ChallengeCard, TodayCard } from "@/features/home/today-card";
import { challengePlan, levelPlan } from "@/session/requests";
import { useSessionRunner } from "@/session/use-session-runner";
import { todayOf } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { colors } from "@/ui/theme";

export default function MapScreen() {
  const profile = useAppStore((s) => activeProfile(s));
  const unlockAll = useAppStore((s) => s.dev.unlockAll);
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const runner = useSessionRunner();
  const [openLevel, setOpenLevel] = useState<string | null>(null);
  if (!profile) return null;
  const date = todayOf(dayOffset);

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TodayCard profile={profile} date={date} unlockAll={unlockAll} onStart={() => runner.startNextPart()} />
        {challengeAvailable(profile.progress, profile.challenge.lastDate, date) ? (
          <ChallengeCard bestSec={profile.challenge.bestSec} onStart={() => runner.startPlan(challengePlan(profile, date))} />
        ) : null}
        <StageMap profile={profile} unlockAll={unlockAll} onOpen={setOpenLevel} />
      </ScrollView>
      <LevelSheet
        levelId={openLevel}
        profile={profile}
        unlockAll={unlockAll}
        onClose={() => setOpenLevel(null)}
        onPractice={(id, mode) => {
          setOpenLevel(null);
          runner.startPlan(levelPlan(profile, id, mode, date, "extra"));
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
});
