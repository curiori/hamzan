// Short sounds (Web Audio) and vibration; both can be switched off by a parent.
let audio: AudioContext | null = null;

function beep(notes: number[], step: number, type: OscillatorType = "sine") {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = t0 + i * step;
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step + 0.08);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + step + 0.1);
    });
  } catch {
    // audio unavailable
  }
}

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // vibration unavailable
  }
}

export type Cue = "ok" | "miss" | "clear" | "tap";

export function cue(kind: Cue, opts: { sound: boolean; vibration: boolean }) {
  if (opts.sound) {
    if (kind === "ok") beep([880, 1318], 0.07);
    else if (kind === "miss") beep([330, 262], 0.12, "triangle");
    else if (kind === "clear") beep([523, 659, 784, 1047], 0.11, "triangle");
  }
  if (opts.vibration) {
    if (kind === "miss") buzz([60, 40, 60]);
    else if (kind === "ok") buzz(15);
    else if (kind === "clear") buzz([20, 30, 20, 30, 40]);
  }
}
