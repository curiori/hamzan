// How text grows with the system's text size. Pure (no React Native), so bun can test it.

/** The most text grows outside practice; practice keeps MAX_FONT_SCALE (1.3) so the problem and the keys fit. */
export const MAX_FONT_SCALE_UI = 1.5;

/** A text style's size and line height at `scale` times, but never more than `cap` times; what is missing stays missing. */
export function scaledFont(style: { fontSize?: number; lineHeight?: number }, scale: number, cap: number): { fontSize?: number; lineHeight?: number } {
  const k = Math.min(scale, cap);
  const out: { fontSize?: number; lineHeight?: number } = {};
  if (style.fontSize !== undefined) out.fontSize = style.fontSize * k;
  if (style.lineHeight !== undefined) out.lineHeight = style.lineHeight * k;
  return out;
}
