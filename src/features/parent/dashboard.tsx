import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { weekdayOf } from "@/domain/dates";
import { display } from "@/domain/problem";
import { lpOf, statusOf } from "@/domain/progression";
import { ERROR_TYPES, LEVEL, SPEC, STAGES } from "@/domain/spec";
import { targetSec } from "@/domain/timing";
import { MODE_LABEL } from "@/i18n/ja";
import { timeOpts, todayOf } from "@/state/profile";
import { useAppStore } from "@/state/store";
import type { Profile } from "@/state/types";
import { Chip } from "@/ui/chip";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { calendarDays, errorCounts, openStageId, retestDue, seedSummary, speedLevels, trendSeries, weakFactsTop } from "./dashboard-data";
import { Section } from "./section";
import { TrendChart } from "./trend-chart";

const STATUS_JA = { locked: "ロック", available: "未着手", practicing: "練習中", star2: "★2", mastered: "マスター" } as const;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const passed = (s: string) => s === "star2" || s === "mastered";

/** The parent's view of one child: practice days, progress, weak facts, mistake types and speed trend. */
export function Dashboard({ p }: { p: Profile }) {
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const { width } = useWindowDimensions();
  const date = todayOf(dayOffset);
  const opts = timeOpts(p);
  const levels = speedLevels(p);
  const [trendLevel, setTrendLevel] = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<number | null>(() => openStageId(p));
  const lvId = levels.some((l) => l.id === trendLevel) ? (trendLevel as string) : (levels[levels.length - 1]?.id ?? "");
  const trend = lvId ? trendSeries(p, lvId) : [];
  const t2 = lvId ? targetSec(LEVEL[lvId], 2, opts) : 0;
  const t3 = lvId ? targetSec(LEVEL[lvId], 3, opts) : 0;
  const days = calendarDays(p, date);
  const weak = weakFactsTop(p);
  const counts = errorCounts(p, date);
  const seeds = seedSummary(p, date);
  const retestDays = SPEC.timeModel.inputSpeedTest.retestAfterDays;

  return (
    <View style={styles.root}>
      {retestDue(p, date) ? (
        <AppText weight="bold" style={styles.retest}>
          入力テストから{retestDays}日以上たちました。「設定」から測り直せます。
        </AppText>
      ) : null}

      <Section title="練習した日（直近5週間）">
        <View style={styles.calendar}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={styles.calCell}>
              <AppText weight="bold" style={styles.calHead}>
                {d}
              </AppText>
            </View>
          ))}
          {Array.from({ length: weekdayOf(days[0].date) }, (_, i) => (
            <View key={`pad${i}`} style={styles.calCell} />
          ))}
          {days.map((d) => (
            <View key={d.date} style={styles.calCell}>
              <View
                accessible
                accessibilityLabel={`${d.date} ${d.goal ? "ゴール達成" : d.practiced ? "練習あり" : "練習なし"}`}
                style={[styles.calDay, d.goal ? styles.calGoal : d.practiced ? styles.calDid : null, d.date === date && styles.calToday]}
              >
                <AppText weight="bold" style={[styles.calNum, d.goal && styles.calGoalText]}>
                  {Number(d.date.slice(8))}
                </AppText>
              </View>
            </View>
          ))}
        </View>
        <AppText style={styles.small}>濃い緑＝きょうのゴール達成、うすい緑＝練習あり</AppText>
      </Section>

      <Section title="ひまわりのたね">
        <View style={styles.seedBoxes}>
          <View style={styles.seedBox} accessible accessibilityLabel={`いまのたね ${seeds.seeds}こ`}>
            <AppText style={styles.small}>いま</AppText>
            <AppText weight="bold" style={styles.seedNum}>
              {seeds.seeds}こ
            </AppText>
          </View>
          <View style={styles.seedBox} accessible accessibilityLabel={`直近7日で ${seeds.week}こ ふえた`}>
            <AppText style={styles.small}>直近7日でふえた数</AppText>
            <AppText weight="bold" style={styles.seedNum}>
              +{seeds.week}
            </AppText>
          </View>
        </View>
        <AppText style={styles.body}>
          買ったもの：{seeds.bought.length ? seeds.bought.map((b) => (b.count > 1 ? `${b.name}（${b.count}こ）` : b.name)).join("、") : "まだありません"}
        </AppText>
        <AppText style={styles.small}>
          たねは練習でたまり、ショップでだけ使います。お金では買えません。おやつは残っている数です。
          {p.settings.shop ? "" : "いまショップはオフです（設定で切りかえられます）。"}
        </AppText>
      </Section>

      <Section title="ステージ・レベルの進み具合">
        {STAGES.map((st) => {
          const open = openStage === st.id;
          const check = p.stageChecks[st.id];
          const n = st.levelIds.filter((id) => passed(statusOf(p.progress, id))).length;
          return (
            <View key={st.id} style={styles.stage}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenStage(open ? null : st.id)} style={styles.stageHead}>
                <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={16} color={colors.foreground} />
                <View style={styles.stageHeadText}>
                  <AppText weight="bold">
                    ステージ{st.id} {st.name}（★2以上 {n}/{st.levelIds.length}）
                  </AppText>
                  {check ? <AppText style={styles.small}>ステージチェック：{check.byPlacement ? "診断で通過" : check.passed ? "合格" : "不合格"}</AppText> : null}
                </View>
              </Pressable>
              {open
                ? st.levelIds.map((id) => {
                    const lp = lpOf(p.progress, id);
                    return (
                      <View key={id} style={styles.levelRow}>
                        <View style={styles.levelLine}>
                          <AppText weight="bold" style={styles.levelName}>
                            {id} {LEVEL[id].name}
                          </AppText>
                          <AppText weight="bold" style={styles.levelStatus}>
                            {STATUS_JA[statusOf(p.progress, id)]}
                          </AppText>
                        </View>
                        <AppText style={styles.small}>
                          {MODE_LABEL[lp.mode]}・自己ベスト {lp.personalBestSec !== null ? `${lp.personalBestSec.toFixed(1)}秒` : "—"}・目安 ★2 {targetSec(LEVEL[id], 2, opts).toFixed(1)} / ★3{" "}
                          {targetSec(LEVEL[id], 3, opts).toFixed(1)}秒
                        </AppText>
                      </View>
                    );
                  })
                : null}
            </View>
          );
        })}
      </Section>

      <Section title="苦手な事実 トップ10">
        {weak.length ? (
          weak.map(([k, f]) => (
            <View key={k} style={styles.tableRow}>
              <AppText weight="bold" style={styles.cellWide}>
                {display(f.problem)}
              </AppText>
              <AppText style={styles.cell}>{f.levelId}</AppText>
              <AppText style={styles.cellNum}>
                {f.errors} / {f.attempts}
              </AppText>
              <AppText style={styles.cellNum}>{f.lastLatencyMs !== null ? `${(f.lastLatencyMs / 1000).toFixed(1)}秒` : "—"}</AppText>
            </View>
          ))
        ) : (
          <AppText style={styles.body}>まだミスの記録はありません。</AppText>
        )}
      </Section>

      <Section title="ミスの種類と直し方（直近30日）">
        {ERROR_TYPES.map((t) => (
          <View key={t.id} style={[styles.errorType, counts[t.id] === 0 && styles.faded]}>
            <View style={styles.levelLine}>
              <AppText weight="bold">{t.name}</AppText>
              <AppText weight="bold" style={styles.num}>
                {counts[t.id]}件
              </AppText>
            </View>
            <AppText style={styles.small}>直し方：{t.remedy}</AppText>
          </View>
        ))}
      </Section>

      <Section title="1問あたりの秒の推移（スピードモード）">
        {levels.length ? (
          <>
            <View style={styles.chips}>
              {levels.map((l) => (
                <Chip key={l.id} label={l.id} accessibilityLabel={`${l.id} ${l.name}`} selected={l.id === lvId} onPress={() => setTrendLevel(l.id)} />
              ))}
            </View>
            <AppText style={styles.body}>
              {lvId} {LEVEL[lvId].name}：直近{trend.length}セット。目安 ★2 {t2.toFixed(1)}秒・★3 {t3.toFixed(1)}秒（点線）
            </AppText>
            <TrendChart data={trend} t2={t2} t3={t3} width={Math.min(width - 64, 560)} />
            {trend.slice(-6).map((r, i) => (
              <View key={`${r.date}-${i}`} style={styles.tableRow}>
                <AppText style={styles.cellWide}>{r.date}</AppText>
                <AppText style={styles.cellNum}>{r.sec.toFixed(1)}秒</AppText>
                <AppText style={styles.cellNum}>ミス {r.errors}</AppText>
              </View>
            ))}
          </>
        ) : (
          <AppText style={styles.body}>スピードモードの記録がたまると表示されます。</AppText>
        )}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 24 },
  retest: { fontSize: 14, borderWidth: 2, borderColor: colors.amber600, borderRadius: radius.md, padding: 10 },
  calendar: { flexDirection: "row", flexWrap: "wrap", maxWidth: 420 },
  calCell: { width: `${100 / 7}%`, padding: 2 },
  calHead: { fontSize: 12, textAlign: "center" },
  calDay: { height: 34, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  calDid: { backgroundColor: colors.green100 },
  calGoal: { backgroundColor: colors.green600, borderColor: colors.green700 },
  calToday: { borderWidth: 2, borderColor: colors.primary },
  calNum: { fontSize: 12, fontVariant: ["tabular-nums"] },
  calGoalText: { color: "#ffffff" },
  small: { fontSize: 12, lineHeight: 17 },
  body: { fontSize: 14, lineHeight: 21 },
  seedBoxes: { flexDirection: "row", gap: 8 },
  seedBox: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 2 },
  seedNum: { fontSize: 20, fontVariant: ["tabular-nums"] },
  stage: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 8 },
  stageHead: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  stageHeadText: { flex: 1, gap: 2 },
  levelRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, gap: 2 },
  levelLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  levelName: { flex: 1, fontSize: 14 },
  levelStatus: { fontSize: 13 },
  tableRow: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 },
  cellWide: { flex: 2, fontSize: 14, fontVariant: ["tabular-nums"] },
  cell: { flex: 1, fontSize: 13 },
  cellNum: { flex: 1, fontSize: 13, textAlign: "right", fontVariant: ["tabular-nums"] },
  errorType: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 4 },
  faded: { opacity: 0.7 },
  num: { fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
