import { describe, expect, test } from "bun:test";
import { MAX_FONT_SCALE_UI, scaledFont } from "@/ui/font-scale";

describe("font scale", () => {
  test("text grows with the scale up to the cap", () => {
    expect(scaledFont({ fontSize: 16, lineHeight: 22 }, 2, 1.5)).toEqual({ fontSize: 24, lineHeight: 33 });
    expect(scaledFont({ fontSize: 20 }, 1.2, 1.5)).toEqual({ fontSize: 24 });
    expect(scaledFont({}, 2, 1.5)).toEqual({});
  });

  test("screens other than practice cap text at one and a half times", () => {
    expect(MAX_FONT_SCALE_UI).toBe(1.5);
  });
});
