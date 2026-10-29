// Renders the web prototype's Web Audio cues into WAV files for expo-audio.
// Run: bun run scripts/make-sounds.ts  (writes assets/sounds/{ok,miss,clear}.wav)

type Wave = "sine" | "triangle";

const PEAK = 0.15;
const FLOOR = 0.0001;
const ATTACK = 0.02;
const RELEASE_TAIL = 0.08;
const STOP_TAIL = 0.1;

/** Same envelope as the web cue: 0.0001 → 0.15 in 20 ms, → 0.0001 at step + 80 ms, stop at step + 100 ms. */
function gainAt(t: number, step: number): number {
  if (t < 0 || t >= step + STOP_TAIL) return 0;
  if (t < ATTACK) return FLOOR * (PEAK / FLOOR) ** (t / ATTACK);
  const fall = step + RELEASE_TAIL - ATTACK;
  if (t < ATTACK + fall) return PEAK * (FLOOR / PEAK) ** ((t - ATTACK) / fall);
  return FLOOR;
}

const oscillator = (type: Wave, phase: number) => (type === "sine" ? Math.sin(phase) : (2 / Math.PI) * Math.asin(Math.sin(phase)));

export function renderTones(notes: number[], step: number, type: Wave, sampleRate = 44100): Int16Array {
  const total = notes.length * step + STOP_TAIL;
  const out = new Int16Array(Math.ceil(total * sampleRate));
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    let v = 0;
    notes.forEach((f, n) => {
      const local = t - n * step;
      const g = gainAt(local, step);
      if (g) v += g * oscillator(type, 2 * Math.PI * f * local);
    });
    out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }
  return out;
}

export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, s, true));
  return bytes;
}

export const CUES: Record<"ok" | "miss" | "clear", { notes: number[]; step: number; type: Wave }> = {
  ok: { notes: [880, 1318], step: 0.07, type: "sine" },
  miss: { notes: [330, 262], step: 0.12, type: "triangle" },
  clear: { notes: [523, 659, 784, 1047], step: 0.11, type: "triangle" },
};

if (import.meta.main) {
  const sampleRate = 44100;
  for (const [name, c] of Object.entries(CUES)) {
    const path = new URL(`../assets/sounds/${name}.wav`, import.meta.url);
    await Bun.write(path, encodeWav(renderTones(c.notes, c.step, c.type, sampleRate), sampleRate));
    console.log(`wrote ${name}.wav`);
  }
}
