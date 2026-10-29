// Seeded pseudo-random numbers (mulberry32) and string hashing for set seeds.
// Domain code never calls Math.random(): an Rng is always passed in.

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [lo, hi] (inclusive), like Python's random.randint */
  int(lo: number, hi: number): number;
  /** one element, like Python's random.choice */
  pick<T>(xs: readonly T[]): T;
  /** in-place Fisher–Yates shuffle, like Python's random.shuffle; returns the same array */
  shuffle<T>(xs: T[]): T[];
}

export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    shuffle: (xs) => {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    },
  };
}

/** 32-bit string hash (cyrb53, folded to 32 bits). */
export function hashString(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 & 0x1fffff) * 4294967296 + (h1 >>> 0)) >>> 0;
}

/** seed = hash(parts...) — e.g. seedOf(profileId, levelId, localDate, setIndex) */
export function seedOf(...parts: (string | number)[]): number {
  return hashString(parts.join("\u0001"));
}
