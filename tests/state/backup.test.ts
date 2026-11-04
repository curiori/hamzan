import { describe, expect, test } from "bun:test";
import { COURSE } from "../../src/course/course";
import { freshProgress } from "../../src/domain/progression";
import { emptyWallet } from "../../src/game/economy";
import { backupFileName, backupText, readBackup, type Records } from "../../src/state/backup";
import { DEFAULT_DEV } from "../../src/state/create-store";
import { SAVE_VERSION } from "../../src/state/migrate";
import { newProfile } from "../../src/state/profile";

const NOW = Date.UTC(2026, 10, 4, 12, 30);
const STAMP = new Date(NOW).toISOString();
const pin = { hash: "h", salt: "s" };

/** two children, the second one chosen, as the device holds them */
function records(): Records {
  const a = newProfile("さくら", 4, { id: "pA", now: NOW });
  a.progress["frac-mixed"] = { ...freshProgress(COURSE.level["frac-mixed"]), practiced: true, mode: "M" };
  const b = newProfile("たろう", 2, { id: "pB", now: NOW });
  return { pin, profiles: [a, b], activeId: "pB" };
}

/** a file written today, changed by `fn` */
function fileWith(fn: (file: Record<string, unknown> & { state: Record<string, unknown> & { profiles: Record<string, unknown>[] } }) => void): string {
  const file = JSON.parse(backupText(records(), NOW));
  fn(file);
  return JSON.stringify(file);
}

describe("the records file", () => {
  test("a file round-trips every child, the PIN and the active child, and leaves the test settings out", () => {
    const r = records();
    const text = backupText({ ...r, dev: { ...DEFAULT_DEV, unlockAll: true } } as Records, NOW);
    const file = JSON.parse(text);
    expect([file.app, file.version, file.exportedAt]).toEqual(["hamzan", SAVE_VERSION, STAMP]);
    expect(text).not.toContain('"dev"');
    expect(readBackup(text)).toEqual({ ok: true, records: r, exportedAt: STAMP });
  });

  test("text that is not a records file is refused as not records", () => {
    for (const text of ["", "こんにちは", "[]", "{}", "null", "42", JSON.stringify({ app: "other", version: 3, exportedAt: STAMP, state: {} })])
      expect(readBackup(text)).toEqual({ ok: false, reason: "notRecords" });
  });

  test("a file from a newer app is refused", () => {
    expect(readBackup(fileWith((f) => (f.version = SAVE_VERSION + 1)))).toEqual({ ok: false, reason: "tooNew" });
  });

  test("a damaged file is refused", () => {
    expect(readBackup(backupText(records(), NOW).slice(0, 200))).toEqual({ ok: false, reason: "notRecords" });
    const broken = [
      fileWith((f) => (f.version = "3")),
      fileWith((f) => (f.version = 0)),
      fileWith((f) => (f.exportedAt = 5)),
      fileWith((f) => delete (f as { state?: unknown }).state),
      fileWith((f) => (f.state.profiles = {} as never)),
      fileWith((f) => delete f.state.profiles[0].sets),
      fileWith((f) => (f.state.profiles[0].course = { version: 2 })),
      fileWith((f) => (f.state.pin = { salt: "s" })),
      fileWith((f) => (f.state.profiles[1].id = "pA")),
      // edits that keep the containers but break what the screens read
      fileWith((f) => (f.state.profiles[0].progress = { "0-1": null })),
      fileWith((f) => (f.state.profiles[0].wallet = {})),
      fileWith((f) => (f.state.profiles[0].room = {})),
      fileWith((f) => (f.state.profiles[0].sessions = { "2026-11-04": null })),
      fileWith((f) => (f.state.profiles[0].sets = [null])),
      // children without a PIN would open the parent area to anyone
      fileWith((f) => (f.state.pin = null)),
    ];
    for (const text of broken) expect(readBackup(text)).toEqual({ ok: false, reason: "broken" });
  });

  test("test settings written into a file by hand are dropped", () => {
    const read = readBackup(fileWith((f) => (f.state.dev = { ...DEFAULT_DEV, unlockAll: true })));
    expect(read.ok && "dev" in read.records).toBe(false);
  });

  test("a file without children is refused as empty", () => {
    expect(readBackup(fileWith((f) => (f.state.profiles = [])))).toEqual({ ok: false, reason: "empty" });
  });

  test("files of earlier save versions move forward like stored records", () => {
    const { course: _course, ...v2 } = newProfile("さくら", 4, { id: "pA", now: NOW });
    const p2 = { ...v2, juku: { open: {}, checks: [] }, progress: { "6-1": { ...freshProgress(COURSE.level["frac-mixed"]), practiced: true } } };
    const read2 = readBackup(JSON.stringify({ app: "hamzan", version: 2, exportedAt: STAMP, state: { pin, profiles: [p2], activeId: "pA" } }));
    if (!read2.ok) throw new Error(`version 2 refused: ${read2.reason}`);
    const q2 = read2.records.profiles[0];
    expect(q2.progress["frac-mixed"]?.practiced).toBe(true);
    expect(q2.progress["6-1"]).toBeUndefined();
    expect("juku" in q2).toBe(false);
    expect(q2.course.seen).toContain("frac-mixed");

    const { course: _c, wallet: _w, inventory: _i, room: _r, ledger: _l, ...v1 } = newProfile("たろう", 2, { id: "pB", now: NOW });
    const { shop: _shop, ...settings } = v1.settings;
    const read1 = readBackup(JSON.stringify({ app: "hamzan", version: 1, exportedAt: STAMP, state: { pin, profiles: [{ ...v1, settings }], activeId: "pB" } }));
    if (!read1.ok) throw new Error(`version 1 refused: ${read1.reason}`);
    expect(read1.records.profiles[0].wallet).toEqual(emptyWallet());
  });

  test("an active child missing from the file becomes the first child", () => {
    const read = readBackup(fileWith((f) => (f.state.activeId = "nobody")));
    expect(read.ok && read.records.activeId).toBe("pA");
  });

  test("file names carry the local date and time and the device", () => {
    expect(backupFileName(new Date(2026, 10, 4, 21, 5).getTime(), "ipad")).toBe("hamzan-20261104-2105-ipad.json");
  });
});
