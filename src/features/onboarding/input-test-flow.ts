import { SPEC } from "@/domain/spec";

// The key-speed test before the diagnosis (web prototype's InputTest): type each 2-digit number as shown.
// Seconds per digit of the right items set the child's writing time.

export interface InputTestState {
  items: number[];
  idx: number;
  typed: string;
  /** when the current item's time starts */
  shownAt: number;
  samples: number[];
  /** set when the test is over: the samples, or the last time when no item was right */
  done: number[] | null;
}

const NEXT_ITEM_DELAY_MS = 100;

export function inputTestItems(random: () => number = Math.random): number[] {
  const { items, itemDigits } = SPEC.timeModel.inputSpeedTest;
  return Array.from({ length: items }, () => 10 ** (itemDigits - 1) + Math.floor(random() * 9 * 10 ** (itemDigits - 1)));
}

export const startInputTest = (items: number[], now: number): InputTestState => ({ items, idx: 0, typed: "", shownAt: now, samples: [], done: null });

export function pressInputKey(s: InputTestState, key: string, now: number): InputTestState {
  if (s.done) return s;
  if (key === "del") return { ...s, typed: s.typed.slice(0, -1) };
  if (!/^\d$/.test(key)) return s;
  const want = String(s.items[s.idx]);
  const typed = (s.typed + key).slice(0, want.length);
  if (typed.length < want.length) return { ...s, typed };
  const sec = (now - s.shownAt) / 1000 / want.length;
  const samples = typed === want ? [...s.samples, sec] : s.samples;
  if (s.idx + 1 >= s.items.length) return { ...s, typed, samples, done: samples.length ? samples : [sec] };
  return { ...s, idx: s.idx + 1, typed: "", samples, shownAt: now + NEXT_ITEM_DELAY_MS };
}
