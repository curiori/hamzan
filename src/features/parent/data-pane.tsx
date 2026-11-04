import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { GRADE_LABEL, RESET_WARNING } from "@/i18n/ja";
import { useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { useConfirm } from "@/ui/confirm";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { useRecordsTransfer } from "./records-transfer";

/** Moving the records to and from a file, then clearing a child's records or removing the child, each behind a confirmation. */
export function DataPane({ onImported }: { onImported: () => void }) {
  const profiles = useAppStore((s) => s.profiles);
  const resetProfileData = useAppStore((s) => s.resetProfileData);
  const deleteProfile = useAppStore((s) => s.deleteProfile);
  const confirm = useConfirm();
  const transfer = useRecordsTransfer();

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <AppText weight="bold">記録の書き出しと読み込み</AppText>
        <AppText style={styles.note}>
          PIN と、すべてのお子さまの記録を1つのファイルに書き出します。AirDrop やファイル App で保存しておくと、別の端末や新しく入れたアプリで読み込めます。テスト用の設定は書き出しません。
        </AppText>
        <View style={styles.actions}>
          <Button
            variant="outline"
            label="記録を書き出す"
            icon={<Ionicons name="share-outline" size={18} color={colors.foreground} />}
            disabled={transfer.busy}
            onPress={() => void transfer.exportFile()}
          />
          <Button
            variant="outline"
            label="記録を読み込む"
            icon={<Ionicons name="download-outline" size={18} color={colors.foreground} />}
            disabled={transfer.busy}
            onPress={async () => {
              // the parent area closes, so the next opening asks for the PIN the file brought
              if (await transfer.importFile()) onImported();
            }}
          />
        </View>
        {transfer.message ? (
          <AppText weight="bold" accessibilityLiveRegion="polite" style={styles.message}>
            {transfer.message}
          </AppText>
        ) : null}
      </View>
      {profiles.map((p) => (
        <View key={p.id} style={styles.card}>
          <AppText weight="bold">
            {p.nickname}（{GRADE_LABEL(p.grade)}）— セット記録 {p.sets.length}件
          </AppText>
          <View style={styles.actions}>
            <Button
              variant="outline"
              label="記録をすべて消す"
              icon={<Ionicons name="refresh" size={18} color={colors.foreground} />}
              onPress={async () => {
                if (
                  await confirm({
                    title: `${p.nickname}さんの記録をすべて消しますか？`,
                    description: RESET_WARNING,
                    confirmLabel: "消す",
                    destructive: true,
                  })
                )
                  resetProfileData(p.id);
              }}
            />
            <Button
              variant="destructive"
              label="プロフィールを削除"
              icon={<Ionicons name="trash" size={18} color={colors.primaryForeground} />}
              onPress={async () => {
                if (
                  await confirm({
                    title: `${p.nickname}さんのプロフィールを削除しますか？`,
                    description: "このプロフィールの記録もすべて消えます。元に戻せません。",
                    confirmLabel: "削除する",
                    destructive: true,
                  })
                )
                  deleteProfile(p.id);
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  note: { fontSize: 14, lineHeight: 21 },
  message: { fontSize: 14, lineHeight: 21, color: colors.red700 },
});
