import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/** Calls onChange(false) when the app leaves the foreground (background or iOS "inactive": app switcher,
 * Control Center, a call) and onChange(true) when it is active again. */
export function useAppActive(onChange: (active: boolean) => void) {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => latest.current(state === "active"));
    return () => sub.remove();
  }, []);
}
