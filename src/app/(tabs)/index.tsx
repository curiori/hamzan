import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Mode } from "@/domain/spec";
import { MODE_LABEL } from "@/i18n/ja";
import { levelPlan } from "@/session/requests";
import { useSessionRunner } from "@/session/use-session-runner";
import { todayOf } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";

// Temporary launcher for checking the play and result screens; plan B task 6 replaces it with the map.
const LAUNCH: [string, Mode][] = [
  ["1-1", "H"],
  ["3-9", "H"],
  ["4-6", "H"],
  ["5-9", "H"],
  ["5-10", "H"],
  ["3-12", "H"],
  ["3-9", "M"],
  ["5-8", "M"],
  ["2-8", "S"],
  ["1-5", "S"],
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => activeProfile(s));
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const runner = useSessionRunner();
  if (!profile) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <AppText weight="bold" style={styles.title}>
        ちず（じゅんびちゅう）
      </AppText>
      <View style={styles.list}>
        <Button label="きょうの れんしゅう" onPress={() => runner.startNextPart()} />
        {LAUNCH.map(([id, mode]) => (
          <Button
            key={`${id}${mode}`}
            variant="outline"
            label={`${id} ${MODE_LABEL[mode]}`}
            onPress={() => runner.startPlan(levelPlan(profile, id, mode, todayOf(dayOffset), "extra"))}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24 },
  list: { gap: 8 },
});
