// Progress of any level: stage 0–5 levels open by their prerequisites (src/domain/progression.ts),
// stage 6–9 levels open with their 塾の単元 (src/juku/track.ts).
import { diffDays, type LocalDate } from "@/domain/dates";
import { isMastered, statusOf, type LevelProgress, type LevelStatus, type ProgressMap } from "@/domain/progression";
import { SPEC } from "@/domain/spec";
import { JLEVELS } from "@/juku/spec";
import { anyLp, jukuStatus, type JukuState } from "@/juku/track";
import { ALL_LEVELS, isJukuLevel } from "./levels";

export const lpAny = (map: ProgressMap, id: string): LevelProgress => anyLp(map, id);

const NONE_OPEN: JukuState = Object.freeze({ open: Object.freeze({}), checks: Object.freeze([]) }) as unknown as JukuState;

/** the child's 塾の単元 (older saves have none); the same object while nothing is open, so screens can memoize on it */
export const jukuOf = (p: { juku?: JukuState }): JukuState => p.juku ?? NONE_OPEN;

export function levelStatus(progress: ProgressMap, juku: JukuState, id: string, unlockAll = false): LevelStatus {
  return isJukuLevel(id) ? jukuStatus(progress, juku, id, unlockAll) : statusOf(progress, id, unlockAll);
}

/** every mastered level, stages 0–9 */
export const masteredAll = (progress: ProgressMap): string[] => ALL_LEVELS.filter((l) => isMastered(anyLp(progress, l.id))).map((l) => l.id);

/** the weekly challenge needs a mastered level (any stage) and a week since the last one */
export function challengeOpen(progress: ProgressMap, lastDate: LocalDate | null, date: LocalDate): boolean {
  if (!masteredAll(progress).length) return false;
  return lastDate === null || diffDays(date, lastDate) >= SPEC.rules.dailySession.weeklyChallenge.everyDays;
}

/** the progress entries of stages 6–9 (kept when the diagnosis writes the progress of stages 0–5) */
export function jukuEntries(progress: ProgressMap): ProgressMap {
  return Object.fromEntries(JLEVELS.filter((l) => progress[l.id]).map((l) => [l.id, progress[l.id]]));
}
