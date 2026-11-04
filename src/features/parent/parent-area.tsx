import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALL_LEVELS, ALL_STAGES } from "@/course/levels";
import { SPEC } from "@/domain/spec";
import { InputTest } from "@/features/onboarding/input-test";
import { PinPad } from "@/features/onboarding/pin-pad";
import { JSPEC } from "@/juku/spec";
import { useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/chip";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { Dashboard } from "./dashboard";
import { DataPane } from "./data-pane";
import { JukuPane } from "./juku-pane";
import { ProfilesPane } from "./profiles-pane";
import { SettingsPane } from "./settings-pane";
import { TestPane } from "./test-pane";

type Pane = "dash" | "juku" | "settings" | "profiles" | "data" | "test" | "info";

const TEST_TOOLS = Constants.expoConfig?.extra?.enableTestTools === true;
const PANES: [Pane, string][] = [
  ["dash", "ダッシュボード"],
  ["juku", "塾の単元"],
  ["settings", "設定"],
  ["profiles", "プロフィール"],
  ["data", "データ"],
  ...(TEST_TOOLS ? ([["test", "テスト用"]] as [Pane, string][]) : []),
  ["info", "アプリ情報"],
];

function Info() {
  return (
    <View style={styles.info}>
      <AppText weight="bold">カリキュラム</AppText>
      <AppText style={styles.body}>
        {SPEC.title}（仕様 v{SPEC.specVersion}）と、{JSPEC.title}（仕様 v{JSPEC.specVersion}）。あわせて{ALL_LEVELS.length}レベル・{ALL_STAGES.length}ステージ
      </AppText>
      <AppText weight="bold">データの保存</AppText>
      <AppText style={styles.body}>この端末の中だけに保存します。外部への送信、広告、分析ツールはありません。</AppText>
      <AppText weight="bold">課金</AppText>
      <AppText style={styles.body}>課金の仕組みはありません。すべてのステージと機能を使えます。</AppText>
      <AppText weight="bold">バージョン</AppText>
      <AppText style={styles.body}>{Constants.expoConfig?.version ?? "—"}</AppText>
    </View>
  );
}

/** The parent area behind the PIN. The viewed child can differ from the one practicing. */
export function ParentArea({ onExit }: { onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const profiles = useAppStore((s) => s.profiles);
  const activeId = useAppStore((s) => s.activeId);
  const saveInputTest = useAppStore((s) => s.saveInputTest);
  const setPin = useAppStore((s) => s.setPin);
  const [viewId, setViewId] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("dash");
  const [mode, setMode] = useState<"tabs" | "inputTest" | "pin" | "pin2">("tabs");
  const [testFor, setTestFor] = useState<string | null>(null);
  const [pin1, setPin1] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const p = profiles.find((x) => x.id === (viewId ?? activeId)) ?? profiles[0];
  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 };

  if (mode === "inputTest" && testFor)
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, pad]}>
        <View style={styles.card}>
          <InputTest
            onDone={(s) => {
              // saved to the child whose settings were open, not the one practicing
              saveInputTest(testFor, s);
              setMode("tabs");
            }}
          />
        </View>
      </ScrollView>
    );

  if (mode === "pin" || mode === "pin2")
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, pad]}>
        <View style={styles.card}>
          <PinPad
            key={mode}
            title={mode === "pin" ? "新しいPIN（4桁）" : "もう一度入力"}
            error={pinError}
            onComplete={(v) => {
              if (mode === "pin") {
                setPin1(v);
                setPinError(null);
                return setMode("pin2");
              }
              if (v !== pin1) {
                setPinError("一致しませんでした。最初からやり直してください");
                return setMode("pin");
              }
              setPin(v);
              setMode("tabs");
            }}
          />
          <Button variant="ghost" label="やめる" onPress={() => setMode("tabs")} />
        </View>
      </ScrollView>
    );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, pad]} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <AppText weight="bold" accessibilityRole="header" style={styles.title}>
            保護者の画面
          </AppText>
          <Button variant="outline" label="閉じる" icon={<Ionicons name="lock-closed" size={16} color={colors.foreground} />} onPress={onExit} />
        </View>
        {profiles.length > 1 && p ? (
          <View style={styles.chips} accessibilityLabel="表示するお子さま">
            {profiles.map((x) => (
              <Chip key={x.id} label={x.nickname} selected={x.id === p.id} onPress={() => setViewId(x.id)} />
            ))}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {PANES.map(([id, label]) => (
            <Chip key={id} label={label} selected={pane === id} onPress={() => setPane(id)} />
          ))}
        </ScrollView>
        <View style={styles.card}>
          {pane === "dash" ? p ? <Dashboard key={p.id} p={p} /> : <AppText>プロフィールがありません。</AppText> : null}
          {pane === "juku" ? p ? <JukuPane key={p.id} p={p} /> : <AppText>プロフィールがありません。</AppText> : null}
          {pane === "settings" && p ? (
            <SettingsPane
              key={p.id}
              p={p}
              onInputTest={() => {
                setTestFor(p.id);
                setMode("inputTest");
              }}
              onPinChange={() => {
                setPinError(null);
                setMode("pin");
              }}
            />
          ) : null}
          {pane === "profiles" ? <ProfilesPane /> : null}
          {pane === "data" ? <DataPane /> : null}
          {pane === "test" && TEST_TOOLS ? <TestPane onExit={onExit} /> : null}
          {pane === "info" ? <Info /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tabs: { gap: 6, paddingVertical: 2 },
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 12 },
  info: { gap: 6 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 6 },
});
