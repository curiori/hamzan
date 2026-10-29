import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors, fonts, radius } from "@/ui/theme";

const GRADES = [1, 2, 3, 4, 5, 6];
export const NICKNAME_MAX = 10;

/** The child's nickname and school year; nothing else about the child is asked. */
export function ChildForm({ onSubmit }: { onSubmit: (nickname: string, grade: number) => void }) {
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState(3);
  const name = nickname.trim();
  const submit = () => {
    if (name) onSubmit(name.slice(0, NICKNAME_MAX), grade);
  };

  return (
    <View style={styles.root}>
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        お子さまのニックネームと学年
      </AppText>
      <AppText style={styles.note}>扱う情報はニックネームと学年だけです。本名は入れないでください。</AppText>
      <AppText weight="bold" style={styles.label}>
        ニックネーム
      </AppText>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        maxLength={NICKNAME_MAX}
        accessibilityLabel="ニックネーム"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={submit}
        style={styles.input}
      />
      <AppText weight="bold" style={styles.label}>
        学年
      </AppText>
      <View style={styles.grades} accessibilityRole="radiogroup" accessibilityLabel="学年">
        {GRADES.map((g) => (
          <Pressable
            key={g}
            accessibilityRole="radio"
            accessibilityState={{ checked: grade === g }}
            accessibilityLabel={`小学${g}年`}
            onPress={() => setGrade(g)}
            style={[styles.grade, grade === g && styles.gradeOn]}
          >
            <AppText weight="bold" style={grade === g ? styles.gradeTextOn : undefined}>
              小{g}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Button size="lg" label="つぎへ" disabled={!name} icon={<Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  title: { fontSize: 22 },
  note: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 14, marginTop: 4 },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 17,
    fontFamily: fonts.body,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  grades: { flexDirection: "row", gap: 6 },
  grade: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  gradeOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  gradeTextOn: { color: colors.primaryForeground },
});
