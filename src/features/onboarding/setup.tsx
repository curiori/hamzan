import { useState } from "react";
import { useAppStore } from "@/state/store";
import { ChildForm } from "./child-form";
import { Intro } from "./intro";
import { PinPad } from "./pin-pad";

/** First run for the parent: the intro, the PIN typed twice, then the first child. */
export function Setup() {
  const hasPin = useAppStore((s) => !!s.pin);
  const setPin = useAppStore((s) => s.setPin);
  const addProfile = useAppStore((s) => s.addProfile);
  const [step, setStep] = useState<"intro" | "pin" | "pin2" | "child">(hasPin ? "child" : "intro");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  if (step === "intro") return <Intro onNext={() => setStep("pin")} />;
  if (step === "pin")
    return (
      <PinPad
        key="pin"
        title="保護者用のPIN（4桁）"
        note="お子さまに見えないように入力してください"
        error={pinError}
        onComplete={(p) => {
          setFirstPin(p);
          setPinError(null);
          setStep("pin2");
        }}
      />
    );
  if (step === "pin2")
    return (
      <PinPad
        key="pin2"
        title="もう一度 入力してください"
        error={pinError}
        onComplete={(p) => {
          if (p !== firstPin) {
            setPinError("一致しませんでした。最初からやり直してください");
            setStep("pin");
            return;
          }
          setPin(p);
          setStep("child");
        }}
      />
    );
  // the first-run screen moves on by itself once the child exists
  return <ChildForm onSubmit={(nickname, grade) => addProfile(nickname, grade)} />;
}
