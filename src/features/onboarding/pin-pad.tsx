import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { DigitPad } from "@/ui/digit-pad";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";
import { emptyPin, PIN_LENGTH, pinPress } from "./pin-entry";

const HAND_OVER_MS = 120;

/** Four-digit PIN pad. The last dot shows for a moment, then onComplete is called once; keys meanwhile are ignored. */
export function PinPad({ title, note, error, onComplete }: { title: string; note?: string; error?: string | null; onComplete: (pin: string) => void }) {
  const [entry, setEntry] = useState(emptyPin);
  const latest = useRef(entry);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const press = (k: string) => {
    const r = pinPress(latest.current, k);
    if (r.state === latest.current) return;
    latest.current = r.state;
    setEntry(r.state);
    const pin = r.complete;
    if (pin)
      timer.current = setTimeout(() => {
        timer.current = null;
        latest.current = emptyPin();
        setEntry(latest.current);
        onComplete(pin);
      }, HAND_OVER_MS);
  };

  return (
    <View style={styles.root}>
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {note ? <AppText style={styles.note}>{note}</AppText> : null}
      <View style={styles.dots} accessible accessibilityRole="text" accessibilityLabel={`${entry.pin.length}けた にゅうりょく ずみ`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < entry.pin.length && styles.dotOn]} />
        ))}
      </View>
      {error ? (
        <AppText weight="bold" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <DigitPad layout="phone" delLabel="1もじ けす" onKey={press} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 14, alignSelf: "stretch" },
  title: { fontSize: 20, textAlign: "center" },
  note: { fontSize: 14, textAlign: "center" },
  dots: { flexDirection: "row", gap: 12 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "rgba(10,10,10,0.4)" },
  dotOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  error: { fontSize: 14, color: colors.red700, textAlign: "center" },
});
