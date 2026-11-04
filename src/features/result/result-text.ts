import { levelName } from "@/course/levels";
import type { SeedLine, SeedLineKind } from "@/game/economy";
import { MODE_LABEL } from "@/i18n/ja";
import type { SetSummary } from "@/state/types";

// Words on the result screen (same rules as the web prototype's result.tsx).

export type NoteIcon = "sparkles" | "crown" | "next" | "retry" | "trophy";

const SEED_LABEL: Record<SeedLineKind, string> = {
  correct: "せいかい",
  complete: "さいごまで",
  warmup: "ウォームアップ",
  goal: "きょうの ゴール",
  star2: "あたらしい ★2",
  mastered: "マスター",
  stageCheck: "ステージチェック ごうかく",
  review: "ふくしゅう ごうかく",
  personalBest: "じこベスト",
  challengeBest: "チャレンジ じこベスト",
};

/** One line of the seed breakdown, e.g. "せいかい +24". */
export const seedLineText = (line: SeedLine) => `${SEED_LABEL[line.kind]} +${line.seeds}`;

/** Shown when free practice reached the day's limit; practice itself goes on. */
export const SEED_CAP_NOTE = "きょうの たねは ここまで。れんしゅうは できるよ";

export function headline(s: SetSummary): { title: string; good: boolean } {
  if (s.result === "interrupted") return { title: "とちゅうで おやすみ", good: false };
  switch (s.kind) {
    case "warmup":
      return { title: "ウォームアップ おわり！", good: true };
    case "challenge":
      return { title: s.challengeBest?.isNew ? "じこベスト こうしん！" : "チャレンジ おわり！", good: true };
    case "review": {
      const passed = s.reviews.every((r) => r.passed);
      return { title: passed ? "ふくしゅう ごうかく！" : "ふくしゅう おわり", good: passed };
    }
    case "stage_check":
      return { title: s.stageCheck?.passed ? "ステージチェック ごうかく！" : "ステージチェック おわり", good: !!s.stageCheck?.passed };
    case "placement":
      return { title: s.placement?.phase === "done" ? "しんだん おわり！" : "しんだん すすんだよ", good: true };
    case "check":
      return { title: s.check?.passed ? "ごうかく！" : "チェック おわり", good: true };
    default:
      if (s.events.includes("mastered")) return { title: "マスター！", good: true };
      if (s.result === "retry") return { title: "もう すこし！", good: false };
      if (s.mode !== "S") return { title: "まちがい なし！", good: true };
      return { title: s.result === "star3" ? "すごい！ ★3" : s.result === "star2" ? "ごうかく！ ★2" : "まちがい なし！ ★1", good: true };
  }
}

/** Stars and the personal best belong to timed level sets. */
export const isTimed = (s: SetSummary) => (s.kind === "main" || s.kind === "extra") && s.mode === "S" && s.result !== "interrupted";

export const celebrates = (s: SetSummary) =>
  headline(s).good && (s.stars >= 2 || s.events.includes("mastered") || s.goalReached || !!s.stageCheck?.passed || s.newRewards.length > 0);

export function resultNotes(s: SetSummary): { icon: NoteIcon; text: string }[] {
  const notes: { icon: NoteIcon; text: string }[] = [];
  if (s.check) {
    const c = s.check;
    if (c.startLevel) {
      const name = levelName(c.startLevel);
      const mode = MODE_LABEL[c.startMode ?? "H"];
      notes.push({ icon: "next", text: c.startNext ? `「${name}」の ${mode}から はじめよう` : `「${name}」は あとで ${mode}から れんしゅうしよう` });
    } else if (c.stageDone) notes.push({ icon: "sparkles", text: "チェック おわり！ つぎは ★3を めざそう" });
    else notes.push({ icon: "sparkles", text: "つぎの レベルへ" });
  }
  if (s.events.includes("star2")) notes.push({ icon: "sparkles", text: "つぎの レベルが ひらいたよ" });
  if (s.events.includes("mastered")) notes.push({ icon: "crown", text: "この レベルを マスター！ ときどき ふくしゅうが でるよ" });
  if (s.nextMode && s.events.includes("modeUp")) notes.push({ icon: "next", text: `つぎは「${MODE_LABEL[s.nextMode]}」で やってみよう` });
  if (s.nextMode && s.events.includes("modeDown")) notes.push({ icon: "retry", text: `「${MODE_LABEL[s.nextMode]}」で もういちど かたを たしかめよう` });
  if (s.result === "retry" && s.mode === "S" && !s.nextMode) notes.push({ icon: "retry", text: "まちがえた もんだいを ふくしゅうして もういちど" });
  if (s.goalReached) notes.push({ icon: "trophy", text: "きょうの ゴール たっせい！" });
  if (s.stageCheck && !s.stageCheck.passed) notes.push({ icon: "retry", text: "まちがえた ところを つぎの れんしゅうで やるよ" });
  return notes;
}
