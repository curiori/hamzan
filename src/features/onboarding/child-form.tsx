import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/ui/button";
import { MAX_FONT_SCALE_UI } from "@/ui/font-scale";
import { AppText, useTextScale } from "@/ui/text";
import { colors, fonts, radius } from "@/ui/theme";

const GRADES = [1, 2, 3, 4, 5, 6];
export const NICKNAME_MAX = 10;
const GRADE_GAP = 6;
/** a year's cell needs this much width at the regular text size, for 小1 and its border */
const GRADE_MIN = 38;

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
        maxFontSizeMultiplier={MAX_FONT_SCALE_UI}
        style={styles.input}
      />
      <AppText weight="bold" style={styles.label}>
        学年
      </AppText>
      <GradePicker value={grade} onChange={setGrade} />
      <Button size="lg" label="つぎへ" disabled={!name} icon={<Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />} onPress={submit} />
    </View>
  );
}

/** School year 1–6 as one row of choices. */
export function GradePicker({ value, onChange }: { value: number; onChange: (grade: number) => void }) {
  const scale = useTextScale();
  const [width, setWidth] = useState(0);
  // six in a row when each year fits; on a narrow screen or with larger text, two rows of three
  const rows = width && (width - GRADE_GAP * 5) / 6 < GRADE_MIN * scale ? styles.gradeThird : styles.gradeSixth;
  return (
    <View style={styles.grades} accessibilityRole="radiogroup" accessibilityLabel="学年" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {GRADES.map((g) => (
        <Pressable
          key={g}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === g }}
          accessibilityLabel={`小学${g}年`}
          onPress={() => onChange(g)}
          style={[styles.grade, rows, value === g && styles.gradeOn]}
        >
          <AppText weight="bold" style={value === g ? styles.gradeTextOn : undefined}>
            小{g}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

export const textInputStyle = {
  height: 48,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 12,
  fontSize: 17,
  fontFamily: fonts.body,
  color: colors.foreground,
  backgroundColor: colors.background,
} as const;

const styles = StyleSheet.create({
  root: { gap: 12 },
  title: { fontSize: 22 },
  note: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 14, marginTop: 4 },
  input: textInputStyle,
  grades: { flexDirection: "row", flexWrap: "wrap", gap: GRADE_GAP },
  grade: { height: 48, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  gradeSixth: { flex: 1 },
  // three a row: a third of the width, less the gaps between them
  gradeThird: { flexGrow: 1, flexBasis: "30%" },
  gradeOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  gradeTextOn: { color: colors.primaryForeground },
});
