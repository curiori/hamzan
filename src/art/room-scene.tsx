import { View } from "react-native";
import Svg, { G, Path, Rect, Circle } from "react-native-svg";
import { REWARDS } from "@/game/achievements";
import { HamsterBody, type Mood } from "./hamster";
import { ART } from "./items";

// Back-to-front drawing order and placement [x, y, scale] in the 400×220 room (web prototype layout).
const SPOTS: [string, number, number, number][] = [
  ["hammock", 330, 6, 1.1],
  ["swing", 248, 0, 1.15],
  ["flower", 170, 43, 0.75],
  ["desk", 10, 104, 1.35],
  ["wheel", 92, 82, 1.5],
  ["house", 300, 92, 1.5],
  ["tunnel", 12, 166, 0.95],
  ["bowl", 284, 170, 0.8],
];

export function RoomBackground() {
  return (
    <G>
      <Rect width={400} height={220} fill="#FBF1DF" />
      <Rect x={150} y={22} width={92} height={66} rx={6} fill="#BFE3F7" stroke="#D9B57A" strokeWidth={4} />
      <Circle cx={222} cy={40} r={8} fill="#FFD25A" />
      <Path d="M196 22 V88 M150 55 H242" stroke="#D9B57A" strokeWidth={3} />
      <Rect x={144} y={86} width={104} height={7} rx={2} fill="#D9B57A" />
      <Rect y={160} width={400} height={60} fill="#EFD3A0" />
      <Path d="M0 160 H400" stroke="#D9B57A" strokeWidth={2} />
      <Path
        d="M30 202 l8 -2 M96 190 l7 2 M150 206 l9 -1 M232 212 l8 1 M336 198 l7 -2 M372 212 l8 1 M200 180 l6 2"
        stroke="#D9B57A"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Static room: the owned goods in their spots and the hamster in the middle. */
export function RoomScene({ owned, wear, mood = "idle", name, width }: { owned: string[]; wear: string | null; mood?: Mood; name: string; width: number }) {
  const goods = REWARDS.filter((i) => owned.includes(i.id) && !i.wear);
  const label = `${name}のおへや。${goods.length ? `${goods.map((g) => g.name).join("、")}があります` : "グッズはまだありません"}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={(width * 220) / 400} viewBox="0 0 400 220">
        <RoomBackground />
        {SPOTS.filter(([id]) => owned.includes(id)).map(([id, x, y, s]) => (
          <G key={id} transform={`translate(${x} ${y}) scale(${s})`}>
            {ART[id]}
          </G>
        ))}
        <G transform="translate(190 124) scale(0.7)">
          <HamsterBody mood={mood} wear={wear} />
        </G>
      </Svg>
    </View>
  );
}
