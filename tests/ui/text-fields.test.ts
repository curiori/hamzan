import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");
const screens = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? screens(join(dir, d.name)) : d.name.endsWith(".tsx") ? [join(dir, d.name)] : []));

describe("text fields", () => {
  test("every text field stops growing with the text size where the rest of the screen does", () => {
    // React Native gives a TextInput no cap, so at the largest text sizes its words would not fit the field
    const uncapped: string[] = [];
    for (const file of screens(SRC)) {
      const code = readFileSync(file, "utf8");
      for (const m of code.matchAll(/<TextInput\b([\s\S]*?)\/>/g))
        if (!m[1].includes("maxFontSizeMultiplier")) uncapped.push(`${file.slice(SRC.length + 1)}:${code.slice(0, m.index).split("\n").length}`);
    }
    expect(uncapped).toEqual([]);
    // reading every screen's source is slow on a cold disk
  }, 30_000);
});
