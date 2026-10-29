import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useId } from "react";

/** Keeps the screen on while mounted. Unlike useKeepAwake, a failure (web without the Wake Lock API) is ignored. */
export function useScreenAwake() {
  const tag = useId();
  useEffect(() => {
    let cancelled = false;
    let active = false;
    activateKeepAwakeAsync(tag)
      .then(() => {
        if (cancelled) deactivateKeepAwake(tag).catch(() => {});
        else active = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (active) deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tag]);
}
