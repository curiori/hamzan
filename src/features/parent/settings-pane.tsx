import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { SPEC, type Coeffs } from "@/domain/spec";
import { textInputStyle } from "@/features/onboarding/child-form";
import { useAppStore } from "@/state/store";
import type { Profile, Settings } from "@/state/types";
import { Button } from "@/ui/button";
import { SwitchRow } from "@/ui/switch-row";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";
import { Section } from "./section";

const TOGGLES: { key: keyof Omit<Settings, "coeffs">; label: string; note: string }[] = [
  { key: "timer", label: "タイマーを表示", note: "既定はオフ（お子さまに時間を意識させすぎないため）" },
  { key: "autoSubmit", label: "自動送信", note: "答えの桁数まで入力したら自動で送信" },
  { key: "sound", label: "効果音", note: "マナーモードのときは鳴りません" },
  { key: "vibration", label: "振動", note: "" },
];

const COEFF_LABEL: Record<keyof Coeffs, string> = { read: "読む", think: "考える", write: "書く" };

/** A positive decimal; the field shows what is typed while focused and the saved value otherwise. */
function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.numberField}>
      <AppText style={styles.small}>{label}</AppText>
      <TextInput
        value={focused ? text : String(value)}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        onFocus={() => {
          setText(String(value));
          setFocused(true);
        }}
        onChangeText={(t) => {
          setText(t);
          const v = Number(t);
          if (t.trim() && v > 0) onCommit(v);
        }}
        onBlur={() => setFocused(false)}
        style={[textInputStyle, styles.numberInput]}
      />
    </View>
  );
}

function CoeffEditor({ p }: { p: Profile }) {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const cur = p.settings.coeffs ?? { star2: SPEC.timeModel.star2, star3: SPEC.timeModel.star3 };
  const set = (star: "star2" | "star3", key: keyof Coeffs, v: number) => {
    if (!(v > 0)) return;
    updateProfile(p.id, { settings: { ...p.settings, coeffs: { ...cur, [star]: { ...cur[star], [key]: v } } } });
  };
  return (
    <View style={styles.group}>
      {(["star2", "star3"] as const).map((star) => (
        <View key={star} style={styles.coeffRow}>
          <AppText weight="bold" style={styles.small}>
            {star === "star2" ? "★2" : "★3"} の係数
          </AppText>
          <View style={styles.fields}>
            {(["read", "think", "write"] as const).map((k) => (
              <NumberField key={k} label={`${star === "star2" ? "★2" : "★3"} ${COEFF_LABEL[k]}`} value={cur[star][k]} onCommit={(v) => set(star, k, v)} />
            ))}
          </View>
        </View>
      ))}
      <AppText style={styles.small}>
        T＝読む＋考える×K＋書く×D。入力テストの結果がある場合、「書く」はお子さまの値（{p.writeSecPerDigit ?? "—"}秒/桁）に置き換わります。
      </AppText>
      <Button
        variant="outline"
        label="既定に戻す"
        icon={<Ionicons name="refresh" size={18} color={colors.foreground} />}
        disabled={!p.settings.coeffs}
        onPress={() => updateProfile(p.id, { settings: { ...p.settings, coeffs: null } })}
      />
    </View>
  );
}

/** One child's settings, the key-speed test, the time-model coefficients and the PIN. */
export function SettingsPane({ p, onInputTest, onPinChange }: { p: Profile; onInputTest: () => void; onPinChange: () => void }) {
  const updateProfile = useAppStore((s) => s.updateProfile);
  return (
    <View style={styles.root}>
      <Section title={`${p.nickname}さんの設定`}>
        {TOGGLES.map((t) => (
          <SwitchRow
            key={t.key}
            label={t.label}
            note={t.note || undefined}
            value={p.settings[t.key]}
            onChange={(v) => updateProfile(p.id, { settings: { ...p.settings, [t.key]: v } })}
          />
        ))}
      </Section>
      <Section title="入力テスト">
        <AppText style={styles.body}>{p.writeSecPerDigit !== null ? `書く速さ ${p.writeSecPerDigit}秒/桁（${p.writeTestedAt} 測定）` : "まだ測っていません"}</AppText>
        <Button variant="outline" label="入力テストをやり直す" onPress={onInputTest} />
      </Section>
      <Section title="時間モデルの係数（上級者向け）">
        <CoeffEditor p={p} />
      </Section>
      <Section title="PIN">
        <Button variant="outline" label="PINを変更する" onPress={onPinChange} />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 24 },
  group: { gap: 10 },
  coeffRow: { gap: 4 },
  fields: { flexDirection: "row", gap: 8 },
  numberField: { flex: 1, gap: 2 },
  numberInput: { height: 44, fontSize: 16 },
  small: { fontSize: 12, lineHeight: 17 },
  body: { fontSize: 14 },
});
