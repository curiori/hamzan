import { Redirect } from "expo-router";
import { FirstSteps } from "@/features/onboarding/first-steps";
import { OnboardingFrame } from "@/features/onboarding/frame";
import { onboardingStep } from "@/features/onboarding/gate";
import { PlacementView } from "@/features/onboarding/placement-view";
import { Setup } from "@/features/onboarding/setup";
import { useSessionRunner } from "@/session/use-session-runner";
import { activeProfile, useAppStore } from "@/state/store";

export default function OnboardingRoute() {
  const step = useAppStore((s) => onboardingStep(s.pin, activeProfile(s)));
  const profile = useAppStore((s) => activeProfile(s));
  const saveInputTest = useAppStore((s) => s.saveInputTest);
  const beginPlacement = useAppStore((s) => s.beginPlacement);
  const ackPlacement = useAppStore((s) => s.ackPlacement);
  const runner = useSessionRunner();

  if (!step) return <Redirect href="/" />;
  return (
    // once a child exists: switch children (a sibling mid-diagnosis) and reach the parent area
    <OnboardingFrame header={step !== "setup" && !!profile}>
      {step === "setup" || !profile ? (
        <Setup />
      ) : step === "firstSteps" ? (
        <FirstSteps
          key={profile.id}
          nickname={profile.nickname}
          onDone={(perDigitSec) => {
            saveInputTest(profile.id, perDigitSec);
            beginPlacement();
          }}
        />
      ) : (
        // the diagnosis sets open over this screen and come back to it
        <PlacementView key={profile.id} onStart={(plan) => runner.startPlan(plan)} onFinished={ackPlacement} />
      )}
    </OnboardingFrame>
  );
}
