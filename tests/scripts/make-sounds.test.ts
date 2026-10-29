import { describe, expect, test } from "bun:test";
import { encodeWav, renderTones } from "../../scripts/make-sounds";

const peakOf = (samples: Int16Array) => samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0) / 32767;

describe("make-sounds", () => {
  test("renderTones lasts until the last note fades out", () => {
    const sampleRate = 8000;
    const out = renderTones([880, 1318], 0.07, "sine", sampleRate);
    expect(out.length).toBe(Math.ceil((2 * 0.07 + 0.1) * sampleRate));
  });

  test("renderTones peaks near 0.15 of full scale", () => {
    for (const [notes, step, type] of [
      [[880, 1318], 0.07, "sine"],
      [[330, 262], 0.12, "triangle"],
      [[523, 659, 784, 1047], 0.11, "triangle"],
    ] as const) {
      const peak = peakOf(renderTones([...notes], step, type));
      expect(peak).toBeGreaterThan(0.12);
      expect(peak).toBeLessThan(0.2);
    }
  });

  test("renderTones starts and ends nearly silent", () => {
    const out = renderTones([330, 262], 0.12, "triangle");
    expect(Math.abs(out[0])).toBeLessThan(50);
    expect(Math.abs(out[out.length - 1])).toBeLessThan(50);
  });

  test("encodeWav writes a 16-bit mono PCM RIFF file", () => {
    const wav = encodeWav(new Int16Array([0, 1000, -1000]), 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    const text = (from: number) => String.fromCharCode(...wav.slice(from, from + 4));
    expect([text(0), text(8), text(12), text(36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(view.getUint32(4, true)).toBe(36 + 6);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(46, true)).toBe(1000);
    expect(view.getInt16(48, true)).toBe(-1000);
  });
});
