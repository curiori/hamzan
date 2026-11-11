import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { clearLockfileUrls } from "../../scripts/clear-lockfile-urls";

const FEED = "https://feed.example/_packaging/npm-public/npm/registry";
const SCRIPT = fileURLToPath(new URL("../../scripts/clear-lockfile-urls.ts", import.meta.url));

describe("clear-lockfile-urls", () => {
  test("clears the feed URL of plain, scoped and aliased packages and keeps the rest of each entry", () => {
    const lock = [
      `    "react": ["react@19.3.0", "${FEED}/react/-/react-19.3.0.tgz", {}, "sha1-4gqjoUaHB1zoYzUbWHiwYIw/v7I="],`,
      `    "@expo/vector-icons": ["@expo/vector-icons@15.1.1", "${FEED}/@expo/vector-icons/-/vector-icons-15.1.1.tgz", { "peerDependencies": { "react": "*" } }, "sha1-Sx0sYEk8CwU2ly8KW6vV9chbSPQ="],`,
      `    "string-width-cjs": ["string-width@4.2.3", "${FEED}/string-width/-/string-width-4.2.3.tgz", { "dependencies": { "strip-ansi": "^6.0.1" } }, "sha512-wKyQ=="],`,
    ].join("\n");
    expect(clearLockfileUrls(lock)).toEqual({
      lock: [
        `    "react": ["react@19.3.0", "", {}, "sha1-4gqjoUaHB1zoYzUbWHiwYIw/v7I="],`,
        `    "@expo/vector-icons": ["@expo/vector-icons@15.1.1", "", { "peerDependencies": { "react": "*" } }, "sha1-Sx0sYEk8CwU2ly8KW6vV9chbSPQ="],`,
        `    "string-width-cjs": ["string-width@4.2.3", "", { "dependencies": { "strip-ansi": "^6.0.1" } }, "sha512-wKyQ=="],`,
      ].join("\n"),
      cleared: 3,
    });
  });

  test("keeps the URL of a registry that is not a copy of npm, since it may hold packages npm does not have", () => {
    const lock = `    "@me/tool": ["@me/tool@1.0.0", "https://npm.pkg.github.com/download/@me/tool/1.0.0/0a1b2c3d", {}, "sha512-AAAA=="],`;
    expect(clearLockfileUrls(lock)).toEqual({ lock, cleared: 0 });
  });

  test("the command rewrites the lockfile it is given, and a second run leaves it as it is", () => {
    const dir = mkdtempSync(join(tmpdir(), "hamzan-lock-"));
    try {
      const file = join(dir, "bun.lock");
      writeFileSync(file, `{\n  "packages": {\n    "react": ["react@19.3.0", "${FEED}/react/-/react-19.3.0.tgz", {}, "sha1-x="],\n  }\n}\n`);
      const cleared = `{\n  "packages": {\n    "react": ["react@19.3.0", "", {}, "sha1-x="],\n  }\n}\n`;
      const run = () => Bun.spawnSync([process.execPath, "run", SCRIPT, file]).exitCode;
      expect(run()).toBe(0);
      expect(readFileSync(file, "utf8")).toBe(cleared);
      expect(run()).toBe(0);
      expect(readFileSync(file, "utf8")).toBe(cleared);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("bun.lock", () => {
  test("names no registry, so each machine installs from its own, such as npm on a Mac", () => {
    const lock = readFileSync(new URL("../../bun.lock", import.meta.url), "utf8");
    // after `bun add` or `bunx expo install` on a PC with a private registry, run: bun run scripts/clear-lockfile-urls.ts
    const named = [...lock.matchAll(/\["([^"]+@\d[^"]*)", "https?:/g)].map((m) => m[1]);
    expect(named).toEqual([]);
  });
});
