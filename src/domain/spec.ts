// curriculum.json is the source of truth for every learning rule (C-9). This module types it,
// pulls the few numbers that only exist inside rule sentences, and validates it at startup.
import raw from "./curriculum.json";

export type Mode = "H" | "M" | "S";

export interface LevelSpec {
  id: string;
  order: number;
  stage: number;
  operation: string;
  name: string;
  skill: string;
  example: string;
  generationRule: string;
  problemShapes: string[];
  modes: Mode[];
  scaffoldKind: string;
  scaffoldText: string;
  setSize: number;
  K: number;
  D: number;
  prerequisites: string[];
  enumerable: boolean;
  approxDistinctProblems: number;
  tableFactors?: number[];
}

export interface StageSpec {
  id: number;
  name: string;
  aim: string;
  grade: string;
  levelIds: string[];
  stageCheck: { levels: string[]; problems: number };
}

export interface Coeffs {
  read: number;
  think: number;
  write: number;
}

interface ErrorTypeSpec {
  id: string;
  name: string;
  detect: string;
  remedy: string;
}

interface Curriculum {
  specVersion: string;
  title: string;
  timeModel: {
    star2: Coeffs;
    star3: Coeffs;
    inputSpeedTest: { items: number; itemDigits: number; clampSec: [number, number]; retestAfterDays: number };
  };
  stages: StageSpec[];
  levels: LevelSpec[];
  scaffoldKinds: Record<string, { use: string; hint?: string; steps: unknown[]; memo?: string }>;
  modes: Record<Mode, string>;
  rules: {
    stars: { mastery: { star3OnDistinctLocalDates: number }; retry: string };
    modeProgression: { M: { memoTimeFactor: number } };
    progression: {
      activeSlots: { max: number };
      fallbackToPrerequisite: { speedSetsWithoutStar2: number };
      modeStepBack: { consecutiveSets: number; minErrorsPerSet: number };
    };
    spacedReview: {
      intervalsDays: number[];
      thenEveryDays: number;
      problemsPerLevel: number;
      onFail: string;
      demoteAfterConsecutiveFails: number;
      maxLevelsPerDay: number;
    };
    setGeneration: { fixedSetDaysForNewLevelSpeed: number; weakFactWeight: number; weakFactWindowDays: number };
    dailySession: {
      targetMinutes: [number, number];
      warmup: { seconds: number };
      weeklyChallenge: { everyDays: number; problems: number };
    };
    placement: {
      startStageByGrade: Record<string, number>;
      stageCheckPass: string;
      onFail: string;
      maxMinutesPerDay: number;
    };
    errorTypes: ErrorTypeSpec[];
    errorTypeOrder: string[];
    timing: { interrupted: string };
  };
  freemium: Record<string, unknown>;
}

export const SPEC = raw as unknown as Curriculum;
export const LEVELS: LevelSpec[] = [...SPEC.levels].sort((a, b) => a.order - b.order);
export const LEVEL: Record<string, LevelSpec> = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
export const STAGES: StageSpec[] = SPEC.stages;
export const ERROR_TYPES: ErrorTypeSpec[] = SPEC.rules.errorTypes;

/** Numbers that the spec states only inside a sentence (still read from the JSON, never hard-coded). */
function numberIn(text: string, re: RegExp): number {
  const m = re.exec(text);
  return m ? Number(m[1]) : NaN;
}
export const RULE_NUMBERS = {
  /** 「60秒を超えてバックグラウンドにいたら…判定しない」 */
  backgroundLimitSec: numberIn(SPEC.rules.timing.interrupted, /(\d+)秒/),
  /** 「正しい答えを約1秒表示」 */
  revealSec: numberIn(SPEC.rules.stars.retry, /約(\d+)秒/),
  /** 「2日後に再設定」 */
  reviewRetryDays: numberIn(SPEC.rules.spacedReview.onFail, /(\d+)日後/),
  /** placement: 「ミス1問以内」 */
  stageCheckMaxMisses: numberIn(SPEC.rules.placement.stageCheckPass, /ミス(\d+)問以内/),
  /** placement: 「各レベル5問（S）のミニチェック」 */
  miniCheckProblems: numberIn(SPEC.rules.placement.onFail, /各レベル(\d+)問/),
};

export const nextMode = (lv: LevelSpec, m: Mode): Mode => lv.modes[Math.min(lv.modes.indexOf(m) + 1, lv.modes.length - 1)];
export const prevMode = (lv: LevelSpec, m: Mode): Mode => lv.modes[Math.max(lv.modes.indexOf(m) - 1, 0)];
export const stageOf = (levelId: string) => LEVEL[levelId].stage;

