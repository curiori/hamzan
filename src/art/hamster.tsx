import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

// Original hamster character, drawn with react-native-svg (same shapes as the web prototype).

export type Mood = "idle" | "happy" | "oops" | "cheer";

export const FUR = "#E99A4E";
const CREAM = "#FFF4E2";
const PINK = "#F6B8AE";
const INK = "#3A2A20";

export function Seed({ x, y, r = -18, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <Ellipse rx={4.2} ry={7.2} fill="#3F3A36" />
      <Path d="M0 -6 V6 M-2.2 -4 Q-2.8 0 -1.6 4.5 M2.2 -4 Q2.8 0 1.6 4.5" stroke="#F3EBDD" strokeWidth={0.9} fill="none" />
    </G>
  );
}

const SPARKLE = "M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z";

export function HamsterBody({ mood = "idle", wear = null }: { mood?: Mood; wear?: string | null }) {
  const glad = mood === "happy" || mood === "cheer";
  return (
    <G>
      <Circle cx={30} cy={30} r={12} fill={FUR} />
      <Circle cx={90} cy={30} r={12} fill={FUR} />
      <Circle cx={30} cy={31} r={6.5} fill={PINK} />
      <Circle cx={90} cy={31} r={6.5} fill={PINK} />
      <Ellipse cx={40} cy={103} rx={10} ry={5} fill={PINK} />
      <Ellipse cx={80} cy={103} rx={10} ry={5} fill={PINK} />
      <Ellipse cx={60} cy={63} rx={46} ry={42} fill={FUR} />
      <Path d="M20 70 C 24 47, 96 47, 100 70 C 98 98, 22 98, 20 70 Z" fill={CREAM} />
      {glad ? (
        <G stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
          <Path d="M38 52 Q44 45 50 52" />
          <Path d="M70 52 Q76 45 82 52" />
        </G>
      ) : (
        <G>
          <Circle cx={44} cy={51} r={mood === "oops" ? 4.5 : 5.5} fill={INK} />
          <Circle cx={76} cy={51} r={mood === "oops" ? 4.5 : 5.5} fill={INK} />
          <Circle cx={45.6} cy={49.2} r={1.7} fill="#fff" />
          <Circle cx={77.6} cy={49.2} r={1.7} fill="#fff" />
        </G>
      )}
      <Ellipse cx={31} cy={66} rx={8} ry={5} fill="#F59E9E" opacity={0.75} />
      <Ellipse cx={89} cy={66} rx={8} ry={5} fill="#F59E9E" opacity={0.75} />
      <Ellipse cx={60} cy={60} rx={3.4} ry={2.4} fill="#E07A7A" />
      {mood === "oops" ? (
        <Ellipse cx={60} cy={68} rx={2.8} ry={3.4} fill={INK} />
      ) : mood === "cheer" ? (
        <Path d="M53 65 Q60 77 67 65 Z" fill="#B4432B" />
      ) : (
        <Path d="M54 64 Q57 68 60 64 Q63 68 66 64" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      )}
      {mood === "cheer" ? (
        <G fill={PINK}>
          <Ellipse cx={13} cy={40} rx={7} ry={5.5} />
          <Ellipse cx={107} cy={40} rx={7} ry={5.5} />
        </G>
      ) : (
        <G>
          {mood !== "oops" && <Seed x={60} y={83} r={-8} />}
          <Ellipse cx={50} cy={86} rx={7} ry={5} fill={PINK} />
          <Ellipse cx={70} cy={86} rx={7} ry={5} fill={PINK} />
        </G>
      )}
      {mood === "oops" && <Path d="M101 22 C 106 30, 106 34, 101 36 C 96 34, 96 30, 101 22 Z" fill="#7CC4F5" />}
      {glad && (
        <G fill="#F5B700">
          <Path d={SPARKLE} transform="translate(8 14)" />
          <Path d={SPARKLE} transform="translate(112 16) scale(.8)" />
        </G>
      )}
      {wear === "hachimaki" && (
        <G>
          <Path d="M100 29 L115 21 L112 34 Z M100 34 L114 43 L104 45 Z" fill="#fff" stroke="#D1D5DB" />
          <Rect x={17} y={25} width={86} height={12} rx={5} fill="#fff" stroke="#D1D5DB" />
          <SvgText x={60} y={34.5} textAnchor="middle" fontSize={9.5} fontWeight="700" fill="#DC2626">
            合格
          </SvgText>
        </G>
      )}
      {wear === "crown" && (
        <G>
          <Path d="M42 24 L42 9 L51 16 L60 3 L69 16 L78 9 L78 24 Z" fill="#F5C518" stroke="#B8860B" strokeWidth={1.5} strokeLinejoin="round" />
          <Circle cx={60} cy={17} r={2.6} fill="#DC2626" />
          <Circle cx={49} cy={20} r={1.8} fill="#2563EB" />
          <Circle cx={71} cy={20} r={1.8} fill="#2563EB" />
        </G>
      )}
    </G>
  );
}

/** viewBox -6 -4 132 114; `size` is the width in points */
export function Hamster({ mood = "idle", wear = null, size = 80 }: { mood?: Mood; wear?: string | null; size?: number }) {
  return (
    <Svg width={size} height={(size * 114) / 132} viewBox="-6 -4 132 114">
      <HamsterBody mood={mood} wear={wear} />
    </Svg>
  );
}
