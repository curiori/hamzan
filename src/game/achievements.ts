// Hamster room goods unlocked by learning milestones. These are never sold and never random.
// The earn-only shop currency (ひまわりのたね) lives in src/game/economy.ts (C-7, revised for the iOS app).
// Counts start after the diagnosis, so every child earns the first goods through practice.
export interface RewardStats {
  cleanSets: number;
  star2Levels: number;
  mastered: number;
  goalDays: number;
  stageChecksPassed: number;
}

export interface RewardItem {
  id: string;
  name: string;
  need: string;
  wear?: boolean;
  test: (s: RewardStats) => boolean;
}

export const REWARDS: RewardItem[] = [
  { id: "bowl", name: "ごはんざら", need: "はじめて まちがいなしで おわる", test: (s) => s.cleanSets >= 1 },
  { id: "wheel", name: "まわしぐるま", need: "あたらしく ★2を 1つ とる", test: (s) => s.star2Levels >= 1 },
  { id: "house", name: "きの おうち", need: "きょうの ゴールを 1かい", test: (s) => s.goalDays >= 1 },
  { id: "tunnel", name: "トンネル", need: "あたらしく ★2を 5つ とる", test: (s) => s.star2Levels >= 5 },
  { id: "hachimaki", name: "ごうかく はちまき", need: "ステージチェックに ごうかく", wear: true, test: (s) => s.stageChecksPassed >= 1 },
  { id: "desk", name: "べんきょうづくえ", need: "レベルを 1つ マスターする", test: (s) => s.mastered >= 1 },
  { id: "flower", name: "ひまわりの はち", need: "きょうの ゴールを 7かい", test: (s) => s.goalDays >= 7 },
  { id: "swing", name: "ブランコ", need: "あたらしく ★2を 15 とる", test: (s) => s.star2Levels >= 15 },
  { id: "hammock", name: "ハンモック", need: "レベルを 10 マスターする", test: (s) => s.mastered >= 10 },
  { id: "crown", name: "おうかん", need: "レベルを 30 マスターする", wear: true, test: (s) => s.mastered >= 30 },
];

export const unlockedRewards = (s: RewardStats) => REWARDS.filter((r) => r.test(s)).map((r) => r.id);
