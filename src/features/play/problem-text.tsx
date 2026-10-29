import { StyleSheet, View } from "react-native";
import { display, speech, type Problem, type ProblemInstance } from "@/domain/problem";
import { LEVEL } from "@/domain/spec";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE } from "@/ui/theme";

/** Indices of the two chain terms that make a round 100 or 10 (PAIR_FIRST hint). */
export function pairTerms(p: Problem): number[] {
  if (p.shape !== "chain" || !p.ops.every((o) => o === "+")) return [];
  const t = p.terms;
  for (const mod of [100, 10])
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if ((t[i] + t[j]) % mod === 0) return [i, j];
  return [];
}

export const problemFontSize = (p: Problem) => {
  const len = display(p).length;
  return len > 12 ? 34 : len > 9 ? 42 : 50;
};

function Ruby({ base, reading, size }: { base: string; reading: string; size: number }) {
  return (
    <View style={styles.ruby}>
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: size * 0.32, lineHeight: size * 0.4 }}>
        {reading}
      </AppText>
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: size }}>
        {base}
      </AppText>
    </View>
  );
}

/** The problem as large text; screen readers hear the hiragana reading from speech(). */
export function ProblemText({ inst, hint, size }: { inst: ProblemInstance; hint?: boolean; size?: number }) {
  const p = inst.problem;
  const fontSize = size ?? problemFontSize(p);
  const pair = hint && LEVEL[inst.levelId].scaffoldKind === "PAIR_FIRST" ? pairTerms(p) : [];
  let termIndex = -1;
  const parts = display(p).split(/(\d+|□|の半分|の倍数？)/g).filter(Boolean);
  const text = (s: string, key: number, highlight = false) => (
    <AppText
      key={key}
      weight="bold"
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[{ fontSize, fontVariant: ["tabular-nums"] }, highlight && styles.pair]}
    >
      {s}
    </AppText>
  );
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={speech(p)} testID="problem" style={styles.row}>
      {parts.map((part, i) => {
        if (/^\d+$/.test(part)) {
          termIndex += 1;
          return text(part, i, pair.includes(termIndex));
        }
        if (part === "□") return <View key={i} style={[styles.blank, { width: fontSize * 0.8, height: fontSize * 0.8, borderWidth: fontSize * 0.07 }]} />;
        if (part === "の半分")
          return (
            <View key={i} style={styles.row}>
              {text("の", i)}
              <Ruby base="半分" reading="はんぶん" size={fontSize} />
            </View>
          );
        if (part === "の倍数？")
          return (
            <View key={i} style={styles.row}>
              {text("の", i)}
              <Ruby base="倍数" reading="ばいすう" size={fontSize} />
              {text("？", i + 1000)}
            </View>
          );
        return text(part, i);
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" },
  ruby: { alignItems: "center" },
  pair: { backgroundColor: colors.amber200, color: colors.amber950, borderRadius: 8, overflow: "hidden" },
  blank: { marginHorizontal: 4, marginBottom: 6, borderRadius: 6, borderColor: colors.foreground },
});
