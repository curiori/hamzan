import type { CourseAnswer, CourseInstance } from "@/course/problems";
import type { ProblemResult } from "@/state/types";

// The order of problems in one set: a wrong first answer is asked again at the end (not in warm-ups);
// only first answers are recorded (rules.stars.retry).

export interface QueueItem {
  inst: CourseInstance;
  requeue: boolean;
}

export interface PlayQueue {
  items: QueueItem[];
  pos: number;
  results: ProblemResult[];
}

export const initQueue = (problems: CourseInstance[]): PlayQueue => ({ items: problems.map((inst) => ({ inst, requeue: false })), pos: 0, results: [] });

export const currentItem = (q: PlayQueue): QueueItem | null => q.items[q.pos] ?? null;

export function answerCurrent(q: PlayQueue, r: { correct: boolean; given: CourseAnswer | null; latencyMs: number }, warm: boolean): PlayQueue {
  const item = currentItem(q);
  if (!item || item.requeue) return q;
  const results = [...q.results, { inst: item.inst, correct: r.correct, given: r.given, latencyMs: r.latencyMs }];
  const items = !r.correct && !warm ? [...q.items, { inst: item.inst, requeue: true }] : q.items;
  return { ...q, items, results };
}

export const advance = (q: PlayQueue): PlayQueue => ({ ...q, pos: q.pos + 1 });

export const isFinished = (q: PlayQueue) => q.pos >= q.items.length;
