// The records file: everything on the device (the PIN, every child, the chosen child) in one JSON file the parent can
// keep with AirDrop or the Files app and read on another device or in a newly installed app. The test settings stay
// out. Reading checks the file before anything is replaced: another app's file, a damaged one, or one from a newer
// app is refused; an older save version moves forward like stored records, and every child is reconciled with the
// course. Pure: the screens hand the text over (src/platform/records-file.ts).
import { migrate, SAVE_VERSION } from "./migrate";
import { reconcileProfile } from "./reconcile";
import type { PinRecord, Profile } from "./types";

export const BACKUP_APP = "hamzan";

export interface Records {
  pin: PinRecord | null;
  profiles: Profile[];
  activeId: string | null;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  /** the save version of `state` (src/state/migrate.ts) */
  version: number;
  /** when the file was written (ISO 8601) */
  exportedAt: string;
  state: Records;
}

export type BackupError = "notRecords" | "tooNew" | "broken" | "empty";
export type BackupRead = { ok: true; records: Records; exportedAt: string } | { ok: false; reason: BackupError };

export function backupText(r: Records, now: number): string {
  const file: BackupFile = {
    app: BACKUP_APP,
    version: SAVE_VERSION,
    exportedAt: new Date(now).toISOString(),
    state: { pin: r.pin, profiles: r.profiles, activeId: r.activeId },
  };
  return JSON.stringify(file);
}

const two = (n: number) => String(n).padStart(2, "0");

/** "hamzan-20261104-2105-ipad.json": the device's date and time, and which device wrote it */
export function backupFileName(now: number, device: string): string {
  const d = new Date(now);
  return `hamzan-${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}-${device}.json`;
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isListOf = (x: unknown, item: (v: unknown) => boolean) => Array.isArray(x) && x.every(item);
const isMapOf = (x: unknown, item: (v: unknown) => boolean) => isObject(x) && Object.values(x).every(item);
const isText = (x: unknown) => typeof x === "string";

/**
 * A child's records in the shape of this save version, down to what the screens and plans read without checking
 * (each level's progress, each day's plan, the seeds, the room), so a file edited by hand cannot stop the app later.
 */
function isProfile(p: unknown): p is Profile {
  if (!isObject(p)) return false;
  const { course, wallet, room } = p;
  return (
    typeof p.id === "string" &&
    typeof p.nickname === "string" &&
    typeof p.grade === "number" &&
    typeof p.createdAt === "number" &&
    typeof p.placementDone === "boolean" &&
    [p.settings, p.challenge, p.inventory, p.stageChecks].every(isObject) &&
    isMapOf(p.progress, isObject) &&
    isMapOf(p.facts, isObject) &&
    isMapOf(p.sessions, (d) => isObject(d) && Array.isArray(d.plan)) &&
    [p.reviews, p.sets, p.errors, p.ledger].every((list) => isListOf(list, isObject)) &&
    isObject(wallet) &&
    typeof wallet.seeds === "number" &&
    typeof wallet.lifetime === "number" &&
    isObject(room) &&
    isObject(room.layout) &&
    Array.isArray(room.seen) &&
    isObject(course) &&
    typeof course.version === "number" &&
    isListOf(course.seen, isText) &&
    isListOf(course.checks, isText)
  );
}

const isPin = (x: unknown): x is PinRecord => isObject(x) && typeof x.hash === "string" && typeof x.salt === "string";

function recordsOf(state: unknown): Records | BackupError {
  if (!isObject(state) || !Array.isArray(state.profiles)) return "broken";
  const profiles: unknown[] = state.profiles;
  if (!profiles.every(isProfile) || new Set(profiles.map((p) => p.id)).size !== profiles.length) return "broken";
  if (!profiles.length) return "empty";
  // the app never has children without a PIN: the parent area would open to anyone
  if (!isPin(state.pin)) return "broken";
  const reconciled = profiles.map((p) => reconcileProfile(p));
  const activeId = reconciled.some((p) => p.id === state.activeId) ? (state.activeId as string) : reconciled[0].id;
  return { pin: state.pin, profiles: reconciled, activeId };
}

export function readBackup(text: string): BackupRead {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: "notRecords" };
  }
  if (!isObject(file) || file.app !== BACKUP_APP) return { ok: false, reason: "notRecords" };
  const { version, exportedAt } = file;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || typeof exportedAt !== "string") return { ok: false, reason: "broken" };
  if (version > SAVE_VERSION) return { ok: false, reason: "tooNew" };
  try {
    const records = recordsOf(version < SAVE_VERSION ? migrate(file.state, version) : file.state);
    return typeof records === "string" ? { ok: false, reason: records } : { ok: true, records, exportedAt };
  } catch {
    return { ok: false, reason: "broken" };
  }
}