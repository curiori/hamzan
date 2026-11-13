import { describe, expect, test } from "bun:test";
import { importConfirmText, READ_ERROR_TEXT, stampText } from "../../src/features/parent/records-text";
import type { Records } from "../../src/state/backup";
import { newProfile } from "../../src/state/profile";
import type { Profile, SetAttempt } from "../../src/state/types";

const NOW = Date.UTC(2026, 10, 4, 12, 30);
const STAMP = new Date(NOW).toISOString();
const set = (i: number): SetAttempt => ({
  id: `s${i}`,
  kind: "main",
  levelId: "0-1",
  mode: "S",
  date: "2026-11-04",
  startedAt: NOW,
  n: 20,
  errors: 0,
  perProblemSec: 1,
  target2: 2,
  target3: 1,
  result: "star2",
});
const child = (nickname: string, id: string, sets: number): Profile => ({ ...newProfile(nickname, 4, { id, now: NOW }), sets: Array.from({ length: sets }, (_, i) => set(i)) });
const file: Records = { pin: { hash: "h", salt: "s" }, profiles: [child("さくら", "a", 12), child("たろう", "b", 3)], activeId: "a" };
const device: Records = { pin: { hash: "x", salt: "y" }, profiles: [child("はなこ", "c", 5)], activeId: "c" };
const nothing: Records = { pin: null, profiles: [], activeId: null };

describe("words for moving the records", () => {
  test("the confirmation names the file's children and warns that today's records go", () => {
    const t = importConfirmText(file, STAMP, device);
    expect(t.title).toBe("この記録を読み込みますか？");
    expect(t.description).toContain(`${stampText(STAMP)} に書き出した記録です（さくら：セット記録 12件、たろう：セット記録 3件）。`);
    expect(t.description).toContain("この端末の今の記録（はなこ）は消えて、ファイルの記録に置き換わります。元に戻せません。");
    expect(t.description).toContain("PIN もファイルのものになります。");
    expect(t.destructive).toBe(true);
  });

  test("with nothing on the device, the confirmation does not speak of records that go", () => {
    const t = importConfirmText(file, STAMP, nothing);
    expect(t.description).not.toContain("今の記録");
    expect(t.description).toContain("PIN もファイルのものになります。");
    expect(t.destructive).toBe(false);
  });

  test("after the stored records could not be read, the confirmation says they go as well", () => {
    const t = importConfirmText(file, STAMP, nothing, { unreadable: true });
    expect(t.description).toContain("この端末に保存されている記録（読み込めなかったもの）は消えて、ファイルの記録に置き換わります。元に戻せません。");
    expect(t.destructive).toBe(true);
  });

  test("every reason a file is refused has words", () => {
    for (const reason of ["notRecords", "tooNew", "broken", "empty"] as const) expect(READ_ERROR_TEXT[reason].length).toBeGreaterThan(5);
    // the app's name, as the home screen shows it
    for (const reason of ["notRecords", "tooNew"] as const) expect(READ_ERROR_TEXT[reason]).toContain("はむ算");
  });

  test("the time a file was written reads in the device's time", () => {
    expect(stampText(new Date(2026, 10, 4, 9, 7).toISOString())).toBe("2026/11/04 09:07");
    // a time written by hand that is not a time
    expect(stampText("きのう")).toBe("日時不明");
  });
});
