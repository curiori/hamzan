import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export function Paw({ size = 24, color = "#b45309" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={15.5} rx={5.2} ry={4.4} fill={color} />
      <Circle cx={5.8} cy={9.6} r={2.1} fill={color} />
      <Circle cx={9.8} cy={6.4} r={2.1} fill={color} />
      <Circle cx={14.2} cy={6.4} r={2.1} fill={color} />
      <Circle cx={18.2} cy={9.6} r={2.1} fill={color} />
    </Svg>
  );
}

/** ひまわりのたね (also the shop currency icon) */
export function SeedIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C16.6 6.2 17.6 13.4 12 22C6.4 13.4 7.4 6.2 12 2Z" fill="#292524" />
      <Path d="M12 5.5V19M9.6 8.5Q9 13 10.6 17M14.4 8.5Q15 13 13.4 17" stroke="#f5f5f4" strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
