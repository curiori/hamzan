import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fonts } from "./theme";

export type AppTextProps = TextProps & { weight?: "regular" | "bold"; tone?: "default" | "muted" | "primary" | "inverse" };

export function AppText({ style, weight = "regular", tone = "default", ...rest }: AppTextProps) {
  return <Text {...rest} style={[weight === "bold" ? styles.bold : styles.regular, toneStyles[tone], style]} />;
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
