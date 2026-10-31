import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url));
/** a PNG's IHDR: width and height (bytes 16 to 23) and colour type (byte 25: 2 RGB, 6 RGB with alpha) */
function pngHeader(path: string) {
  const b = file(path);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
}

/** The alpha of the top-left pixel of an 8-bit RGBA PNG (whatever the row's filter, the first pixel is stored as it is). */
function cornerAlpha(path: string): number {
  const b = file(path);
  const idat: Buffer[] = [];
  for (let at = 8; at < b.length; ) {
    const len = b.readUInt32BE(at);
    if (b.toString("latin1", at + 4, at + 8) === "IDAT") idat.push(b.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  // the row's filter byte, then R, G, B, A
  return inflateSync(Buffer.concat(idat))[4];
}

describe("app images", () => {
  test("the app icon is a 1024 square and the splash image is square", () => {
    expect(pngHeader("assets/images/icon.png")).toEqual({ width: 1024, height: 1024, colorType: 2 });
    const splash = pngHeader("assets/images/splash-icon.png");
    expect(splash.width).toBe(splash.height);
    expect(splash.width).toBeGreaterThanOrEqual(400);
    // the hamster stands on the splash colour, so the picture around it is see-through
    expect(splash.colorType).toBe(6);
    expect(cornerAlpha("assets/images/splash-icon.png")).toBe(0);
    const app = JSON.parse(file("app.json").toString("utf8"));
    const plugin = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-splash-screen");
    expect(plugin[1]).toMatchObject({ image: "./assets/images/splash-icon.png", imageWidth: 200, backgroundColor: "#FFF4E2" });
  });

  test("the favicon is small", () => {
    expect(pngHeader("assets/images/favicon.png")).toMatchObject({ width: 48, height: 48 });
  });
});
