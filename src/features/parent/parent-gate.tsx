import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { kanjiNumber } from "@/domain/problem";
import { textInputStyle } from "@/features/onboarding/child-form";
import { PinPad } from "@/features/onboarding/pin-pad";
import { useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

const FORGOT_HOLD_MS = 3000;

/** PIN check before the parent area. A forgotten PIN is reset by holding a button and typing a number written in kanji. */
export function ParentGate({ onUnlock, onBack }: { onUnlock: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const checkPin = useAppStore((s) => s.checkPin);
  const setPin = useAppStore((s) => s.setPin);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState<"no" | "challenge" | "new" | "new2">("no");
  const [challenge] = useState(() => 1000 + Math.floor(Math.random() * 9000));
  const [answer, setAnswer] = useState("");
  const [newPin, setNewPin] = useState("");

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Button variant="ghost" label="もどる" icon={<Ionicons name="arrow-back" size={20} color={colors.foreground} />} onPress={onBack} style={styles.back} />
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="lock-closed" size={20} color={colors.foreground} />
            <AppText weight="bold" accessibilityRole="header" style={styles.title}>
              保護者の方へ
            </AppText>
          </View>
          {forgot === "no" ? (
            <>
              <PinPad title="PINを入力" error={error} onComplete={(p) => (checkPin(p) ? onUnlock() : setError("PINがちがいます"))} />
              <Pressable
                accessibilityRole="button"
                accessibilityHint="3秒 長押しします"
                delayLongPress={FORGOT_HOLD_MS}
                onLongPress={() => {
                  setError(null);
                  setForgot("challenge");
                }}
                style={({ pressed }) => [styles.forgot, pressed && styles.forgotHeld]}
              >
                {({ pressed }) => (
                  <AppText weight="bold" style={[styles.forgotText, pressed && styles.forgotTextHeld]}>
                    PINを忘れたとき（3秒長押し）
                  </AppText>
                )}
              </Pressable>
            </>
          ) : null}
          {forgot === "challenge" ? (
            <View style={styles.challenge}>
              <AppText style={styles.note}>次の数を数字（4桁）で入力すると、PINを設定し直せます。</AppText>
              <AppText weight="bold" style={styles.kanji}>
                {kanjiNumber(challenge)}
              </AppText>
              <TextInput
                value={answer}
                onChangeText={(t) => setAnswer(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                accessibilityLabel="数字で入力"
                placeholder="数字で入力"
                style={textInputStyle}
              />
              {error ? (
                <AppText weight="bold" style={styles.error}>
                  {error}
                </AppText>
              ) : null}
              <Button label="確認" onPress={() => (Number(answer) === challenge ? setForgot("new") : setError("数字がちがいます"))} />
            </View>
          ) : null}
          {forgot === "new" ? (
            <PinPad
              key="new"
              title="新しいPIN（4桁）"
              onComplete={(p) => {
                setNewPin(p);
                setForgot("new2");
              }}
            />
          ) : null}
          {forgot === "new2" ? (
            <PinPad
              key="new2"
              title="もう一度入力"
              onComplete={(p) => {
                if (p !== newPin) return setForgot("new");
                setPin(p);
                onUnlock();
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 8 },
  back: { alignSelf: "flex-start" },
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20, gap: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 18 },
  forgot: { alignSelf: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 10 },
  forgotHeld: { backgroundColor: colors.primary, borderColor: colors.primary },
  forgotText: { fontSize: 14 },
  forgotTextHeld: { color: colors.primaryForeground },
  challenge: { gap: 12 },
  note: { fontSize: 14, lineHeight: 21 },
  kanji: { fontSize: 30, textAlign: "center" },
  error: { fontSize: 14, color: colors.red700 },
});
