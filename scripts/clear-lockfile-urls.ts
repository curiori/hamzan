// Clears the registry URL that bun writes into each package of bun.lock when it installs from a registry other than
// npm's own, such as a private registry set in .npmrc. With the slot empty, every machine installs the same versions,
// checked against the same integrity, from its own registry: npm on a Mac, Expo's npm cache on its build servers, the
// private registry on a PC that sets one. Run it there after `bun add`, `bunx expo install` or anything else that
// rewrites bun.lock:
//   bun run scripts/clear-lockfile-urls.ts [lockfile]   (bun.lock by default)
// tests/scripts/clear-lockfile-urls.test.ts fails while bun.lock still names a registry.
import { readFileSync, writeFileSync } from "node:fs";

// An npm package of bun.lock: ["<name>@<version>", "<registry>/<name>/-/<base name>-<version>.tgz", ...]
const NPM_PACKAGE = /(\["(?:@[^@"/]+\/)?([^@"/]+)@(\d[^"]*)",\s*)"(https?:\/\/[^"]+)"/g;

export function clearLockfileUrls(lock: string): { lock: string; cleared: number } {
  let cleared = 0;
  const out = lock.replace(NPM_PACKAGE, (entry, head: string, base: string, version: string, url: string) => {
    // Copies of npm keep npm's tarball path. Other registries may hold packages that npm does not have.
    if (!url.endsWith(`/-/${base}-${version}.tgz`)) return entry;
    cleared++;
    return `${head}""`;
  });
  return { lock: out, cleared };
}

if (import.meta.main) {
  const name = process.argv[2] ?? "bun.lock";
  const file = process.argv[2] ?? new URL("../bun.lock", import.meta.url);
  const { lock, cleared } = clearLockfileUrls(readFileSync(file, "utf8"));
  if (cleared > 0) writeFileSync(file, lock);
  console.log(cleared > 0 ? `${name}: cleared ${cleared} registry URLs` : `${name}: names no registry`);
}
