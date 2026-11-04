import { useState } from "react";
import { deviceLabel, pickRecordsFile, shareRecordsFile } from "@/platform/records-file";
import { backupFileName, backupText, readBackup } from "@/state/backup";
import { useAppStore } from "@/state/store";
import { useConfirm } from "@/ui/confirm";
import { importConfirmText, READ_ERROR_TEXT } from "./records-text";

/**
 * Writing the records out and reading a file in, for the parent's data pane and the first screen. A file replaces the
 * records only after the parent says yes to what it holds; `importFile` is true when it did.
 */
export function useRecordsTransfer() {
  const confirm = useConfirm();
  const replaceRecords = useAppStore((s) => s.replaceRecords);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exportFile = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const now = Date.now();
      await shareRecordsFile(backupFileName(now, deviceLabel()), backupText(useAppStore.getState(), now));
    } catch {
      setMessage("書き出せませんでした。もう一度ためしてください。");
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    try {
      let text: string | null;
      try {
        text = await pickRecordsFile();
      } catch {
        setMessage("ファイルを開けませんでした。");
        return false;
      }
      if (text === null) return false;
      const read = readBackup(text);
      if (!read.ok) {
        setMessage(READ_ERROR_TEXT[read.reason]);
        return false;
      }
      const t = importConfirmText(read.records, read.exportedAt, useAppStore.getState());
      if (!(await confirm({ title: t.title, description: t.description, confirmLabel: "読み込む", destructive: t.destructive }))) return false;
      replaceRecords(read.records);
      return true;
    } finally {
      setBusy(false);
    }
  };

  return { exportFile, importFile, busy, message };
}