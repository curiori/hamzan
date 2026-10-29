import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { GRADE_LABEL } from "@/i18n/ja";
import { useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { useConfirm } from "@/ui/confirm";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** Clearing a child's records or removing the child, each behind a confirmation. */
export function DataPane() {
  const profiles = useAppStore((s) => s.profiles);
  const resetProfileData = useAppStore((s) => s.resetProfileData);
  const deleteProfile = useAppStore((s) => s.deleteProfile);
  const confirm = useConfirm();

  return (
    <View style={styles.root}>
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
                    description: "進み具合・ミスの記録・ごほうびが消え、診断からやり直します。元に戻せません。",
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
});
