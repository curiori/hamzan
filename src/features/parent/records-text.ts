// Words for moving the records between devices (src/features/parent/records-transfer.ts). Pure, so tests can read them.
import { ja } from "@/i18n/ja";
import type { BackupError, Records } from "@/state/backup";

/** why a file was not read, for the parent */
export const READ_ERROR_TEXT: Record<BackupError, string> = {
  notRecords: `${ja.appName}の記録のファイルではありません。`,
  tooNew: `新しい版の${ja.appName}で書き出した記録です。アプリを新しくしてから読み込んでください。`,
  broken: "記録のファイルがこわれているため、読み込めません。",
  empty: "このファイルには、お子さまの記録がありません。",
};

const two = (n: number) => String(n).padStart(2, "0");

/** "2026/11/04 21:05" in the device's time */
export function stampText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "日時不明";
  return `${d.getFullYear()}/${two(d.getMonth() + 1)}/${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/**
 * The question before a file replaces the records: what the file holds, what goes, and that the PIN changes. When the
 * records stored on the device could not be read (the app said they were kept), they are the ones that go.
 */
export function importConfirmText(
  file: Records,
  exportedAt: string,
  current: Records,
  opts: { unreadable?: boolean } = {},
): { title: string; description: string; destructive: boolean } {
  const children = file.profiles.map((p) => `${p.nickname}：セット記録 ${p.sets.length}件`).join("、");
  const losing = current.profiles.length > 0;
  const parts = [`${stampText(exportedAt)} に書き出した記録です（${children}）。`];
  if (opts.unreadable) parts.push("この端末に保存されている記録（読み込めなかったもの）は消えて、ファイルの記録に置き換わります。元に戻せません。");
  else if (losing) parts.push(`この端末の今の記録（${current.profiles.map((p) => p.nickname).join("、")}）は消えて、ファイルの記録に置き換わります。元に戻せません。`);
  parts.push("PIN もファイルのものになります。");
  return { title: "この記録を読み込みますか？", description: parts.join(""), destructive: losing || !!opts.unreadable };
}