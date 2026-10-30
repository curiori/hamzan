import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { AppText } from "@/ui/text";
import { colors } from "@/ui/theme";
import { CREAM, FUR, INK, PINK } from "./hamster";

const FAR_FOOT = "#E8A396";

// Room-only drawings: the hamster seen from the side while walking (two steps), a speech bubble and a heart.
// The side view uses the front view's box (viewBox -6 -4 132 114) so the room can swap them in place.

function Feet({ frame }: { frame: 0 | 1 }) {
  const [far, near] = frame === 0 ? [[74, 46], [86, 34]] : [[88, 32], [76, 44]];
  return (
    <G>
      <Ellipse cx={far[0]} cy={98} rx={8} ry={4.5} fill={FAR_FOOT} />
      <Ellipse cx={far[1]} cy={98} rx={8} ry={4.5} fill={FAR_FOOT} />
      <Ellipse cx={near[0]} cy={101} rx={9} ry={5} fill={PINK} />
      <Ellipse cx={near[1]} cy={101} rx={9} ry={5} fill={PINK} />
    </G>
  );
}

/** Hamster walking to the right; flip the wrapping view for left. `frame` swaps the feet; `cheeks` = carrying seeds. */
export function HamsterSide({ frame, wear = null, size = 80, cheeks = false }: { frame: 0 | 1; wear?: string | null; size?: number; cheeks?: boolean }) {
  return (
    <Svg width={size} height={(size * 114) / 132} viewBox="-6 -4 132 114">
      <Circle cx={13} cy={72} r={5} fill={PINK} />
      <Feet frame={frame} />
      <Ellipse cx={58} cy={66} rx={47} ry={38} fill={FUR} />
      <Ellipse cx={70} cy={82} rx={30} ry={16} fill={CREAM} />
      <Circle cx={66} cy={30} r={11} fill={FUR} />
      <Circle cx={66} cy={31} r={6} fill={PINK} />
      {cheeks ? <Ellipse cx={90} cy={70} rx={15} ry={12} fill={FUR} /> : null}
      <Circle cx={88} cy={54} r={5.5} fill={INK} />
      <Circle cx={89.6} cy={52.2} r={1.7} fill="#fff" />
      <Ellipse cx={88} cy={cheeks ? 71 : 68} rx={7} ry={4.5} fill="#F59E9E" opacity={0.75} />
      <Ellipse cx={104} cy={62} rx={3.4} ry={2.6} fill="#E07A7A" />
      <Path d="M99 69 Q102 72 105 69" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      {wear === "hachimaki" ? (
        <G>
          <Path d="M44 36 L32 30 L34 42 Z" fill="#fff" stroke="#D1D5DB" />
          <Rect x={44} y={31} width={50} height={10} rx={4} fill="#fff" stroke="#D1D5DB" transform="rotate(6 69 36)" />
        </G>
      ) : null}
      {wear === "crown" ? (
        <Path d="M54 26 L54 14 L60 19 L66 9 L72 19 L78 14 L78 26 Z" fill="#F5C518" stroke="#B8860B" strokeWidth={1.5} strokeLinejoin="round" />
      ) : null}
      {wear === "ribbon" ? (
        <G>
          <Path d="M76 22 L64 14 L65 30 Z M76 22 L88 14 L87 30 Z" fill="#F472B6" stroke="#DB2777" strokeWidth={1.2} strokeLinejoin="round" />
          <Circle cx={76} cy={22} r={3.5} fill="#DB2777" />
        </G>
      ) : null}
      {wear === "glasses" ? (
        <G fill="none" stroke={INK} strokeWidth={2.5}>
          <Circle cx={88} cy={54} r={9} fill="#E0F2FE" fillOpacity={0.35} />
          <Path d="M79 52 L66 47" strokeLinecap="round" />
        </G>
      ) : null}
      {wear === "scarf" ? (
        <G>
          <Path d="M64 72 Q86 90 106 76 L104 85 Q86 99 64 81 Z" fill="#EF4444" />
          <Rect x={62} y={78} width={11} height={19} rx={3} fill="#EF4444" />
        </G>
      ) : null}
    </Svg>
  );
}

/** Small speech bubble ("きゅっ", "なるほど", "Zzz"). */
export function Bubble({ text }: { text: string }) {
  return (
    <View style={styles.bubble} pointerEvents="none">
      <AppText weight="bold" style={styles.bubbleText}>
        {text}
      </AppText>
      <View style={styles.tail} />
    </View>
  );
}

export function Heart({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7-4.4-9.3-8.6C1 9.1 2.6 5.5 6.2 5.1c2-.2 3.6.8 4.6 2.3 1-1.5 2.6-2.5 4.6-2.3 3.6.4 5.2 4 3.5 7.3C19 16.6 12 21 12 21z"
        fill="#F472B6"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: "center" },
  bubbleText: {
    fontSize: 12,
    color: colors.foreground,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  tail: {
    width: 8,
    height: 8,
    marginTop: -5,
    backgroundColor: "#ffffff",
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
});
