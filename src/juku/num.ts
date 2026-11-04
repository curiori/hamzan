// Exact decimals and fractions for the juku.json levels. Answers never go through floating point:
// a decimal is an integer with a count of digits after the point.

/** value = n / 10^s, with s ≥ 0 and n a safe integer */
export interface Dec {
  n: number;
  s: number;
}

/** a fraction n/d (d > 0); improper fractions are allowed */
export interface Frac {
  n: number;
  d: number;
}

/** a mixed number w と n/d (w ≥ 0, n < d unless written wrongly by a child) */
export interface Mixed {
  w: number;
  n: number;
  d: number;
}

const pow10 = (k: number) => 10 ** k;

/** Drops trailing zeros after the point: 94.20 → 94.2, 12.00 → 12. */
export function norm(x: Dec): Dec {
  let { n, s } = x;
  while (s > 0 && n % 10 === 0) {
    n /= 10;
    s -= 1;
  }
  return { n, s };
}

/** "3.14", "0.5", ".5", "1200", "15.70", "007", "1200." → a decimal; null for anything else. */
export function parseDec(text: string): Dec | null {
  const m = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!m) return null;
  const whole = m[1];
  const frac = m[2] ?? "";
  if (whole === "" && frac === "") return null;
  const n = Number((whole || "0") + frac);
  if (!Number.isSafeInteger(n)) return null;
  return norm({ n, s: frac.length });
}

/** A decimal from its written form; throws on a typo in the program. */
export function dec(text: string): Dec {
  const d = parseDec(text);
  if (!d) throw new Error(`not a decimal: ${text}`);
  return d;
}

export const decInt = (n: number): Dec => ({ n, s: 0 });

/** The written form without trailing zeros: "21.98", "94.2", "1200", "0.02". */
export function decText(x: Dec): string {
  const { n, s } = norm(x);
  if (s === 0) return String(n);
  const digits = String(Math.abs(n)).padStart(s + 1, "0");
  const t = `${digits.slice(0, -s)}.${digits.slice(-s)}`;
  return n < 0 ? `-${t}` : t;
}

/** Brings two decimals to the same number of places. */
function align(a: Dec, b: Dec): [number, number, number] {
  const s = Math.max(a.s, b.s);
  return [a.n * pow10(s - a.s), b.n * pow10(s - b.s), s];
}

export const mulDec = (a: Dec, b: Dec): Dec => norm({ n: a.n * b.n, s: a.s + b.s });

export function addDec(a: Dec, b: Dec): Dec {
  const [x, y, s] = align(a, b);
  return norm({ n: x + y, s });
}

export function subDec(a: Dec, b: Dec): Dec {
  const [x, y, s] = align(a, b);
  return norm({ n: x - y, s });
}

export function cmpDec(a: Dec, b: Dec): number {
  const [x, y] = align(a, b);
  return x === y ? 0 : x < y ? -1 : 1;
}

export const eqDec = (a: Dec, b: Dec) => cmpDec(a, b) === 0;

/** × 10^k (k may be negative): the decimal point moves k places to the right. */
export function shiftDec(a: Dec, k: number): Dec {
  if (k >= 0) {
    const drop = Math.min(k, a.s);
    return norm({ n: a.n * pow10(k - drop), s: a.s - drop });
  }
  return norm({ n: a.n, s: a.s - k });
}

/** a ÷ b when the quotient ends within `maxPlaces` places after the point, else null. */
export function divDec(a: Dec, b: Dec, maxPlaces = 8): Dec | null {
  if (b.n === 0) return null;
  // a / b = (a.n · 10^b.s) / (b.n · 10^a.s)
  const den = b.n * pow10(a.s);
  for (let k = 0; k <= maxPlaces; k++) {
    const num = a.n * pow10(b.s + k);
    if (!Number.isSafeInteger(num)) return null;
    if (num % den === 0) return norm({ n: num / den, s: k });
  }
  return null;
}

/** Only for sizes (estimation, logs); answers stay exact. */
export const decValue = (a: Dec) => a.n / pow10(a.s);

export const isWhole = (a: Dec) => norm(a).s === 0;

/** Characters a child types for the decimal: digits and the point ("21.98" → 5). */
export const decLength = (a: Dec) => decText(a).replace("-", "").length;

/** a / b is 10^k for a whole k other than 0 (the point moved); returns k or null. */
export function powerOfTenRatio(a: Dec, b: Dec): number | null {
  if (a.n === 0 || b.n === 0 || Math.sign(a.n) !== Math.sign(b.n)) return null;
  for (let k = -6; k <= 6; k++) if (k !== 0 && eqDec(a, shiftDec(b, k))) return k;
  return null;
}

// ---------------- fractions ----------------
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export function reduceFrac(f: Frac): Frac {
  const g = gcd(f.n, f.d) || 1;
  return { n: f.n / g, d: f.d / g };
}

export const isReduced = (f: Frac) => gcd(f.n, f.d) === 1;

/** n/d as one fraction (2と3/4 → 11/4). */
export const improperOf = (m: Mixed): Frac => ({ n: m.w * m.d + m.n, d: m.d });

/** 17/5 → 3と2/5 (the whole part may be 0). */
export const mixedOf = (f: Frac): Mixed => ({ w: Math.floor(f.n / f.d), n: f.n % f.d, d: f.d });

export const fracEq = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;

/** The decimal of a fraction whose decimal ends (denominator made of 2s and 5s), else null. */
export const fracToDec = (f: Frac): Dec | null => divDec(decInt(f.n), decInt(f.d));

/** 0.375 → 3/8 (reduced). */
export function decToFrac(a: Dec): Frac {
  const x = norm(a);
  return reduceFrac({ n: x.n, d: pow10(x.s) });
}

/** "3/4", "11/4", "3と2/5" */
export function fracText(m: Mixed): string {
  return m.w ? `${m.w}と${m.n}/${m.d}` : `${m.n}/${m.d}`;
}
