import { describe, expect, test } from "bun:test";
import { onboardingStep } from "@/features/onboarding/gate";
import { pressInputKey, startInputTest } from "@/features/onboarding/input-test-flow";
import { emptyPin, pinPress } from "@/features/onboarding/pin-entry";
import { startPlacement } from "@/domain/placement";
import { newProfile } from "@/state/profile";

const pin = { hash: "h", salt: "s" };
const child = () => newProfile("たろう", 3, { now: 0, random: () => 0.5 });

describe("onboardingStep", () => {
  test("setup until there is a PIN and a child", () => {
    expect(onboardingStep(null, null)).toBe("setup");
    expect(onboardingStep(pin, null)).toBe("setup");
    expect(onboardingStep(null, child())).toBe("setup");
  });
  test("a new child practices the keys first", () => {
    expect(onboardingStep(pin, child())).toBe("firstSteps");
  });
  test("then the diagnosis, until its end screen was seen", () => {
    const p = { ...child(), writeTestedAt: "2026-10-29" };
    expect(onboardingStep(pin, p)).toBe("placement");
    expect(onboardingStep(pin, { ...p, placementDone: true })).toBe("placement");
    expect(onboardingStep(pin, { ...p, placementDone: true, placementSeen: true })).toBeNull();
  });
  test("an open diagnosis continues even without the key practice", () => {
    expect(onboardingStep(pin, { ...child(), placement: startPlacement(3) })).toBe("placement");
  });
});

describe("pinPress", () => {
  test("the fourth digit completes the PIN once and later keys are ignored", () => {
    let s = emptyPin();
    for (const k of ["1", "2", "3"]) s = pinPress(s, k).state;
    const fourth = pinPress(s, "4");
    expect(fourth.complete).toBe("1234");
    const extra = pinPress(fourth.state, "5");
    expect(extra.complete).toBeNull();
    expect(extra.state).toEqual(fourth.state);
  });
  test("del removes the last digit", () => {
    let s = emptyPin();
    for (const k of ["1", "2"]) s = pinPress(s, k).state;
    expect(pinPress(s, "del").state.pin).toBe("1");
  });
});

describe("input test", () => {
  test("only right items become samples, timed per digit from when the item is shown", () => {
    let s = startInputTest([12, 34], 1000);
    s = pressInputKey(s, "1", 1500);
    s = pressInputKey(s, "2", 2000);
    expect(s.idx).toBe(1);
    expect(s.samples).toEqual([0.5]);
    expect(s.shownAt).toBe(2100);
    s = pressInputKey(s, "3", 2600);
    s = pressInputKey(s, "5", 3100);
    expect(s.done).toEqual([0.5]);
  });
  test("with no right item the last time is used", () => {
    let s = startInputTest([12], 0);
    s = pressInputKey(s, "9", 500);
    s = pressInputKey(s, "9", 1000);
    expect(s.done).toEqual([0.5]);
  });
  test("del edits the typed digits and keys after the end are ignored", () => {
    let s = startInputTest([12], 0);
    s = pressInputKey(s, "1", 100);
    s = pressInputKey(s, "del", 200);
    expect(s.typed).toBe("");
    s = pressInputKey(s, "1", 300);
    s = pressInputKey(s, "2", 400);
    expect(pressInputKey(s, "3", 500)).toBe(s);
  });
});
