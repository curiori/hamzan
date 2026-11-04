import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { ALL_LEVELS, ALL_STAGES, levelLabel, levelSpec, stageSpec } from "@/course/levels";
import { MODE_LABEL } from "@/i18n/ja";
import { todayOf } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/chip";
import { useConfirm } from "@/ui/confirm";
import { SwitchRow } from "@/ui/switch-row";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** the web preview's text sizes: as set, larger, and the most text grows outside practice */
const TEXT_SCALES = [1, 1.3, 1.5];

/** A stage of the course, then one of its levels (numbers as on screen). */
function LevelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [stage, setStage] = useState(levelSpec(value).stage);
  const levelIds = stageSpec(stage).levelIds;
  return (
    <View style={styles.picker}>
      <View style={styles.chips}>
        {ALL_STAGES.map((st) => (
          <Chip key={st.id} label={`ステージ${st.no}`} selected={st.id === stage} onPress={() => setStage(st.id)} />
        ))}
      </View>
      <View style={styles.chips}>
        {levelIds.map((id) => (
          <Chip key={id} label={levelLabel(id)} accessibilityLabel={`${levelLabel(id)} ${levelSpec(id).name}`} selected={id === value} onPress={() => onChange(id)} />
        ))}
      </View>
      <AppText weight="bold" style={styles.small}>
        {levelLabel(value)} {levelSpec(value).name}（{levelSpec(value).modes.map((m) => MODE_LABEL[m]).join("→")}）
      </AppText>
    </View>
  );
}

/** Tools for trying the app: move the date, open every level, shorten or skip the diagnosis. Acts on the active child. */
export function TestPane({ onExit }: { onExit: () => void }) {
  const dev = useAppStore((s) => s.dev);
  const setDev = useAppStore((s) => s.setDev);
  const profile = useAppStore((s) => activeProfile(s));
  const resetProfileData = useAppStore((s) => s.resetProfileData);
  const skipPlacementTo = useAppStore((s) => s.skipPlacementTo);
  const giftSeeds = useAppStore((s) => s.giftSeeds);
  const [startLevel, setStartLevel] = useState(ALL_LEVELS[0].id);
  const confirm = useConfirm();

  return (
    <View style={styles.root}>
      <AppText style={styles.body}>動作確認のための機能です。日付を進めると、復習・マスター（別の日に★3を2回）・週1のチャレンジなどを試せます。</AppText>
      <View style={styles.card}>
        <AppText weight="bold" style={styles.num}>
          アプリの日付：{todayOf(dev.dayOffset)}
          {dev.dayOffset ? `（+${dev.dayOffset}日）` : "（今日）"}
        </AppText>
        <View style={styles.actions}>
          <Button variant="outline" label="1日進める" icon={<Ionicons name="calendar" size={18} color={colors.foreground} />} onPress={() => setDev({ dayOffset: dev.dayOffset + 1 })} />
          <Button variant="outline" label="7日進める" icon={<Ionicons name="calendar" size={18} color={colors.foreground} />} onPress={() => setDev({ dayOffset: dev.dayOffset + 7 })} />
          <Button variant="ghost" label="今日に戻す" disabled={!dev.dayOffset} onPress={() => setDev({ dayOffset: 0 })} />
        </View>
      </View>
      <SwitchRow label="すべてのレベルを開放する" note="前提の★2がなくても練習できます（判定は通常どおり）" value={dev.unlockAll} onChange={(v) => setDev({ unlockAll: v })} />
      <SwitchRow label="診断を短くする" note="ステージチェックを6問にし、1日8分の区切りを外します" value={dev.shortPlacement} onChange={(v) => setDev({ shortPlacement: v })} />
      <SwitchRow
        label="おへやに すべての グッズを おく（表示だけ）"
        note="ごほうびが なくても、グッズで遊ぶ様子を確かめられます。記録は変わりません"
        value={!!dev.roomAllGoods}
        onChange={(v) => setDev({ roomAllGoods: v })}
      />
      {Platform.OS === "web" ? (
        <View style={styles.card}>
          <AppText weight="bold">文字の大きさ（web の確認）</AppText>
          <AppText style={styles.small}>iPhone で文字を大きくしたときの見た目を、web で確かめるためのものです。出題の画面は 1.3倍までです。</AppText>
          <View style={styles.chips}>
            {TEXT_SCALES.map((k) => (
              <Chip key={k} label={`${k}倍`} selected={(dev.textScale ?? 1) === k} onPress={() => setDev({ textScale: k })} />
            ))}
          </View>
        </View>
      ) : null}
      {profile ? (
        <View style={styles.card}>
          <AppText weight="bold" style={styles.num}>
            {profile.nickname}さんのたね：{profile.wallet.seeds}こ
          </AppText>
          <AppText style={styles.small}>ショップを試すためのものです。ふやした分は「テスト」として記録に残ります。</AppText>
          <View style={styles.actions}>
            <Button variant="outline" label="たねを 100 ふやす" icon={<Ionicons name="add-circle-outline" size={18} color={colors.foreground} />} onPress={() => giftSeeds(100)} />
          </View>
        </View>
      ) : null}
      {profile ? (
        <View style={styles.card}>
          <AppText weight="bold">診断をとばして、えらんだレベルから始める</AppText>
          <AppText style={styles.small}>それより前のレベルは★2として扱います。ヒント・メモ・スピードの各モードや、各ステージの問題をすぐに試せます。</AppText>
          <LevelPicker value={startLevel} onChange={setStartLevel} />
          <Button
            label="このレベルから始める"
            onPress={async () => {
              if (
                await confirm({
                  title: `レベル ${levelLabel(startLevel)} から始めますか？`,
                  description: `${profile.nickname}さんの今の進み具合は、この設定で上書きされます。`,
                  confirmLabel: "このレベルから始める",
                  destructive: true,
                })
              ) {
                skipPlacementTo(startLevel);
                onExit();
              }
            }}
          />
        </View>
      ) : null}
      {profile ? (
        <Button
          variant="outline"
          label={`${profile.nickname}さんの診断をやり直す`}
          icon={<Ionicons name="refresh" size={18} color={colors.foreground} />}
          onPress={async () => {
            if (await confirm({ title: "診断をやり直しますか？", description: `${profile.nickname}さんの進み具合を消して、診断から始めます。`, confirmLabel: "やり直す", destructive: true }))
              resetProfileData(profile.id);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  picker: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  body: { fontSize: 14, lineHeight: 21 },
  small: { fontSize: 12, lineHeight: 17 },
  num: { fontVariant: ["tabular-nums"] },
});
