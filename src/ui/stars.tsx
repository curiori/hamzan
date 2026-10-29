import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "./theme";

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z";

export function Star({ on, size = 14 }: { on: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={on ? colors.amber400 : "transparent"} stroke={on ? colors.amber700 : "rgba(10,10,10,0.3)"} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`★${n}`} style={{ flexDirection: "row", gap: 1 }}>
      {[0, 1, 2].map((i) => (
        <Star key={i} on={i < n} size={size} />
      ))}
    </View>
  );
}
