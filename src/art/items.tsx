import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";
import type { Point } from "@/game/room";
import { Seed } from "./hamster";

const WHEEL_STAND = <Path d="M30 30 L14 58 M30 30 L46 58" stroke="#8B6B4A" strokeWidth={4} strokeLinecap="round" />;
const WHEEL_ROTOR = (
  <G>
    <Circle cx={30} cy={28} r={24} fill="none" stroke="#4E9BD1" strokeWidth={4} />
    <Circle cx={30} cy={28} r={19} fill="none" stroke="#9CCBEA" strokeWidth={3} strokeDasharray="3 4" />
    <Path d="M30 4 V52 M6 28 H54 M13 11 L47 45 M47 11 L13 45" stroke="#4E9BD1" strokeWidth={1.5} />
    <Circle cx={30} cy={28} r={3} fill="#2F6E99" />
  </G>
);

const BALL_SHADOW = <Ellipse cx={30} cy={57} rx={14} ry={2.5} fill="#000" opacity={0.12} />;
const BALL = (
  <G>
    <Circle cx={30} cy={40} r={16} fill="#FDE68A" />
    <Path d="M30 40 L30 24 A16 16 0 0 1 43.9 48 Z" fill="#F87171" />
    <Path d="M30 40 L43.9 48 A16 16 0 0 1 16.1 48 Z" fill="#60A5FA" />
    <Circle cx={30} cy={40} r={16} fill="none" stroke="#9CA3AF" strokeWidth={1.5} />
    <Circle cx={30} cy={40} r={2.5} fill="#fff" />
  </G>
);

const BLOCKS_BASE = (
  <G>
    <Rect x={11} y={44} width={17} height={14} rx={2} fill="#60A5FA" stroke="#3B82F6" />
    <Rect x={31} y={44} width={17} height={14} rx={2} fill="#F87171" stroke="#EF4444" />
    <Rect x={20} y={30} width={19} height={14} rx={2} fill="#FBBF24" stroke="#F59E0B" />
  </G>
);
const BLOCKS_TOP = <Path d="M20 30 L29.5 15 L39 30 Z" fill="#34D399" stroke="#10B981" strokeLinejoin="round" />;

