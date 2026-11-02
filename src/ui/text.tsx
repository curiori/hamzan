import { createContext, useContext } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { MAX_FONT_SCALE_UI, scaledFont } from "./font-scale";
import { colors, fonts } from "./theme";

export type AppTextProps = TextProps & { weight?: "regular" | "bold"; tone?: "default" | "muted" | "primary" | "inverse" };

/**
 * The text size to show on the web, as a multiple (the iPhone's own text size setting is not seen there). Lets the
 * web preview show a screen as an iPhone set to larger text would; on the iPhone it stays 1 and the system scales.
 */
export const TextScaleContext = createContext(1);

/** How many times text is grown right now, up to `cap`: the iPhone's text size, or on the web the preview's. */
export function useTextScale(cap = MAX_FONT_SCALE_UI): number {
  const preview = useContext(TextScaleContext);
  const { fontScale } = useWindowDimensions();
  return Math.min(Platform.OS === "web" ? preview : fontScale, cap);
}

/** Text in the app's fonts. It grows with the system's text size up to 1.5 times unless `maxFontSizeMultiplier` says otherwise. */
export function AppText({ style, weight = "regular", tone = "default", maxFontSizeMultiplier = MAX_FONT_SCALE_UI, ...rest }: AppTextProps) {
  const scale = useContext(TextScaleContext);
  const own: StyleProp<TextStyle> = [weight === "bold" ? styles.bold : styles.regular, toneStyles[tone], style];
  // as on iOS: 0 (or null) means no cap, and text that does not follow the setting stays as it is
  const grown =
    Platform.OS === "web" && scale !== 1 && rest.allowFontScaling !== false
      ? scaledFont(StyleSheet.flatten(own) ?? {}, scale, maxFontSizeMultiplier && maxFontSizeMultiplier >= 1 ? maxFontSizeMultiplier : Infinity)
      : null;
  return <Text {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={grown ? [own, grown] : own} />;
}

const styles = StyleSheet.create({
  regular: { fontFamily: fonts.body, fontSize: 16 },
  bold: { fontFamily: fonts.heavy, fontWeight: "800", fontSize: 16 },
});

const toneStyles = StyleSheet.create({
  default: { color: colors.foreground },
  muted: { color: colors.mutedForeground },
  primary: { color: colors.primary },
  inverse: { color: colors.primaryForeground },
});
