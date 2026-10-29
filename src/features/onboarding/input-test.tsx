import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Hamster } from "@/art/hamster";
import { DigitPad } from "@/ui/digit-pad";
import { ProgressBar } from "@/ui/progress-bar";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE, radius } from "@/ui/theme";
import { inputTestItems, pressInputKey, startInputTest } from "./input-test-flow";

/** Key-speed test: type each number as it is shown. Calls onDone once with seconds per digit. */
export function InputTest({ onDone }: { onDone: (perDigitSec: number[]) => void }) {
  const [state, setState] = useState(() => startInputTest(inputTestItems(), Date.now()));
  const latest = useRef(state);

  const press = (k: string) => {
    const prev = latest.current;
    const next = pressInputKey(prev, k, Date.now());
    if (next === prev) return;
    latest.current = next;
    setState(next);
    if (next.done && !prev.done) onDone(next.done);
  };

  return (
    <View style={styles.root}>
      <Hamster mood="happy" size={80} />
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        でてきた かずを うってね
      </AppText>
      <ProgressBar value={(state.idx / state.items.length) * 100} label="すすみぐあい" style={styles.progress} />
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite" style={styles.item}>
        {state.items[state.idx]}
      </AppText>
      <View style={styles.typed} accessible accessibilityLabel={`うった かず ${state.typed || "からっぽ"}`}>
        <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.typedText}>
          {state.typed}
        </AppText>
      </View>
      <DigitPad layout="calc" onKey={press} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 12 },
  title: { fontSize: 22, textAlign: "center" },
  progress: { alignSelf: "stretch" },
  item: { fontSize: 64, lineHeight: 76, fontVariant: ["tabular-nums"] },
  typed: { width: 150, height: 62, borderRadius: radius.lg, borderWidth: 3, borderColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  typedText: { fontSize: 36, fontVariant: ["tabular-nums"] },
});
