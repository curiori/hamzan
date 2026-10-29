import { Platform } from "react-native";

// Colors converted once from the web prototype's index.css (oklch) plus the Tailwind shades its screens used.
export const colors = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  primary: "#8d5901",
  primaryForeground: "#fcfcfc",
  muted: "#f5f5f5",
  mutedForeground: "#6c6c6c",
  border: "#e5e5e5",
  destructive: "#e7000b",
  chart1: "#8d5901",
  chart2: "#1c9388",
  chart3: "#1380c7",
  amber50: "#fffbeb",
  amber100: "#fef3c7",
  amber200: "#fde68a",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber600: "#d97706",
  amber700: "#b45309",
  amber800: "#92400e",
  amber950: "#451a03",
  green50: "#f0fdf4",
  green100: "#dcfce7",
  green600: "#16a34a",
  green700: "#15803d",
  green900: "#14532d",
  sky500: "#0ea5e9",
  sky600: "#0284c7",
  sky700: "#0369a1",
  orange100: "#ffedd5",
  orange600: "#ea580c",
  orange700: "#c2410c",
  orange800: "#9a3412",
  orange900: "#7c2d12",
  red50: "#fef2f2",
  red600: "#dc2626",
  red700: "#b91c1c",
  red800: "#991b1b",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** 4-point spacing scale */
export const space = (n: number) => n * 4;

// iOS ships Hiragino Maru Gothic (rounded) and Hiragino Sans; other platforms use the system font.
export const fonts = {
  body: Platform.select({ ios: "Hiragino Maru Gothic ProN", default: undefined }),
  heavy: Platform.select({ ios: "Hiragino Sans", default: undefined }),
};

/** cap for Dynamic Type on dense screens (play screen) */
export const MAX_FONT_SCALE = 1.3;
