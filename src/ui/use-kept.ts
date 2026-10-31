import { useRef } from "react";

/**
 * `value` when it is not null; while it is null, the last value that was not (null if there has been none). A closing
 * dialog or sheet shows this, so it goes away with what it showed. Kept in a ref, not state, so a caller that passes a
 * new object on every render does not cause another render.
 */
export function useKept<T>(value: T | null): T | null {
  const kept = useRef<T | null>(null);
  if (value !== null) kept.current = value;
  return value ?? kept.current;
}
