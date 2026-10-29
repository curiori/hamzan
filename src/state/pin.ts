import { hashString } from "@/domain/rng";

/** Parental gate PIN hash (same as the web prototype). A 4-digit PIN is a gate for children, not a secret. */
export function hashPin(pin: string, salt: string): string {
  let h = `${salt}:${pin}`;
  for (let i = 0; i < 2000; i++) h = hashString(h + salt).toString(36);
  return h;
}

export function makeSalt(random: () => number = Math.random): string {
  return random().toString(36).slice(2, 10);
}
