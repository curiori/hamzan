// Keeps a child's saved records in step with the course (src/course/course.json), on every load and after a move to a
// new version of the saved data. Pure, and the same however often it runs. It never deletes a record: ids this version
// does not know (a level a newer version added, or one that was retired) stay, and the screens and plans pass over them,
// so a newer version reading the records again finds everything. See docs/superpowers/specs/2026-11-04-hamzan-one-course-design.md.
import { COURSE, type Course } from "@/course/course";
import { startPlacement, type PlacementState } from "@/course/placement";
import { hasStar2, type LevelProgress, type ProgressMap } from "@/domain/progression";
import type { ReviewItem } from "@/domain/review";
import { LEVELS } from "@/domain/spec";
import type { CourseRecord, Profile } from "./types";

const has = (o: object, k: string | number) => Object.prototype.hasOwnProperty.call(o, k);
const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

/** a new child has met every level of the course */
export const freshCourseRecord = (course: Course = COURSE): CourseRecord => ({ version: course.version, seen: course.levels.map((l) => l.id), checks: [] });

/** "6-1" → [6, 1] for the order of the numbered ids of earlier builds */
const numbered = (id: string): [number, number] | null => {
  const m = /^(\d+)-(\d+)$/.exec(id);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** Records saved before the course was recorded: the 61 levels of curriculum.json in their order, then any other level with progress. */
export function legacyCourseRecord(p: Pick<Profile, "progress">): CourseRecord {
  const core = LEVELS.map((l) => l.id);
  const inCore = new Set(core);
  const others = Object.keys(p.progress)
    .filter((id) => !inCore.has(id))
    .map((id, i) => ({ id, i, n: numbered(id) }))
    .sort((a, b) => (a.n && b.n ? a.n[0] - b.n[0] || a.n[1] - b.n[1] : a.n ? -1 : b.n ? 1 : a.i - b.i))
    .map((x) => x.id);
  return { version: 1, seen: [...core, ...others], checks: [] };
}

/** how far a level got: mastered, ★2, practised */
const reach = (lp: LevelProgress) => (lp.masteredAt ? 4 : 0) + (lp.star2At ? 2 : 0) + (lp.practiced ? 1 : 0);

function renameProgress(map: ProgressMap, rn: (id: string) => string): ProgressMap {
  const out: ProgressMap = {};
  for (const [id, lp] of Object.entries(map)) {
    const to = rn(id);
    const cur = out[to];
    // the same level under its old and its new id: the further one stays (a tie keeps the new id's)
    if (!cur || reach(lp) > reach(cur) || (reach(lp) === reach(cur) && id === to)) out[to] = lp;
  }
  return out;
}

function renameReviews(reviews: ReviewItem[], rn: (id: string) => string): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const r of reviews) {
    const to = rn(r.levelId);
    const item = to === r.levelId ? r : { ...r, levelId: to };
    const i = out.findIndex((x) => x.levelId === to);
    if (i < 0) out.push(item);
    else if (r.levelId === to) out[i] = item;
  }
  return out;
}

function renamePlacement(st: PlacementState | null, rn: (id: string) => string): PlacementState | null {
  if (!st) return st;
  return {
    ...st,
    pendingFrontier: st.pendingFrontier ? { ...st.pendingFrontier, levelId: rn(st.pendingFrontier.levelId) } : null,
    result: st.result ? { ...st.result, frontier: st.result.frontier === null ? null : rn(st.result.frontier) } : null,
  };
}

/** A diagnosis under way: stays on stages this version has, and goes back to a new stage placed before where it is. */
function reconcilePlacement(st: PlacementState, seen: Set<string>, course: Course): PlacementState {
  const pos = (id: number) => course.stages.findIndex((x) => x.id === id);
  let s = st;
  if (s.pendingFrontier && !has(course.level, s.pendingFrontier.levelId)) s = { ...s, pendingFrontier: null };
  if (pos(s.stage) < 0) {
    const from = Math.max(0, pos(startPlacement(s.grade, course).stage));
    const next = course.stages.slice(from).find((x) => !s.passed.includes(x.id)) ?? course.stages[course.stages.length - 1];
    return { ...s, stage: next.id, phase: "stageCheck", miniIndex: 0 };
  }
  if (s.phase === "mini" && s.miniIndex >= course.stage[s.stage].levelIds.length) s = { ...s, phase: "stageCheck", miniIndex: 0 };
  const cur = pos(s.stage);
  const start = Math.min(cur, ...s.checked.map(pos).filter((i) => i >= 0));
  const back = course.stages.find((x, i) => i > start && i < cur && !s.checked.includes(x.id) && x.levelIds.some((id) => !seen.has(id)));
  return back ? { ...s, stage: back.id, phase: "stageCheck", miniIndex: 0, pendingFrontier: null } : s;
}

export function reconcileProfile(p: Profile, course: Course = COURSE): Profile {
  const rn = (id: string) => (has(course.renamed, id) ? course.renamed[id] : id);
  const known = (id: string) => has(course.level, id);
  const rec = p.course ?? legacyCourseRecord(p);

  const progress = renameProgress(p.progress, rn);
  const reviews = renameReviews(p.reviews, rn);
  const facts = Object.fromEntries(Object.entries(p.facts).map(([k, f]) => [k, f.levelId === rn(f.levelId) ? f : { ...f, levelId: rn(f.levelId) }]));
  const errors = p.errors.map((e) => (e.levelId === rn(e.levelId) ? e : { ...e, levelId: rn(e.levelId) }));
  const sets = p.sets.map((s) => (s.levelId && s.levelId !== rn(s.levelId) ? { ...s, levelId: rn(s.levelId) } : s));
  const sessions = Object.fromEntries(
    Object.entries(p.sessions).map(([d, day]) => [d, { ...day, plan: day.plan.map((part) => (part.kind === "review" ? { ...part, levelIds: unique(part.levelIds.map(rn)) } : part)) }]),
  );
  const seenBefore = unique(rec.seen.map(rn));
  const seen = new Set(seenBefore);
  let placement = renamePlacement(p.placement, rn);
  if (placement && placement.phase !== "done") placement = reconcilePlacement(placement, seen, course);

  const star2 = (id: string) => !!progress[id] && hasStar2(progress[id]);
  const waiting = unique(rec.checks.map(rn));
  const added: string[] = [];
  if (p.placementDone) {
    // where the child was: the first level of the order they last saw that has no ★2 and is not waiting for its check
    const inQueue = new Set(waiting);
    const anchor = seenBefore.find((id) => known(id) && !star2(id) && !inQueue.has(id));
    const boundary = anchor ? course.level[anchor].order : course.levels.length;
    for (const l of course.levels)
      if (l.order < boundary && !inQueue.has(l.id) && !star2(l.id) && !progress[l.id]?.practiced) added.push(l.id);
  }
  const queued = new Set([...waiting, ...added]);
  const checks = [...course.levels.filter((l) => queued.has(l.id) && !star2(l.id)).map((l) => l.id), ...waiting.filter((id) => !known(id))];

  return {
    ...p,
    progress,
    reviews,
    facts,
    errors,
    sets,
    sessions,
    placement,
    course: {
      version: Math.max(rec.version, course.version),
      seen: [...course.levels.map((l) => l.id), ...seenBefore.filter((id) => !known(id))],
      checks,
    },
  };
}
