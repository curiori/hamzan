import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { useAppStore } from "@/state/store";
import type { Profile } from "@/state/types";
import { Button } from "@/ui/button";
import { useConfirm } from "@/ui/confirm";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { UNIT_STATE_LABEL, unitRows } from "./juku-data";

const STATUS_JA = { locked: "ロック", available: "未着手", practicing: "練習中", star2: "★2", mastered: "マスター" } as const;

/** The parent opens and closes 塾の単元 (stages 6–9) for one child. */
export function JukuPane({ p }: { p: Profile }) {
  const setJukuUnit = useAppStore((s) => s.setJukuUnit);
  const confirm = useConfirm();
  const rows = unitRows(p);

  return (
    <View style={styles.root}>
      <AppText style={styles.body}>
        {
          "塾の単元の時期に合わせて、ステージ6〜9（小数と分数、単位の換算、円周率の計算、見積もり）のレベルを開きます。開くと、毎日の練習のメイン2セットのうち1つを塾の単元に使います（1日7〜10分は変わりません）。開いた次の練習で、各レベル5問のチェックをして、始めるレベルを決めます（1日に1単元まで）。"
        }
      </AppText>
      <AppText style={styles.small}>上から、おすすめの順です。前提のレベルは開くのに要りません。つまずいたときに戻る先として使います。</AppText>
      {rows.map((u) => (
        <View key={u.id} style={[styles.card, u.state !== "closed" && styles.cardOpen]}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <AppText weight="bold" accessibilityRole="header" style={styles.name}>
                {u.name}
              </AppText>
              <AppText style={styles.small}>
                塾：{u.juku}・時期の目安：{u.when}
              </AppText>
            </View>
            <AppText weight="bold" style={[styles.state, u.state !== "closed" && styles.stateOpen]}>
              {UNIT_STATE_LABEL[u.state]}
            </AppText>
          </View>
          {u.levels.map((l) => (
            <View key={l.id} style={styles.levelLine}>
              <AppText style={styles.levelName}>
                {l.id} {l.name}
              </AppText>
              <AppText weight="bold" style={styles.levelStatus}>
                {STATUS_JA[l.status]}
              </AppText>
            </View>
          ))}
          <View style={styles.foot}>
            <AppText weight="bold" style={styles.small}>
              ★2以上 {u.passed}/{u.total}
            </AppText>
            {u.state === "closed" ? (
              <Button label="開く" icon={<Ionicons name="lock-open" size={18} color={colors.primaryForeground} />} onPress={() => setJukuUnit(p.id, u.id, true)} />
            ) : (
              <Button
                variant="outline"
                label="閉じる"
                onPress={async () => {
                  if (
                    await confirm({
                      title: `「${u.name}」を閉じますか？`,
                      description: "きょうの れんしゅうに出なくなります。★や記録はそのまま残り、また開けます。",
                      confirmLabel: "閉じる",
                    })
                  )
                    setJukuUnit(p.id, u.id, false);
                }}
              />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  body: { fontSize: 14, lineHeight: 21 },
  small: { fontSize: 12, lineHeight: 17 },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 },
  cardOpen: { borderColor: colors.amber600, borderWidth: 2 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  headText: { flex: 1, gap: 2 },
  name: { fontSize: 16 },
  state: { fontSize: 12, color: colors.mutedForeground, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  stateOpen: { color: colors.amber950, backgroundColor: colors.amber100, borderColor: colors.amber600 },
  levelLine: { flexDirection: "row", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
  levelName: { flex: 1, fontSize: 13 },
  levelStatus: { fontSize: 12 },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
});
