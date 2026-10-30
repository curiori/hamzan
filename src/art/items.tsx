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
  swing: { base: null, moving: ART.swing, pivot: { x: 30, y: 0 }, motion: "sway" },
  hammock: { base: null, moving: ART.hammock, pivot: { x: 30, y: 6 }, motion: "sway" },
  ball: { base: BALL_SHADOW, moving: BALL, pivot: { x: 30, y: 40 }, motion: "spin" },
  blocks: { base: BLOCKS_BASE, moving: BLOCKS_TOP, pivot: { x: 29.5, y: 30 }, motion: "sway" },
};