/** Startup validation (the native spec asks for zod; this prototype checks the same shape by hand). */
export function validateSpec(): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  if (!Array.isArray(SPEC.levels) || SPEC.levels.length === 0) errs.push("levels がありません");
  LEVELS.forEach((l, i) => {
    if (ids.has(l.id)) errs.push(`レベルIDが重複: ${l.id}`);
    ids.add(l.id);
    if (l.order !== i) errs.push(`order が連番ではありません: ${l.id}`);
    if (!STAGES.some((s) => s.id === l.stage)) errs.push(`${l.id}: stage ${l.stage} がありません`);
    if (!l.modes.length || l.modes.some((m) => !["H", "M", "S"].includes(m)) || l.modes[l.modes.length - 1] !== "S")
      errs.push(`${l.id}: modes が不正`);
    if (!SPEC.scaffoldKinds[l.scaffoldKind]) errs.push(`${l.id}: scaffoldKind ${l.scaffoldKind} がありません`);
    for (const k of ["setSize", "K", "D"] as const) if (!(typeof l[k] === "number" && l[k] > 0)) errs.push(`${l.id}: ${k} が不正`);
    if (typeof l.enumerable !== "boolean") errs.push(`${l.id}: enumerable が不正`);
  });
  LEVELS.forEach((l) =>
    l.prerequisites.forEach((p) => {
      if (!LEVEL[p]) errs.push(`${l.id}: 前提 ${p} がありません`);
      else if (LEVEL[p].order >= l.order) errs.push(`${l.id}: 前提 ${p} が後ろにあります`);
    }),
  );
  STAGES.forEach((s) => {
    s.levelIds.forEach((id) => {
      if (LEVEL[id]?.stage !== s.id) errs.push(`ステージ${s.id}: ${id} の所属が不一致`);
    });
    s.stageCheck.levels.forEach((id) => {
      if (!LEVEL[id]) errs.push(`ステージ${s.id}: チェック用 ${id} がありません`);
    });
    if (!(s.stageCheck.problems > 0)) errs.push(`ステージ${s.id}: stageCheck.problems が不正`);
  });
  const tm = SPEC.timeModel;
  for (const c of [tm.star2, tm.star3]) for (const k of ["read", "think", "write"] as const) if (!(c[k] > 0)) errs.push(`timeModel の ${k} が不正`);
  const r = SPEC.rules;
  const nums: [string, number][] = [
    ["mastery", r.stars.mastery.star3OnDistinctLocalDates],
    ["memoTimeFactor", r.modeProgression.M.memoTimeFactor],
    ["speedSetsWithoutStar2", r.progression.fallbackToPrerequisite.speedSetsWithoutStar2],
    ["modeStepBack.consecutiveSets", r.progression.modeStepBack.consecutiveSets],
    ["modeStepBack.minErrorsPerSet", r.progression.modeStepBack.minErrorsPerSet],
    ["thenEveryDays", r.spacedReview.thenEveryDays],
    ["problemsPerLevel", r.spacedReview.problemsPerLevel],
    ["maxLevelsPerDay", r.spacedReview.maxLevelsPerDay],
    ["demoteAfterConsecutiveFails", r.spacedReview.demoteAfterConsecutiveFails],
    ["fixedSetDaysForNewLevelSpeed", r.setGeneration.fixedSetDaysForNewLevelSpeed],
    ["weakFactWeight", r.setGeneration.weakFactWeight],
    ["weakFactWindowDays", r.setGeneration.weakFactWindowDays],
    ["warmup.seconds", r.dailySession.warmup.seconds],
    ["weeklyChallenge.everyDays", r.dailySession.weeklyChallenge.everyDays],
    ["weeklyChallenge.problems", r.dailySession.weeklyChallenge.problems],
    ["placement.maxMinutesPerDay", r.placement.maxMinutesPerDay],
    ...Object.entries(RULE_NUMBERS),
  ];
  nums.forEach(([k, v]) => {
    if (!(typeof v === "number" && Number.isFinite(v) && v >= 0)) errs.push(`ルールの数値 ${k} を読み取れません`);
  });
  if (!r.spacedReview.intervalsDays?.length) errs.push("spacedReview.intervalsDays がありません");
  if (r.errorTypeOrder.some((id) => !r.errorTypes.some((e) => e.id === id))) errs.push("errorTypeOrder が errorTypes と一致しません");
  return errs;
}
