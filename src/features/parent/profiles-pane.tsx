import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { SPEC } from "@/domain/spec";
import { GradePicker, NICKNAME_MAX, textInputStyle } from "@/features/onboarding/child-form";
import { useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** Nickname edit that saves when editing ends; an empty name is not saved. */
function NicknameField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const commit = () => {
    setFocused(false);
    const v = text.trim().slice(0, NICKNAME_MAX);
    if (v && v !== value) onCommit(v);
  };
  return (
    <TextInput
      value={focused ? text : value}
      maxLength={NICKNAME_MAX}
      accessibilityLabel="ニックネーム"
      autoCorrect={false}
      onFocus={() => {
        setText(value);
        setFocused(true);
      }}
      onChangeText={setText}
      onEndEditing={commit}
      onBlur={commit}
      style={[textInputStyle, styles.nickname]}
    />
  );
}

/** Children on this device: rename, change the year, switch, add (up to the profile limit). */
export function ProfilesPane() {
  const profiles = useAppStore((s) => s.profiles);
  const activeId = useAppStore((s) => s.activeId);
  const addProfile = useAppStore((s) => s.addProfile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const switchProfile = useAppStore((s) => s.switchProfile);
  const [nick, setNick] = useState("");
  const [grade, setGrade] = useState(3);
  const max = Number(SPEC.freemium.premiumProfiles) || 4;
  const name = nick.trim();

  return (
    <View style={styles.root}>
      {profiles.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="person" size={18} color={colors.foreground} />
            <NicknameField value={p.nickname} onCommit={(v) => updateProfile(p.id, { nickname: v })} />
            {p.id === activeId ? (
              <AppText weight="bold" style={styles.active}>
                使用中
              </AppText>
            ) : (
              <Button variant="outline" label="切り替える" onPress={() => switchProfile(p.id)} />
            )}
          </View>
          <GradePicker value={p.grade} onChange={(g) => updateProfile(p.id, { grade: g })} />
        </View>
      ))}
      {profiles.length < max ? (
        <View style={[styles.card, styles.addCard]}>
          <AppText weight="bold">こどもを追加</AppText>
          <TextInput value={nick} onChangeText={setNick} maxLength={NICKNAME_MAX} placeholder="ニックネーム" accessibilityLabel="追加するニックネーム" autoCorrect={false} style={textInputStyle} />
          <GradePicker value={grade} onChange={setGrade} />
          <Button
            label="追加"
            icon={<Ionicons name="add" size={20} color={colors.primaryForeground} />}
            disabled={!name}
            onPress={() => {
              addProfile(name.slice(0, NICKNAME_MAX), grade, false);
              setNick("");
            }}
          />
        </View>
      ) : (
        <AppText style={styles.small}>プロフィールは{max}人までです。</AppText>
      )}
      <AppText style={styles.small}>追加したプロフィールは、切り替えたあと最初に入力テストと診断を行います。</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
  addCard: { borderStyle: "dashed" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  nickname: { flex: 1, minWidth: 0, height: 44, fontSize: 16 },
  active: { flexShrink: 0, fontSize: 12, color: colors.primaryForeground, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
  small: { fontSize: 12, lineHeight: 17 },
});
