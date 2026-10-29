// An Rng that reproduces CPython's random.Random(seed) exactly (MT19937, init_by_array,
// random() = genrand_res53, randint/choice/shuffle via _randbelow_with_getrandbits).
// Running the TS generators on it must give the same problems as reference_generators.py
// with random.Random(seed): this proves ranges, branches AND the order of Rng calls match.
import type { Rng } from "../../src/domain/rng.ts";

export function pyRandom(seed: number): Rng {
  const N = 624;
  const mt = new Uint32Array(N);
  let mti = N + 1;

  const initGenrand = (s: number) => {
    mt[0] = s >>> 0;
    for (mti = 1; mti < N; mti++) {
      const prev = mt[mti - 1] ^ (mt[mti - 1] >>> 30);
      mt[mti] = (Math.imul(1812433253, prev) + mti) >>> 0;
    }
  };

  const initByArray = (key: number[]) => {
    initGenrand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, key.length); k; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  };

  const genrand = (): number => {
    if (mti >= N) {
      for (let kk = 0; kk < N; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[(kk + 1) % N] & 0x7fffffff);
        mt[kk] = mt[(kk + 397) % N] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      mti = 0;
    }
    let y = mt[mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  };

  // seed: abs(int) split into 32-bit words, least significant first (at least one word)
  const key: number[] = [];
  for (let n = Math.abs(seed); n > 0; n = Math.floor(n / 2 ** 32)) key.push(n % 2 ** 32);
  initByArray(key.length ? key : [0]);

  const getrandbits = (k: number) => genrand() >>> (32 - k);
  const randbelow = (n: number): number => {
    const k = n.toString(2).length;
    let r = getrandbits(k);
    while (r >= n) r = getrandbits(k);
    return r;
  };

  return {
    next: () => {
      const a = genrand() >>> 5;
      const b = genrand() >>> 6;
      return (a * 67108864 + b) / 9007199254740992;
    },
    int: (lo, hi) => lo + randbelow(hi - lo + 1),
    pick: (xs) => xs[randbelow(xs.length)],
    shuffle: (xs) => {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = randbelow(i + 1);
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    },
  };
}
