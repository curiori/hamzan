import type { PinRecord, Profile } from "@/state/types";

export type OnboardingStep = "setup" | "firstSteps" | "placement";

/** The first-run screen a family still needs (decided like the web prototype's home page), or null for the map. */
export function onboardingStep(pin: PinRecord | null, p: Profile | null): OnboardingStep | null {
  if (!pin || !p) return "setup";
  if (!p.writeTestedAt && !p.placementDone && !p.placement) return "firstSteps";
  if (!p.placementDone || !p.placementSeen) return "placement";
  return null;
}
