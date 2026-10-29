import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Hamster } from "@/art/hamster";
import { SPEC } from "@/domain/spec";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";
import { InputTest } from "./input-test";

/** A new child's first screen: a short key practice that also measures the typing speed. */
export function FirstSteps({ nickname, onDone }: { nickname: string; onDone: (perDigitSec: number[]) => void }) {
  const [started, setStarted] = useState(false);
  if (started) return <InputTest onDone={onDone} />;
  return (
    <View style={styles.root}>
      <Hamster mood="cheer" size={96} />
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        {nickname}さん、はじめよう！
      </AppText>
      <AppText weight="bold" style={styles.body}>
        まずは すうじキーの れんしゅう。でてくる 2けたの かずを、そのまま うってね。{SPEC.timeModel.inputSpeedTest.items}こ あるよ。
      </AppText>
      <AppText style={styles.note}>
        （保護者の方へ：入力の速さを測って、目安タイムの「書く時間」をお子さまに合わせます。つづいて、どこから始めるかを決める診断に進みます）
      </AppText>
      <Button size="lg" label="はじめる" icon={<Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />} onPress={() => setStarted(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 14 },
  title: { fontSize: 24, textAlign: "center" },
  body: { fontSize: 16, lineHeight: 25, textAlign: "center" },
  note: { fontSize: 13, lineHeight: 20, textAlign: "center" },
});
