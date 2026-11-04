// Moving the records file in and out of the app: the share sheet (AirDrop, the Files app) and the file picker on the
// iPhone and iPad, a download and the browser's file picker in the web preview. What goes in the file, and the
// checks when one is read, are in src/state/backup.ts.
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/** which device wrote a file, for its name */
export function deviceLabel(): string {
  if (Platform.OS === "ios") return Platform.isPad ? "ipad" : "iphone";
  return Platform.OS;
}

/** Hands the records file to the share sheet; the web preview downloads it (expo-file-system has no web side). */
export async function shareRecordsFile(name: string, text: string): Promise<void> {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "記録を書き出す" });
}

/** The text of the file the parent picks, or null when they close the picker. Any file can be picked; reading checks it. */
export async function pickRecordsFile(): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets.length) return null;
  const asset = picked.assets[0];
  if (Platform.OS === "web") return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
  return new File(asset.uri).text();
}