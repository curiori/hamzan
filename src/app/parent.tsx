import { useRouter } from "expo-router";
import { useState } from "react";
import { ParentArea } from "@/features/parent/parent-area";
import { ParentGate } from "@/features/parent/parent-gate";

// Leaving this screen in any way locks it again: the unlocked state lives only while it is open.
export default function ParentRoute() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  if (!unlocked) return <ParentGate onUnlock={() => setUnlocked(true)} onBack={close} />;
  return <ParentArea onExit={close} />;
}
