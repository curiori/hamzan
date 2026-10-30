import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { REWARDS } from "@/game/achievements";
import { autoLayout, placedGoods, ROOM_H, ROOM_W, SLOTS, type Point } from "@/game/room";
import { HamsterBody, type Mood } from "./hamster";
import { ART } from "./items";

/** where the hamster stands in the still room */
const STILL_HAMSTER: Point = { x: 200, y: 222 };
/** HamsterBody's feet in its own units, and its scale in the room */
export const BODY_FEET: Point = { x: 60, y: 108 };
export const BODY_SCALE = 0.5;

/** Wall, window and floor of the 400×260 room. */
export function RoomBackground() {
  return (
    <G>
      <Rect width={ROOM_W} height={ROOM_H} fill="#FBF1DF" />
      <Rect x={150} y={22} width={92} height={66} rx={6} fill="#BFE3F7" stroke="#D9B57A" strokeWidth={4} />
      <Circle cx={222} cy={40} r={8} fill="#FFD25A" />
      <Path d="M196 22 V88 M150 55 H242" stroke="#D9B57A" strokeWidth={3} />
      <Rect x={144} y={86} width={104} height={7} rx={2} fill="#D9B57A" />
      <Rect y={175} width={ROOM_W} height={ROOM_H - 175} fill="#EFD3A0" />
      <Path d={`M0 175 H${ROOM_W}`} stroke="#D9B57A" strokeWidth={2} />
      <Path
        d="M30 222 l8 -2 M96 206 l7 2 M150 248 l9 -1 M232 240 l8 1 M336 230 l7 -2 M372 252 l8 1 M200 196 l6 2 M118 238 l7 1"
        stroke="#D9B57A"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** A good's drawing at its slot. */
export function SlotArt({ slot, children }: { slot: (typeof SLOTS)[keyof typeof SLOTS]; children: ReactNode }) {
  return <G transform={`translate(${slot.x} ${slot.y}) scale(${slot.scale})`}>{children}</G>;
}

/** Still room: the owned goods in their slots and the hamster in the middle (used while the diagnosis runs). */
export function RoomScene({ owned, wear, mood = "idle", name, width }: { owned: string[]; wear: string | null; mood?: Mood; name: string; width: number }) {
  const goods = placedGoods(autoLayout(owned));
  const names = goods.map((g) => REWARDS.find((r) => r.id === g.id)?.name).filter(Boolean);
  const label = `${name}のおへや。${names.length ? `${names.join("、")}があります` : "グッズはまだありません"}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={(width * ROOM_H) / ROOM_W} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
        <RoomBackground />
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
