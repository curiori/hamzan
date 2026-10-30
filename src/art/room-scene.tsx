import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { placedGoods, ROOM_H, ROOM_W, SLOTS, type Point, type RoomLayout } from "@/game/room";
import { itemName } from "@/game/shop";
import { HamsterBody, type Mood } from "./hamster";
import { ART } from "./items";

/** where the hamster stands in the still room */
const STILL_HAMSTER: Point = { x: 200, y: 222 };
/** HamsterBody's feet in its own units, and its scale in the room */
export const BODY_FEET: Point = { x: 60, y: 108 };
export const BODY_SCALE = 0.5;

const FLOOR_MARKS = "M30 222 l8 -2 M96 206 l7 2 M150 248 l9 -1 M232 240 l8 1 M336 230 l7 -2 M372 252 l8 1 M200 196 l6 2 M118 238 l7 1";
const GRASS_TUFTS =
  "M30 224 l3 -7 l3 7 M96 208 l3 -7 l3 7 M150 250 l3 -7 l3 7 M232 242 l3 -7 l3 7 M336 232 l3 -7 l3 7 M370 254 l3 -6 l3 6 M200 198 l3 -6 l3 6 M118 240 l3 -7 l3 7 M270 206 l3 -6 l3 6 M60 250 l3 -6 l3 6";

/** wall colors of the wallpapers (null is the original look) */
const WALL: Record<string, string> = { "wall-sky": "#CDEBFA", "wall-forest": "#D7EFD0", "wall-night": "#1F2B57" };
/** trees on the forest wallpaper, clear of the window (x 150-242, y 22-88) */
const TREES = [40, 112, 288, 362];
const STARS: [number, number, number][] = [
  [30, 30, 2],
  [72, 70, 1.6],
  [112, 26, 2.2],
  [262, 32, 1.8],
  [300, 92, 1.5],
  [380, 104, 2],
  [22, 128, 1.6],
  [128, 122, 1.4],
  [252, 140, 2],
  [330, 156, 1.6],
  [64, 160, 1.8],
  [196, 150, 1.4],
];

/** Wall, window and floor of the 400×260 room, in the child's wallpaper and floor (null is the original look). */
export function RoomBackground({ wallpaper = null, floor = null }: { wallpaper?: string | null; floor?: string | null }) {
  const grass = floor === "floor-grass";
  return (
    <G>
      <Rect width={ROOM_W} height={ROOM_H} fill={(wallpaper && WALL[wallpaper]) || "#FBF1DF"} />
      {wallpaper === "wall-sky" ? (
        <G fill="#fff" opacity={0.9}>
          <Ellipse cx={62} cy={30} rx={22} ry={8} />
          <Ellipse cx={300} cy={62} rx={26} ry={9} />
          <Ellipse cx={352} cy={132} rx={18} ry={7} />
          <Ellipse cx={92} cy={140} rx={20} ry={7} />
        </G>
      ) : null}
      {wallpaper === "wall-forest" ? (
        <G>
          {TREES.map((x) => (
            <G key={x}>
              <Rect x={x - 4} y={118} width={8} height={57} fill="#B89470" />
              <Circle cx={x} cy={104} r={26} fill="#A8D69E" />
              <Circle cx={x - 15} cy={118} r={15} fill="#93C98A" />
              <Circle cx={x + 15} cy={116} r={16} fill="#93C98A" />
            </G>
          ))}
        </G>
      ) : null}
      {wallpaper === "wall-night" ? (
        <G>
          <G fill="#FFF6C8">
            {STARS.map(([x, y, r]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
            ))}
          </G>
          <Path d="M332 34 A24 24 0 1 0 356 74 A19 19 0 1 1 332 34 Z" fill="#FDE68A" />
        </G>
      ) : null}
      <Rect x={150} y={22} width={92} height={66} rx={6} fill="#BFE3F7" stroke="#D9B57A" strokeWidth={4} />
      <Circle cx={222} cy={40} r={8} fill="#FFD25A" />
      <Path d="M196 22 V88 M150 55 H242" stroke="#D9B57A" strokeWidth={3} />
      <Rect x={144} y={86} width={104} height={7} rx={2} fill="#D9B57A" />
      <Rect y={175} width={ROOM_W} height={ROOM_H - 175} fill={grass ? "#A8D98F" : "#EFD3A0"} />
      <Path d={`M0 175 H${ROOM_W}`} stroke={grass ? "#5A9E4B" : "#D9B57A"} strokeWidth={2} />
      {grass ? (
        <Path d={GRASS_TUFTS} stroke="#5A9E4B" strokeWidth={2} fill="none" strokeLinejoin="round" />
      ) : (
        <Path d={FLOOR_MARKS} stroke="#D9B57A" strokeWidth={2} strokeLinecap="round" />
      )}
    </G>
  );
}

/** A good's drawing at its slot. */
export function SlotArt({ slot, children }: { slot: (typeof SLOTS)[keyof typeof SLOTS]; children: ReactNode }) {
  return <G transform={`translate(${slot.x} ${slot.y}) scale(${slot.scale})`}>{children}</G>;
}

/** Still room: the goods in their slots and the hamster in the middle (the diagnosis screen and the shop's previews). */
export function RoomScene({
  layout,
  wear,
  mood = "idle",
  name,
  width,
  wallpaper = null,
  floor = null,
}: {
  layout: RoomLayout;
  wear: string | null;
  mood?: Mood;
  name: string;
  width: number;
  wallpaper?: string | null;
  floor?: string | null;
}) {
  const goods = placedGoods(layout);
  const names = goods.map((g) => itemName(g.id));
  const label = `${name}のおへや。${names.length ? `${names.join("、")}があります` : "グッズはまだありません"}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={(width * ROOM_H) / ROOM_W} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
        <RoomBackground wallpaper={wallpaper} floor={floor} />
        {goods.map((g) => (
          <SlotArt key={g.id} slot={SLOTS[g.slot]}>
            {ART[g.id]}
          </SlotArt>
        ))}
        <G transform={`translate(${STILL_HAMSTER.x - BODY_FEET.x * BODY_SCALE} ${STILL_HAMSTER.y - BODY_FEET.y * BODY_SCALE}) scale(${BODY_SCALE})`}>
          <HamsterBody mood={mood} wear={wear} />
        </G>
      </Svg>
    </View>
  );
}
