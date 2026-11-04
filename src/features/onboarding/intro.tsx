import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { Hamster } from "@/art/hamster";
import { useRecordsTransfer } from "@/features/parent/records-transfer";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";

/** First screen for the parent: what the practice is and where the records stay, or records written out elsewhere to read in. */
export function Intro({ onNext }: { onNext: () => void }) {
  const transfer = useRecordsTransfer();
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Hamster size={64} />
        <AppText weight="bold" accessibilityRole="header" style={styles.title}>
          保護者の方へ
        </AppText>
      </View>
      <AppText style={styles.body}>
        毎日7〜10分、暗算の「技」をヒント → メモ → スピードの順に身につける練習です。正確さを先に、時間はあとで見ます。お子さまの画面にはタイマーを表示しません（設定で変更できます）。
      </AppText>
      <View style={styles.point}>
        <Ionicons name="shield-checkmark" size={20} color={colors.green700} />
        <AppText style={styles.pointText}>記録はこの端末の中だけに保存します。アカウント登録・広告・外部への送信はありません。</AppText>
      </View>
      <View style={styles.point}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
        <AppText style={styles.pointText}>設定・記録の削除・保護者向けの画面は、4桁のPINの奥にあります。</AppText>
      </View>
      <Button size="lg" label="PINを決める" icon={<Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />} onPress={onNext} />
      {/* records written out in Expo Go or on another device: the screens move on by themselves once they are in */}
      <Button
        variant="outline"
        label="書き出した記録を読み込む"
        icon={<Ionicons name="download-outline" size={18} color={colors.foreground} />}
        disabled={transfer.busy}
        onPress={() => void transfer.importFile()}
      />
      {transfer.message ? (
        <AppText weight="bold" accessibilityLiveRegion="polite" style={styles.message}>
          {transfer.message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 24 },
  body: { fontSize: 15, lineHeight: 24 },
  point: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  pointText: { flex: 1, fontSize: 14, lineHeight: 21 },
  message: { fontSize: 14, lineHeight: 21, color: colors.red700 },
});
