import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { colors } from "@/ui/theme";

const PAD = { l: 36, r: 12, t: 10, b: 22 };

/** Seconds per problem over the last speed sets, with the ★2 and ★3 targets as dashed lines. */
export function TrendChart({ data, t2, t3, width, height = 200 }: { data: { date: string; sec: number }[]; t2: number; t3: number; width: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(t2, ...data.map((d) => d.sec), 0.5) * 1.15;
  const innerW = width - PAD.l - PAD.r;
  const x = (i: number) => PAD.l + (data.length <= 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const y = (v: number) => PAD.t + (1 - v / max) * (height - PAD.t - PAD.b);
  const ticks = [0, max / 2, max];
  const labelIdx = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])].filter((i) => i >= 0);
  const last = data[data.length - 1];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={last ? `1問あたりの秒の推移。直近は${last.sec.toFixed(1)}秒。目安は★2 ${t2.toFixed(1)}秒、★3 ${t3.toFixed(1)}秒` : "記録なし"}
    >
      <Svg width={width} height={height}>
        {ticks.map((t) => (
          <Line key={`g${t}`} x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
        ))}
        {ticks.map((t) => (
          <SvgText key={`l${t}`} x={PAD.l - 6} y={y(t) + 4} fontSize={10} textAnchor="end" fill={colors.mutedForeground}>
            {t.toFixed(1)}
          </SvgText>
        ))}
        <Line x1={PAD.l} x2={width - PAD.r} y1={y(t2)} y2={y(t2)} stroke={colors.chart3} strokeWidth={1.5} strokeDasharray="4 4" />
        <Line x1={PAD.l} x2={width - PAD.r} y1={y(t3)} y2={y(t3)} stroke={colors.chart2} strokeWidth={1.5} strokeDasharray="2 4" />
        {data.length > 1 ? <Polyline points={data.map((d, i) => `${x(i)},${y(d.sec)}`).join(" ")} fill="none" stroke={colors.chart1} strokeWidth={2.5} /> : null}
        {data.map((d, i) => (
          <Circle key={i} cx={x(i)} cy={y(d.sec)} r={3} fill={colors.chart1} />
        ))}
        {labelIdx.map((i) => (
          <SvgText key={`x${i}`} x={x(i)} y={height - 6} fontSize={10} textAnchor="middle" fill={colors.mutedForeground}>
            {data[i].date}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