const GOLD_STAND = <Path d="M30 30 L14 58 M30 30 L46 58" stroke="#A16207" strokeWidth={4} strokeLinecap="round" />;
const GOLD_ROTOR = (
  <G>
    <Circle cx={30} cy={28} r={24} fill="none" stroke="#EAB308" strokeWidth={4} />
    <Circle cx={30} cy={28} r={19} fill="none" stroke="#FDE68A" strokeWidth={3} strokeDasharray="3 4" />
    <Path d="M30 4 V52 M6 28 H54 M13 11 L47 45 M47 11 L13 45" stroke="#CA8A04" strokeWidth={1.5} />
    <Circle cx={30} cy={28} r={3} fill="#A16207" />
  </G>
);
const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`;
/** the stars that twinkle around the golden wheel while it turns (in its 60×60 box) */
export const GOLD_SPARKLES = <Path d={`${sparkle(6, 8, 5)} ${sparkle(54, 14, 4)} ${sparkle(52, 50, 3.5)}`} fill="#FDE047" stroke="#EAB308" strokeWidth={0.6} />;

// Room goods drawn in a 60×60 box (same shapes as the web prototype).
export const ART: Record<string, ReactNode> = {
  bowl: (
    <G>
      <Ellipse cx={30} cy={46} rx={24} ry={8} fill="#DCE7F2" stroke="#8FA8C0" strokeWidth={2} />
      <Ellipse cx={30} cy={42} rx={19} ry={5} fill="#F6E7C8" />
      <Seed x={23} y={41} r={70} s={0.6} />
      <Seed x={33} y={40} r={-60} s={0.6} />
      <Seed x={29} y={43} r={15} s={0.6} />
      <Seed x={38} y={43} r={80} s={0.6} />
    </G>
  ),
  wheel: (
    <G>
      {WHEEL_STAND}
      {WHEEL_ROTOR}
    </G>
  ),
  house: (
    <G>
      <Rect x={8} y={26} width={44} height={30} rx={2} fill="#D39A62" />
      <Path d="M12 34 H48 M12 42 H22 M38 42 H48 M12 50 H22 M38 50 H48" stroke="#B57D47" strokeWidth={1.2} />
      <Path d="M4 29 L30 6 L56 29 Z" fill="#9C6234" />
      <Path d="M23 56 V44 A7 7 0 0 1 37 44 V56 Z" fill="#5C3A1E" />
    </G>
  ),
  tunnel: (
    <G>
      <Path d="M4 56 A26 26 0 0 1 56 56 Z" fill="#7DBB7A" />
      <Path d="M15 56 A15 15 0 0 1 45 56 Z" fill="#2F4F2E" opacity={0.75} />
      <Path d="M8 50 A22 22 0 0 1 20 34 M40 34 A22 22 0 0 1 52 50" stroke="#A9D6A6" strokeWidth={2} fill="none" />
    </G>
  ),
  hachimaki: (
    <G>
      <Path d="M46 25 L58 17 L56 30 Z M46 32 L57 40 L49 42 Z" fill="#fff" stroke="#D1D5DB" />
      <Rect x={3} y={21} width={47} height={15} rx={6} fill="#fff" stroke="#D1D5DB" />
      <SvgText x={26.5} y={32.5} textAnchor="middle" fontSize={10.5} fontWeight="700" fill="#DC2626">
        合格
      </SvgText>
    </G>
  ),
  desk: (
    <G>
      <Rect x={11} y={10} width={7} height={22} fill="#4C78A8" />
      <Rect x={19} y={13} width={6} height={19} fill="#E45756" />
      <Rect x={26} y={8} width={8} height={24} fill="#54A24B" />
      <Rect x={36} y={14} width={6} height={18} fill="#F2C14E" transform="rotate(12 39 23)" />
      <Rect x={4} y={32} width={52} height={6} rx={1.5} fill="#A0703F" />
      <Rect x={8} y={38} width={5} height={20} fill="#8A5E33" />
      <Rect x={47} y={38} width={5} height={20} fill="#8A5E33" />
    </G>
  ),
  flower: (
    <G>
      <Path d="M30 46 V22" stroke="#3F8F3A" strokeWidth={3} />
      <Ellipse cx={23} cy={36} rx={7} ry={3.5} fill="#4CA64C" transform="rotate(-25 23 36)" />
      <Ellipse cx={37} cy={33} rx={7} ry={3.5} fill="#4CA64C" transform="rotate(25 37 33)" />
      {Array.from({ length: 10 }, (_, i) => (
        <Ellipse key={i} cx={30} cy={7} rx={3} ry={6} fill="#F7C531" transform={`rotate(${i * 36} 30 16)`} />
      ))}
      <Circle cx={30} cy={16} r={5.5} fill="#6B4423" />
      <Path d="M19 44 H41 L38 58 H22 Z" fill="#C8643C" />
    </G>
  ),
  // hung low enough that a hamster sitting on them stays inside the room (its feet at y 56 or lower)
  swing: (
    <G>
      <Path d="M14 0 V49 M46 0 V49" stroke="#8B6B4A" strokeWidth={2} />
      <Rect x={8} y={49} width={44} height={7} rx={3} fill="#D39A62" stroke="#9C6234" />
    </G>
  ),
  hammock: (
    <G>
      <Path d="M4 6 L14 39 M56 6 L46 39" stroke="#8B6B4A" strokeWidth={2} />
      <Path d="M12 37 Q30 63 48 37 Q30 51 12 37 Z" fill="#E87D7D" />
      <Path d="M16 41 Q30 55 44 41" stroke="#F7B4B4" strokeWidth={2} fill="none" />
    </G>
  ),
  crown: (
    <G>
      <Path d="M8 46 L8 18 L20 30 L30 10 L40 30 L52 18 L52 46 Z" fill="#F5C518" stroke="#B8860B" strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={30} cy={34} r={4} fill="#DC2626" />
      <Circle cx={17} cy={38} r={2.6} fill="#2563EB" />
      <Circle cx={43} cy={38} r={2.6} fill="#2563EB" />
    </G>
  ),
  // shop goods
  ball: (
    <G>
      {BALL_SHADOW}
      {BALL}
    </G>
  ),
  blocks: (
    <G>
      {BLOCKS_BASE}
      {BLOCKS_TOP}
    </G>
  ),
  grass: (
    <G>
      <Path d="M24 46 Q19 32 13 24 M28 46 Q26 30 24 15 M32 46 Q34 30 37 13 M36 46 Q41 33 47 25 M30 46 Q30 34 30 22" stroke="#4CA64C" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M19 44 H41 L38 58 H22 Z" fill="#A16207" />
      <Rect x={17} y={42} width={26} height={5} rx={2} fill="#854D0E" />
    </G>
  ),
  cushion: (
    <G>
      <Ellipse cx={30} cy={49} rx={25} ry={9} fill="#F472B6" />
      <Ellipse cx={30} cy={46} rx={21} ry={7} fill="#FBCFE8" />
      <Path d="M22 46 Q30 50 38 46" stroke="#F9A8D4" strokeWidth={2} fill="none" />
      <Circle cx={6} cy={50} r={2.5} fill="#DB2777" />
      <Circle cx={54} cy={50} r={2.5} fill="#DB2777" />
    </G>
  ),
  ladder: (
    <G>
      <Path d="M18 4 V58 M42 4 V58" stroke="#A0703F" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M18 12 H42 M18 22 H42 M18 32 H42 M18 42 H42 M18 52 H42" stroke="#C08A52" strokeWidth={3} />
    </G>
  ),
  lamp: (
    <G>
      <Rect x={6} y={21} width={7} height={22} rx={2} fill="#8A5E33" />
      <Path d="M13 34 H24 Q30 34 30 29" stroke="#A0703F" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx={30} cy={30} r={5} fill="#FCD34D" />
      <Path d="M16 30 L22 10 H38 L44 30 Z" fill="#FDE68A" stroke="#D97706" strokeWidth={1.5} strokeLinejoin="round" />
    </G>
  ),
  bookshelf: (
    <G>
      <Rect x={8} y={4} width={44} height={54} rx={2} fill="#A0703F" />
      <Rect x={11} y={7} width={38} height={48} fill="#7A532D" />
      <Rect x={11} y={21} width={38} height={3} fill="#A0703F" />
      <Rect x={11} y={37} width={38} height={3} fill="#A0703F" />
      <Rect x={13} y={10} width={5} height={11} fill="#E45756" />
      <Rect x={19} y={12} width={4} height={9} fill="#4C78A8" />
      <Rect x={24} y={9} width={5} height={12} fill="#F2C14E" />
      <Rect x={30} y={11} width={4} height={10} fill="#54A24B" />
      <Rect x={37} y={15} width={10} height={6} rx={1} fill="#B279A2" />
      <Rect x={13} y={26} width={4} height={11} fill="#54A24B" />
      <Rect x={18} y={27} width={6} height={10} fill="#E45756" />
      <Rect x={25} y={25} width={4} height={12} fill="#4C78A8" />
      <Rect x={32} y={26} width={5} height={11} fill="#F2C14E" transform="rotate(10 34.5 31.5)" />
      <Rect x={40} y={27} width={5} height={10} fill="#72B7B2" />
      <Rect x={13} y={42} width={6} height={13} fill="#4C78A8" />
      <Rect x={20} y={44} width={4} height={11} fill="#F58518" />
      <Rect x={25} y={42} width={5} height={13} fill="#E45756" />
      <Rect x={31} y={45} width={4} height={10} fill="#54A24B" />
      <Rect x={36} y={43} width={6} height={12} fill="#B279A2" />
    </G>
  ),
  // the hamster climbs the ladder to the platform (18, 10) and slides down to (44, 56)
  slide: (
    <G>
      <Path d="M38 38 V58" stroke="#8B6B4A" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M22 11 Q27 32 41 50 Q47 57 58 57 L58 60 Q45 60 38 52 Q24 33 18 13 Z" fill="#60A5FA" stroke="#2563EB" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M12 10 V58 M20 10 V58" stroke="#8B6B4A" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M12 18 H20 M12 26 H20 M12 34 H20 M12 42 H20 M12 50 H20" stroke="#A0703F" strokeWidth={2} />
      <Rect x={9} y={8} width={16} height={4} rx={1.5} fill="#E45756" />
    </G>
  ),
  // hung low enough that a hamster walking across stays inside the room (the planks' top at y 50)
  bridge: (
    <G>
      <Path d="M4 0 V52 M56 0 V52" stroke="#8B6B4A" strokeWidth={2} />
      <Path d="M4 40 Q30 46 56 40" stroke="#8B6B4A" strokeWidth={1.5} fill="none" />
      <Path d="M12 42 V50 M20 43.5 V50 M28 44.5 V50 M36 44.2 V50 M44 43 V50 M52 41 V50" stroke="#A0703F" strokeWidth={1} />
      {Array.from({ length: 9 }, (_, i) => (
        <Rect key={i} x={4 + i * 5.9} y={50} width={5} height={4} rx={1} fill="#D39A62" stroke="#9C6234" strokeWidth={0.6} />
      ))}
      <Path d="M4 52 H56" stroke="#8B6B4A" strokeWidth={1.2} />
    </G>
  ),
  bed: (
    <G>
      <Rect x={2} y={26} width={12} height={32} rx={5} fill="#A0703F" />
      <Rect x={6} y={40} width={50} height={16} rx={6} fill="#C08A52" />
      <Ellipse cx={31} cy={42} rx={23} ry={6} fill="#FFF7ED" />
      <Ellipse cx={17} cy={39} rx={8} ry={4.5} fill="#fff" stroke="#E5E7EB" strokeWidth={1} />
      <Path d="M24 44 Q40 39 56 44 L56 53 Q40 57 24 53 Z" fill="#93C5FD" />
      <Path d="M27 47 Q40 43 53 47" stroke="#BFDBFE" strokeWidth={2} fill="none" />
      <Rect x={8} y={55} width={4} height={4} fill="#8A5E33" />
      <Rect x={50} y={55} width={4} height={4} fill="#8A5E33" />
    </G>
  ),
  // the hamster walks over the keys at y 50, from x 8 to 52
  piano: (
    <G>
      <Rect x={4} y={22} width={52} height={26} rx={4} fill="#DC2626" />
      <Rect x={9} y={27} width={42} height={7} rx={2} fill="#FCA5A5" opacity={0.55} />
      <Rect x={4} y={46} width={52} height={8} fill="#fff" stroke="#9CA3AF" strokeWidth={0.8} />
      <Path d="M10.5 46 V54 M17 46 V54 M23.5 46 V54 M30 46 V54 M36.5 46 V54 M43 46 V54 M49.5 46 V54" stroke="#9CA3AF" strokeWidth={0.8} />
      <G fill="#111827">
        <Rect x={8.5} y={46} width={4} height={4.5} />
        <Rect x={15} y={46} width={4} height={4.5} />
        <Rect x={28} y={46} width={4} height={4.5} />
        <Rect x={34.5} y={46} width={4} height={4.5} />
        <Rect x={41} y={46} width={4} height={4.5} />
      </G>
      <Rect x={8} y={54} width={4} height={4} fill="#7F1D1D" />
      <Rect x={48} y={54} width={4} height={4} fill="#7F1D1D" />
    </G>
  ),
  goldwheel: (
    <G>
      {GOLD_STAND}
      {GOLD_ROTOR}
      {GOLD_SPARKLES}
    </G>
  ),
  // shop wear, as the list shows them
  ribbon: (
    <G>
      <Path d="M30 30 L9 16 L11 44 Z M30 30 L51 16 L49 44 Z" fill="#F472B6" stroke="#DB2777" strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={30} cy={30} r={6} fill="#DB2777" />
    </G>
  ),
  glasses: (
    <G fill="none" stroke="#1F2937" strokeWidth={3}>
      <Circle cx={18} cy={32} r={11} fill="#E0F2FE" />
      <Circle cx={42} cy={32} r={11} fill="#E0F2FE" />
      <Path d="M29 30 Q30 26 31 30 M7 30 L2 26 M53 30 L58 26" strokeLinecap="round" />
    </G>
  ),
  scarf: (
    <G>
      <Path d="M6 20 Q30 32 54 20 L54 30 Q30 42 6 30 Z" fill="#EF4444" />
      <Rect x={36} y={30} width={12} height={24} rx={3} fill="#EF4444" />
      <Path d="M38 40 H46 M38 46 H46" stroke="#FCA5A5" strokeWidth={2} />
      <Path d="M14 26 Q30 34 46 26" stroke="#FCA5A5" strokeWidth={2} fill="none" />
    </G>
  ),
  beret: (
    <G>
      <Ellipse cx={30} cy={34} rx={24} ry={10} fill="#1E3A8A" />
      <Path d="M8 37 Q30 45 52 37" stroke="#172554" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M30 24 L32 16" stroke="#1E3A8A" strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  headphones: (
    <G>
      <Path d="M12 40 Q12 10 30 10 Q48 10 48 40" stroke="#374151" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Rect x={5} y={34} width={13} height={19} rx={5} fill="#EF4444" />
      <Rect x={42} y={34} width={13} height={19} rx={5} fill="#EF4444" />
      <Rect x={9} y={38} width={5} height={11} rx={2} fill="#B91C1C" />
      <Rect x={46} y={38} width={5} height={11} rx={2} fill="#B91C1C" />
    </G>
  ),
  // snacks
  broccoli: (
    <G>
      <Rect x={26} y={34} width={8} height={20} rx={3} fill="#86C06C" />
      <Circle cx={21} cy={30} r={9} fill="#4C9A3F" />
      <Circle cx={39} cy={30} r={9} fill="#4C9A3F" />
      <Circle cx={30} cy={22} r={10} fill="#5DAE4E" />
      <Circle cx={30} cy={33} r={7} fill="#4C9A3F" />
    </G>
  ),
  apple: (
    <G>
      <Circle cx={30} cy={36} r={18} fill="#EF4444" />
      <Ellipse cx={23} cy={30} rx={4} ry={6} fill="#FCA5A5" />
      <Path d="M30 18 Q31 12 34 9" stroke="#7C4A1E" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Ellipse cx={39} cy={13} rx={6} ry={3} fill="#4CA64C" transform="rotate(-20 39 13)" />
    </G>
  ),
  carrot: (
    <G>
      <Path d="M24 18 L18 5 M29 18 L29 3 M33 19 L40 6" stroke="#4CA64C" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M20 18 Q30 14 40 20 L29 57 Z" fill="#F97316" />
      <Path d="M25 28 H31 M27 38 H32 M28 47 H31" stroke="#C2410C" strokeWidth={1.5} strokeLinecap="round" />
    </G>
  ),
  // room styles, as samples
  "wall-sky": (
    <G>
      <Rect x={6} y={6} width={48} height={48} rx={8} fill="#CDEBFA" />
      <Ellipse cx={22} cy={22} rx={10} ry={5} fill="#fff" />
      <Ellipse cx={39} cy={38} rx={9} ry={4.5} fill="#fff" />
    </G>
  ),
  "wall-forest": (
    <G>
      <Rect x={6} y={6} width={48} height={48} rx={8} fill="#D7EFD0" />
      <Rect x={18} y={32} width={5} height={16} fill="#9C7650" />
      <Circle cx={20.5} cy={27} r={10} fill="#7DBB7A" />
      <Rect x={38} y={36} width={4} height={12} fill="#9C7650" />
      <Circle cx={40} cy={32} r={8} fill="#5E9E58" />
    </G>
  ),
  "wall-night": (
    <G>
      <Rect x={6} y={6} width={48} height={48} rx={8} fill="#1F2B57" />
      <Path d="M38 13 A11 11 0 1 0 47 31 A9 9 0 1 1 38 13 Z" fill="#FDE68A" />
      <G fill="#FFF6C8">
        <Circle cx={16} cy={18} r={1.8} />
        <Circle cx={24} cy={40} r={1.4} />
        <Circle cx={14} cy={46} r={1.2} />
        <Circle cx={44} cy={44} r={1.6} />
      </G>
    </G>
  ),
  "floor-grass": (
    <G>
      <Rect x={6} y={6} width={48} height={48} rx={8} fill="#A8D98F" />
      <Path d="M14 44 l3 -8 l3 8 M30 28 l3 -8 l3 8 M40 46 l3 -8 l3 8 M18 22 l3 -7 l3 7" stroke="#5A9E4B" strokeWidth={2} fill="none" strokeLinejoin="round" />
    </G>
  ),
};

export function ItemThumb({ id, size = 44 }: { id: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {ART[id]}
    </Svg>
  );
}

/** A room good split into the still part and the part that turns or sways around `pivot` (in the 60×60 box). */
export interface ItemParts {
  base: ReactNode;
  moving?: ReactNode;
  pivot?: Point;
  /** how the moving part goes while the hamster plays with the good */
  motion?: "spin" | "sway";
}

export const ITEM_PARTS: Record<string, ItemParts> = {
  ...Object.fromEntries(Object.entries(ART).map(([id, art]) => [id, { base: art }])),
  wheel: { base: WHEEL_STAND, moving: WHEEL_ROTOR, pivot: { x: 30, y: 28 }, motion: "spin" },
  goldwheel: { base: GOLD_STAND, moving: GOLD_ROTOR, pivot: { x: 30, y: 28 }, motion: "spin" },
  swing: { base: null, moving: ART.swing, pivot: { x: 30, y: 0 }, motion: "sway" },
  hammock: { base: null, moving: ART.hammock, pivot: { x: 30, y: 6 }, motion: "sway" },
  ball: { base: BALL_SHADOW, moving: BALL, pivot: { x: 30, y: 40 }, motion: "spin" },
  blocks: { base: BLOCKS_BASE, moving: BLOCKS_TOP, pivot: { x: 29.5, y: 30 }, motion: "sway" },
};
