export const PIN_LENGTH = 4;

export interface PinEntry {
  pin: string;
  /** the PIN is complete and about to be handed over; keys are ignored */
  locked: boolean;
}

export const emptyPin = (): PinEntry => ({ pin: "", locked: false });

/** One key on the PIN pad; `complete` is the PIN when this key was its last digit. */
export function pinPress(s: PinEntry, key: string): { state: PinEntry; complete: string | null } {
  if (s.locked) return { state: s, complete: null };
  if (key === "del") return { state: { ...s, pin: s.pin.slice(0, -1) }, complete: null };
  if (!/^\d$/.test(key)) return { state: s, complete: null };
  const pin = (s.pin + key).slice(0, PIN_LENGTH);
  if (pin.length < PIN_LENGTH) return { state: { pin, locked: false }, complete: null };
  return { state: { pin, locked: true }, complete: pin };
}
