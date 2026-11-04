import { Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { jSpeech, jText, jTokens, type JInstance, type JProblem, type JTok } from "@/juku/problem";
import { AppText } from "@/ui/text";
import { colors, MAX_FONT_SCALE } from "@/ui/theme";

// Stage 6–9 problems: numbers and signs large, units and words smaller, kanji with their reading above them,
// fractions stacked. Word problems (道のり, おうぎ形, ありえない答え) are set as a sentence that wraps. A question
// in words (no ＝) asks "なん分？" where an expression shows its box: the answer box below is the only box.

/** the reading of a unit after なん (なんぷん) */
const AFTER_NAN: Record<string, string> = { ふん: "ぷん" };

const wordLength = (p: JProblem) =>
  jTokens(p)
    .filter((t) => t.t === "word")
    .reduce((s, t) => s + (t.t === "word" ? t.v.length : 0), 0);

/** a sentence rather than an expression */
export const isSentence = (p: JProblem) => wordLength(p) > 12;

export function jukuFontSize(p: JProblem): number {
  if (isSentence(p)) return 24;
  const len = jText(p).length;
  return len > 16 ? 30 : len > 12 ? 34 : len > 8 ? 40 : 46;
}

function Ruby({ base, reading, size }: { base: string; reading: string; size: number }) {
  return (
    <View style={styles.ruby}>
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: Math.max(9, Math.round(size * 0.45)), lineHeight: Math.max(11, Math.round(size * 0.55)) }}>
        {reading}
      </AppText>
      <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: size }}>
        {base}
      </AppText>
    </View>
  );
}

function Text_({ v, size, tone }: { v: string; size: number; tone?: "muted" }) {
  return (
    <AppText weight="bold" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[{ fontSize: size, fontVariant: ["tabular-nums"] }, tone === "muted" && styles.muted]}>
      {v}
    </AppText>
  );
}

function Frac({ t, size }: { t: Extract<JTok, { t: "frac" }>; size: number }) {
  const small = Math.round(size * 0.62);
  return (
    <View style={styles.row}>
      {t.w ? <Text_ v={String(t.w)} size={size} /> : null}
      <View style={styles.frac}>
        <Text_ v={String(t.n)} size={small} />
        <View style={[styles.bar, { height: Math.max(2, Math.round(size * 0.05)) }]} />
        <Text_ v={String(t.d)} size={small} />
      </View>
    </View>
  );
}

/** The problem as large text; screen readers hear the hiragana reading. */
export function JukuProblemText({ inst, size }: { inst: JInstance; size?: number }) {
  const p = inst.problem;
  const sentence = isSentence(p);
  const fontSize = size ?? jukuFontSize(p);
  const unitSize = sentence ? Math.round(fontSize * 0.9) : Math.round(fontSize * 0.62);
  const wordSize = sentence ? fontSize : Math.max(16, Math.round(fontSize * 0.45));
  const draw = (t: JTok, i: number): ReactNode => {
    switch (t.t) {
      case "num":
        return <Text_ key={i} v={t.v} size={fontSize} />;
      case "op":
        return <Text_ key={i} v={t.v} size={fontSize} />;
      case "frac":
        return <Frac key={i} t={t} size={fontSize} />;
      case "unit":
        return t.r ? <Ruby key={i} base={t.v} reading={t.r} size={unitSize} /> : <Text_ key={i} v={t.v} size={unitSize} />;
      case "box":
        return <View key={i} style={[styles.blank, { width: fontSize * 0.8, height: fontSize * 0.8, borderWidth: Math.max(2, fontSize * 0.07) }]} />;
      case "word":
        if (t.r) return <Ruby key={i} base={t.v} reading={t.r} size={wordSize} />;
        // plain words break between the spaced phrases
        return (
          <Fragment key={i}>
            {t.v
              .split(" ")
              .map((chunk, j, all) => (j < all.length - 1 ? `${chunk} ` : chunk))
              .filter(Boolean)
              .map((chunk, j) => (
                <Text_ key={j} v={chunk} size={wordSize} />
              ))}
          </Fragment>
        );
    }
  };
  const toks = jTokens(p);
  const inWords = !toks.some((t) => t.t === "op" && t.v === "＝");
  const out: ReactNode[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const next = toks[i + 1];
    if (inWords && t.t === "box") {
      // なん, its unit and ？ stay on one line
      const unit = next?.t === "unit" ? next : null;
      out.push(
        <View key={i} style={styles.row}>
          <Text_ v="なん" size={wordSize} />
          {unit ? draw(unit.r ? { ...unit, r: AFTER_NAN[unit.r] ?? unit.r } : unit, i + 1) : null}
          <Text_ v="？" size={wordSize} />
        </View>,
      );
      if (unit) i += 1;
      continue;
    }
    out.push(draw(t, i));
  }
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={jSpeech(p)} testID="problem" style={[styles.row, sentence && styles.sentence]}>
      {out}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" },
  sentence: { justifyContent: "flex-start", rowGap: 4, alignSelf: "stretch" },
  ruby: { alignItems: "center" },
  frac: { alignItems: "center", marginHorizontal: 3, marginBottom: 2 },
  bar: { alignSelf: "stretch", backgroundColor: colors.foreground, borderRadius: 1, marginVertical: 1 },
  blank: { marginHorizontal: 4, marginBottom: 6, borderRadius: 6, borderColor: colors.foreground },
  muted: { color: colors.mutedForeground },
});
