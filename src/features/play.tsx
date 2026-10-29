import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { Check, Delete, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Hamster, type Mood } from "@/components/hamster-art";
import { useConfirm } from "@/hooks/use-confirm";
import { LEVEL, RULE_NUMBERS, type Mode } from "@/domain/spec";
import {
  answerText,
  digitsOf,
  display,
  sameAnswer,
  sameStep,
  speech,
  stepText,
  type Answer,
  type Problem,
  type ProblemInstance,
  type StepValue,
} from "@/domain/problem";
import { hintLines, scaffoldOf } from "@/domain/scaffolds";
import type { ProblemResult } from "@/lib/store";
import { cue } from "@/features/feedback";
import { Visual } from "@/features/visuals";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- problem text
function pairTerms(p: Problem): number[] {
  if (p.shape !== "chain" || !p.ops.every((o) => o === "+")) return [];
  const t = p.terms;
  for (const mod of [100, 10])
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if ((t[i] + t[j]) % mod === 0) return [i, j];
  return [];
}

export function ProblemText({ inst, hint, className }: { inst: ProblemInstance; hint?: boolean; className?: string }) {
  const p = inst.problem;
  const pair = hint && LEVEL[inst.levelId].scaffoldKind === "PAIR_FIRST" ? pairTerms(p) : [];
  let termIndex = -1;
  const parts = display(p).split(/(\d+|□|の半分|の倍数？)/g).filter(Boolean);
  return (
    <p className={cn("font-black leading-tight tabular-nums", className)} aria-label={speech(p)} data-problem={JSON.stringify(p)} data-level={inst.levelId}>
      <span aria-hidden="true">
        {parts.map((part, i) => {
          if (/^\d+$/.test(part)) {
            termIndex += 1;
            return (
              <span key={i} className={cn(pair.includes(termIndex) && "rounded-lg bg-amber-200 px-1 text-amber-950 dark:bg-amber-800 dark:text-amber-50")}>
                {part}
              </span>
            );
          }
          if (part === "□")
            return <span key={i} className="mx-1 inline-block size-[0.85em] translate-y-[0.06em] rounded-md border-[0.08em] border-current" />;
          if (part === "の半分")
            return (
              <span key={i}>
                の<ruby>半分<rt className="text-[0.35em] font-bold">はんぶん</rt></ruby>
              </span>
            );
          if (part === "の倍数？")
            return (
              <span key={i}>
                の<ruby>倍数<rt className="text-[0.35em] font-bold">ばいすう</rt></ruby>？
              </span>
            );
          return (
            <span key={i} className="mx-[0.06em]">
              {part}
            </span>
          );
        })}
      </span>
    </p>
  );
}

// ---------------------------------------------------------------- fields + keypad
type FieldDef = { kind: "num" | "bool"; digits: number; label: string; role: "plain" | "q" | "r" };

const clean = (v: string) =>
  v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, "")
    .slice(0, 7);

function defsForAnswer(a: Answer | StepValue, label = "こたえ"): FieldDef[] {
  if (typeof a === "boolean") return [{ kind: "bool", digits: 1, label: "○か×", role: "plain" }];
  if (typeof a === "number") return [{ kind: "num", digits: digitsOf(a), label, role: "plain" }];
  if ("kind" in a) {
    if (a.kind === "bool") return [{ kind: "bool", digits: 1, label: "○か×", role: "plain" }];
    if (a.kind === "number") return [{ kind: "num", digits: digitsOf(a.value), label, role: "plain" }];
    return [
      { kind: "num", digits: digitsOf(a.quotient), label: "しょう", role: "q" },
      { kind: "num", digits: digitsOf(a.remainder), label: "あまり", role: "r" },
    ];
  }
  return [
    { kind: "num", digits: digitsOf(a.quotient), label: "しょう", role: "q" },
    { kind: "num", digits: digitsOf(a.remainder), label: "あまり", role: "r" },
  ];
}

function useFieldSet(defs: FieldDef[], resetKey: string, autoSubmit: boolean, onComplete: (vals: string[]) => void) {
  const fresh = useCallback(() => ({ key: resetKey, vals: defs.map(() => ""), active: 0 }), [defs, resetKey]);
  const [st, setSt] = useState(fresh);
  const cur = st.key === resetKey ? st : fresh();
  const doneKey = useRef<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const finish = (vals: string[]) => {
    if (doneKey.current === resetKey) return;
    doneKey.current = resetKey;
    onComplete(vals);
  };
  const apply = (vals: string[], idx: number) => {
    const d = defs[idx];
    const full = d.kind === "bool" ? !!vals[idx] : autoSubmit && vals[idx].length >= d.digits;
    if (full && idx < defs.length - 1) setSt({ key: resetKey, vals, active: idx + 1 });
    else {
      setSt({ key: resetKey, vals, active: idx });
      if (full) finish(vals);
    }
  };
  const press = (k: string) => {
    if (doneKey.current === resetKey) return;
    const idx = cur.active;
    const d = defs[idx];
    const vals = [...cur.vals];
    if (k === "del") {
      if (vals[idx]) {
        vals[idx] = vals[idx].slice(0, -1);
        setSt({ key: resetKey, vals, active: idx });
      } else if (idx > 0) setSt({ key: resetKey, vals, active: idx - 1 });
      return;
    }
    if (k === "rem") {
      if (vals[idx] && idx < defs.length - 1) setSt({ key: resetKey, vals, active: idx + 1 });
      return;
    }
    if (k === "ok") {
      if (vals.every(Boolean)) finish(vals);
      else if (vals[idx] && idx < defs.length - 1) setSt({ key: resetKey, vals, active: idx + 1 });
      return;
    }
    if ((k === "o" || k === "x") && d.kind === "bool") {
      vals[idx] = k === "o" ? "○" : "×";
      apply(vals, idx);
      return;
    }
    if (/^\d$/.test(k) && d.kind === "num") {
      vals[idx] = (vals[idx] + k).slice(0, 7);
      apply(vals, idx);
    }
  };
  const type = (idx: number, raw: string, composing: boolean) => {
    if (idx !== cur.active || doneKey.current === resetKey) return;
    const d = defs[idx];
    const vals = [...cur.vals];
    if (d.kind === "bool") {
      const ch = raw.slice(-1).toLowerCase();
      if (ch === "o" || ch === "○" || ch === "x" || ch === "×") {
        vals[idx] = ch === "o" || ch === "○" ? "○" : "×";
        apply(vals, idx);
      }
      return;
    }
    if (composing) {
      vals[idx] = raw;
      setSt({ key: resetKey, vals, active: idx });
      return;
    }
    vals[idx] = clean(raw);
    apply(vals, idx);
  };
  useEffect(() => {
    refs.current[cur.active]?.focus({ preventScroll: true });
  }, [cur.active, resetKey]);
  return { vals: cur.vals, active: cur.active, press, type, refs, done: doneKey.current === resetKey };
}

function FieldBox({
  def,
  value,
  active,
  inputRef,
  onType,
  revealed,
}: {
  def: FieldDef;
  value: string;
  active: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onType: (raw: string, composing: boolean) => void;
  revealed?: boolean;
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      readOnly={!active}
      tabIndex={active ? 0 : -1}
      inputMode="none"
      autoComplete="off"
      spellCheck={false}
      aria-label={def.label}
      onChange={(e) => onType(e.target.value, (e.nativeEvent as InputEvent).isComposing)}
      onCompositionEnd={(e) => onType(e.currentTarget.value, false)}
      style={{ width: `${Math.max(def.digits, value.length, 1) * 0.72 + 1.1}em` }}
      className={cn(
        "mx-1 inline-block h-[1.5em] rounded-xl border-2 bg-background text-center align-middle font-black tabular-nums outline-none transition-colors",
        active ? "border-primary ring-4 ring-primary/25" : "border-foreground/25",
        revealed && "border-orange-600 text-orange-700 dark:text-orange-300",
      )}
    />
  );
}

const keyCls =
  "grid h-14 place-items-center rounded-2xl border bg-card text-2xl font-black shadow-sm transition hover:bg-accent active:scale-95 disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-16";

function Keypad({ def, canRem, onKey, disabled }: { def: FieldDef | null; canRem: boolean; onKey: (k: string) => void; disabled: boolean }) {
  if (def?.kind === "bool")
    return (
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="○か×">
        <button type="button" className={cn(keyCls, "h-24 text-5xl sm:h-28")} onClick={() => onKey("o")} disabled={disabled} aria-label="まる（ばいすう）">
          ○
        </button>
        <button type="button" className={cn(keyCls, "h-24 text-5xl sm:h-28")} onClick={() => onKey("x")} disabled={disabled} aria-label="ばつ（ばいすうではない）">
          ×
        </button>
      </div>
    );
  const digits = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="すうじキー">
      <div className="col-span-3 grid grid-cols-3 gap-2">
        {digits.map((d) => (
          <button key={d} type="button" className={keyCls} onClick={() => onKey(d)} disabled={disabled}>
            {d}
          </button>
        ))}
        <button type="button" className={cn(keyCls, "col-span-3")} onClick={() => onKey("0")} disabled={disabled}>
          0
        </button>
      </div>
      <div className="grid gap-2">
        <button type="button" className={keyCls} onClick={() => onKey("del")} disabled={disabled} aria-label="けす">
          <Delete className="size-6" aria-hidden="true" />
        </button>
        <button type="button" className={cn(keyCls, "text-base")} onClick={() => onKey("rem")} disabled={disabled || !canRem}>
          あまり
        </button>
        <button
          type="button"
          className={cn(keyCls, "row-span-2 h-auto border-primary bg-primary text-xl text-primary-foreground hover:bg-primary/90")}
          onClick={() => onKey("ok")}
          disabled={disabled}
        >
          OK
        </button>
      </div>
    </div>
  );
}

type SolverResult = { correct: boolean; given: Answer | null; reveal: string };
interface SolverProps {
  inst: ProblemInstance;
  autoSubmit: boolean;
  locked: boolean;
  onDone: (r: SolverResult) => void;
  keypadEl: HTMLElement | null;
  sfx: (k: "ok" | "miss") => void;
}

function toAnswer(defs: FieldDef[], vals: string[], like: Answer): Answer {
  if (like.kind === "bool") return { kind: "bool", value: vals[0] === "○" };
  if (like.kind === "divRem") return { kind: "divRem", quotient: Number(vals[0]), remainder: Number(vals[1]) };
  return { kind: "number", value: Number(vals[defs.length - 1]) };
}

function toStep(vals: string[], like: StepValue): StepValue {
  if (typeof like === "boolean") return vals[0] === "○";
  if (typeof like === "object") return { quotient: Number(vals[0]), remainder: Number(vals[1]) };
  return Number(vals[0]);
}

// S mode, warm-up, checks: the answer only.
function AnswerSolver({ inst, autoSubmit, locked, onDone, keypadEl, tries = 1, sfx }: SolverProps & { tries?: number }) {
  const defs = useMemo(() => defsForAnswer(inst.answer), [inst]);
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const fs = useFieldSet(defs, `a${attempt}`, autoSubmit, (vals) => {
    const given = toAnswer(defs, vals, inst.answer);
    const ok = sameAnswer(given, inst.answer);
    if (!ok && attempt + 1 < tries) {
      sfx("miss");
      setMsg("ちがうよ。もういちど");
      setAttempt((a) => a + 1);
      return;
    }
    onDone({ correct: ok, given: ok ? null : given, reveal: answerText(inst.answer) });
  });
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-y-2 text-4xl sm:text-5xl">
        {defs.map((d, i) => (
          <span key={i} className="inline-flex items-center">
            {d.role === "r" && <span className="mx-1 text-2xl font-black">あまり</span>}
            <FieldBox
              def={d}
              value={fs.vals[i]}
              active={!locked && fs.active === i}
              inputRef={(el) => {
                fs.refs.current[i] = el;
              }}
              onType={(raw, c) => fs.type(i, raw, c)}
            />
          </span>
        ))}
      </div>
      {msg && <p className="mt-2 text-lg font-black text-orange-800 dark:text-orange-300">{msg}</p>}
      {keypadEl && createPortal(<Keypad def={defs[fs.active]} canRem={defs[fs.active]?.role === "q"} onKey={fs.press} disabled={locked} />, keypadEl)}
    </>
  );
}

// M mode: write the memo numbers, then the answer.
function MemoSolver(props: SolverProps) {
  const { inst, autoSubmit, locked, onDone, keypadEl } = props;
  const memo = useMemo(() => scaffoldOf(inst.levelId, inst.problem).memo, [inst]);
  const defs = useMemo<FieldDef[]>(
    () => [...memo.map((m, i) => ({ kind: "num" as const, digits: digitsOf(m), label: `メモ${i + 1}`, role: "plain" as const })), ...defsForAnswer(inst.answer)],
    [memo, inst],
  );
  const fs = useFieldSet(defs, "m", autoSubmit, (vals) => {
    const memoOk = memo.every((m, i) => Number(vals[i]) === m);
    const ansDefs = defs.slice(memo.length);
    const given = toAnswer(ansDefs, vals.slice(memo.length), inst.answer);
    const ansOk = sameAnswer(given, inst.answer);
    onDone({ correct: memoOk && ansOk, given: ansOk ? null : given, reveal: `メモ ${memo.join("、")} → ${answerText(inst.answer)}` });
  });
  if (!memo.length) return <AnswerSolver {...props} />;
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm font-black">メモ</span>
        {memo.map((_, i) => (
          <span key={i} className="text-3xl">
            <FieldBox
              def={defs[i]}
              value={fs.vals[i]}
              active={!locked && fs.active === i}
              inputRef={(el) => {
                fs.refs.current[i] = el;
              }}
              onType={(raw, c) => fs.type(i, raw, c)}
            />
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center text-4xl sm:text-5xl">
        {defs.slice(memo.length).map((d, j) => {
          const i = memo.length + j;
          return (
            <span key={i} className="inline-flex items-center">
              {d.role === "r" && <span className="mx-1 text-2xl font-black">あまり</span>}
              <FieldBox
                def={d}
                value={fs.vals[i]}
                active={!locked && fs.active === i}
                inputRef={(el) => {
                  fs.refs.current[i] = el;
                }}
                onType={(raw, c) => fs.type(i, raw, c)}
              />
            </span>
          );
        })}
      </div>
      {keypadEl && createPortal(<Keypad def={defs[fs.active]} canRem={defs[fs.active]?.role === "q"} onKey={fs.press} disabled={locked} />, keypadEl)}
    </>
  );
}

const RULE_CARD = "2・5は いちのくらい／4は したの 2けた／8は したの 3けた／3・9は かくくらいの かずを たす／6は 2と 3の りょうほう";

// H mode: fill the hint blanks one by one, judged at once; two misses reveal the value.
function HintSolver(props: SolverProps) {
  const { inst, autoSubmit, locked, onDone, keypadEl, sfx } = props;
  const sc = useMemo(() => scaffoldOf(inst.levelId, inst.problem), [inst]);
  const lines = useMemo(() => hintLines(inst.levelId, inst.problem), [inst]);
  const [filled, setFilled] = useState<(StepValue | null)[]>(() => sc.steps.map(() => null));
  const [revealed, setRevealed] = useState<boolean[]>(() => sc.steps.map(() => false));
  const [tries, setTries] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const missRef = useRef(false);
  const estimate = sc.kind === "ESTIMATE_DIVIDE" && inst.problem.shape === "binary";
  const active = filled.findIndex((v) => v === null);
  const expected = (i: number): StepValue => {
    if (estimate && i === 1 && inst.problem.shape === "binary") return inst.problem.b * Number(filled[0]);
    return sc.steps[i];
  };
  const want0 = active >= 0 ? (estimate && active === 1 && inst.problem.shape === "binary" ? inst.problem.b * Number(filled[0]) : sc.steps[active]) : null;
  const defs = useMemo(() => (want0 === null ? [] : defsForAnswer(want0, "□")), [want0]);

  const fs = useFieldSet(defs, `h${active}-${attempt}`, autoSubmit, (vals) => {
    if (active < 0) return;
    const value = toStep(vals, sc.steps[active]);
    const next = [...filled];
    const rev = [...revealed];
    if (estimate && active === 0) {
      next[0] = value;
      setFilled(next);
      setMsg(null);
      setTries(0);
      return;
    }
    const want = expected(active);
    if (sameStep(value, want)) {
      next[active] = want;
      setTries(0);
      setMsg(null);
      sfx("ok");
    } else if (tries + 1 >= 2) {
      next[active] = want;
      rev[active] = true;
      missRef.current = true;
      setTries(0);
      setMsg(`こたえは ${stepText(want)}`);
      sfx("miss");
    } else {
      setTries(tries + 1);
      setAttempt((a) => a + 1);
      setMsg("ちがうよ。もういちど");
      sfx("miss");
      return;
    }
    if (estimate && active === 1 && inst.problem.shape === "binary") {
      const p = inst.problem;
      if (Number(next[1]) !== p.a) {
        setMsg(`${p.b}×${Number(next[0])}＝${Number(next[1])}。${p.a}に ならないね。べつの かずで ためそう`);
        setFilled(sc.steps.map(() => null));
        setRevealed(rev);
        return;
      }
    }
    setFilled(next);
    setRevealed(rev);
    if (next.every((v) => v !== null)) onDone({ correct: !missRef.current, given: null, reveal: answerText(inst.answer) });
  });

  if (!sc.steps.length)
    return (
      <>
        <div className="mt-4 flex justify-center">
          <Visual inst={inst} />
        </div>
        <AnswerSolver {...props} tries={2} />
      </>
    );

  const firstUse = new Map<number, number>();
  lines.forEach((ln, li) =>
    ln.forEach((t, ti) => {
      if (t.t === "blank" && !firstUse.has(t.step)) firstUse.set(t.step, li * 1000 + ti);
    }),
  );
  return (
    <>
      {sc.kind === "DIVISIBILITY_RULE" && <p className="mx-auto mt-3 max-w-lg rounded-xl bg-muted px-3 py-2 text-sm font-bold">{RULE_CARD}</p>}
      <div className="mx-auto mt-4 grid max-w-xl gap-2 text-left text-2xl sm:text-3xl" aria-label="ヒント">
        {lines.map((ln, li) => (
          <p key={li} className="flex flex-wrap items-center gap-y-1 font-bold tabular-nums">
            {ln.map((t, ti) => {
              if (t.t === "text") return <span key={ti}>{t.v}</span>;
              const v = filled[t.step];
              const isInput = t.step === active && firstUse.get(t.step) === li * 1000 + ti;
              if (isInput)
                return (
                  <span key={ti} className="inline-flex items-center">
                    {defs.map((d, i) => (
                      <span key={i} className="inline-flex items-center">
                        {d.role === "r" && <span className="mx-1 text-xl">あまり</span>}
                        <FieldBox
                          def={d}
                          value={fs.vals[i]}
                          active={!locked && fs.active === i}
                          inputRef={(el) => {
                            fs.refs.current[i] = el;
                          }}
                          onType={(raw, c) => fs.type(i, raw, c)}
                        />
                      </span>
                    ))}
                  </span>
                );
              if (v !== null)
                return (
                  <span
                    key={ti}
                    className={cn(
                      "mx-1 inline-block min-w-[1.6em] rounded-lg px-1.5 text-center",
                      revealed[t.step] ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100" : "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
                    )}
                  >
                    {stepText(v)}
                  </span>
                );
              return <span key={ti} className="mx-1 inline-block h-[1.3em] w-[1.6em] translate-y-[0.15em] rounded-lg border-2 border-dashed border-foreground/30" />;
            })}
          </p>
        ))}
      </div>
      {msg && <p className="mt-3 text-lg font-black text-orange-800 dark:text-orange-300">{msg}</p>}
      {keypadEl && createPortal(<Keypad def={defs[fs.active] ?? null} canRem={defs[fs.active]?.role === "q"} onKey={fs.press} disabled={locked || active < 0} />, keypadEl)}
    </>
  );
}

// ---------------------------------------------------------------- play screen
export interface PlayRequest {
  key: string;
  title: string;
  subtitle: string;
  mode: Mode;
  problems: ProblemInstance[];
  warmupSec?: number;
}
export interface PlayOutcome {
  results: ProblemResult[];
  interrupted: boolean;
  activeSec: number;
}

interface QItem {
  inst: ProblemInstance;
  requeue: boolean;
}

export function PlayScreen({
  req,
  timer,
  autoSubmit,
  sound,
  vibration,
  wear,
  onFinish,
  onQuit,
}: {
  req: PlayRequest;
  timer: boolean;
  autoSubmit: boolean;
  sound: boolean;
  vibration: boolean;
  wear: string | null;
  onFinish: (o: PlayOutcome) => void;
  onQuit: () => void;
}) {
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const warm = req.warmupSec !== undefined;
  const [queue, setQueue] = useState<QItem[]>(() => req.problems.map((inst) => ({ inst, requeue: false })));
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<"ask" | "right" | "wrong" | "done">("ask");
  const [reveal, setReveal] = useState("");
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => performance.now());
  const [keypadEl, setKeypadEl] = useState<HTMLDivElement | null>(null);
  const results = useRef<ProblemResult[]>([]);
  const clock = useRef({ itemStart: performance.now() + 150, itemPaused: 0, active: 0, hidden: 0, hiddenAt: 0, pauseAt: 0, interrupted: false });
  const finished = useRef(false);
  const item = queue[Math.min(pos, queue.length - 1)];
  const sfx = useCallback((k: "ok" | "miss" | "clear") => cue(k, { sound, vibration }), [sound, vibration]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setPhase("done");
    onFinish({ results: results.current, interrupted: clock.current.interrupted, activeSec: Math.round(clock.current.active / 100) / 10 });
  }, [onFinish]);

  // background time is excluded; more than the limit interrupts the set
  useEffect(() => {
    const onVis = () => {
      const c = clock.current;
      if (document.hidden) c.hiddenAt = performance.now();
      else if (c.hiddenAt) {
        const d = performance.now() - c.hiddenAt;
        c.hidden += d;
        c.itemPaused += d;
        c.hiddenAt = 0;
        if (c.hidden > RULE_NUMBERS.backgroundLimitSec * 1000) c.interrupted = true;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const liveActive = clock.current.active + (phase === "ask" && !paused ? Math.max(0, now - clock.current.itemStart - clock.current.itemPaused) : 0);

  useEffect(() => {
    if (warm && phase === "ask" && !paused && liveActive >= (req.warmupSec ?? 0) * 1000) finish();
  }, [warm, phase, paused, liveActive, req.warmupSec, finish]);

  const advance = useCallback(() => {
    const c = clock.current;
    c.itemStart = performance.now() + 150;
    c.itemPaused = 0;
    if (pos + 1 >= queue.length) finish();
    else {
      setPos(pos + 1);
      setPhase("ask");
    }
  }, [pos, queue.length, finish]);

  useEffect(() => {
    if (phase !== "right" && phase !== "wrong") return;
    const t = window.setTimeout(advance, phase === "right" ? 450 : Math.max(1, RULE_NUMBERS.revealSec) * 1000 + 300);
    return () => window.clearTimeout(t);
  }, [phase, advance]);

  const onDone = (r: SolverResult) => {
    if (phase !== "ask" || !item) return;
    const c = clock.current;
    const latency = Math.max(0, performance.now() - c.itemStart - c.itemPaused);
    c.active += latency;
    if (!item.requeue) results.current.push({ inst: item.inst, correct: r.correct, given: r.given, latencyMs: Math.round(latency) });
    if (r.correct) {
      sfx("ok");
      setPhase("right");
    } else {
      sfx("miss");
      setReveal(r.reveal);
      if (!item.requeue && !warm) setQueue((q) => [...q, { inst: item.inst, requeue: true }]);
      setPhase("wrong");
    }
  };

  const togglePause = () => {
    const c = clock.current;
    if (!paused) c.pauseAt = performance.now();
    else {
      c.itemPaused += performance.now() - c.pauseAt;
      c.pauseAt = 0;
    }
    setPaused(!paused);
  };

  const quit = async () => {
    if (!paused) togglePause();
    if (await confirm({ title: "とちゅうで やめますか？", description: "この セットの きろくは のこりません。", confirmLabel: "やめる", cancelLabel: "つづける" })) onQuit();
  };

  if (!item) return null;
  const firstCount = req.problems.length;
  const doneCount = Math.min(results.current.length, firstCount);
  const mood: Mood = phase === "right" ? "happy" : phase === "wrong" ? "oops" : "idle";
  const mode: Mode = item.requeue ? "S" : req.mode;
  const solverProps = {
    inst: item.inst,
    autoSubmit,
    locked: phase !== "ask" || paused,
    onDone,
    sfx,
    keypadEl,
  };
  const solver =
    mode === "H" ? (
      <HintSolver key={`solver-${pos}`} {...solverProps} />
    ) : mode === "M" ? (
      <MemoSolver key={`solver-${pos}`} {...solverProps} />
    ) : (
      <AnswerSolver key={`solver-${pos}`} {...solverProps} />
    );

  const onSubmitForm = (e: FormEvent) => e.preventDefault();

  return (
    <section aria-labelledby="play-title" className="mx-auto w-full max-w-5xl px-4 py-4" data-mode={mode} data-phase={paused ? "paused" : phase}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-primary">{req.subtitle}</p>
          <h1 id="play-title" className="truncate text-lg font-black sm:text-xl">
            {req.title}
          </h1>
        </div>
        {timer && !warm && (
          <span className="rounded-full border bg-card px-3 py-1 text-sm font-bold tabular-nums">{(liveActive / 1000).toFixed(1)}びょう</span>
        )}
        <Button variant="outline" size="icon-lg" className="size-12" onClick={togglePause} aria-label={paused ? "つづける" : "いちじ ていし"} aria-pressed={paused}>
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
        <Button variant="ghost" size="icon-lg" className="size-12" onClick={quit} aria-label="やめる">
          <X aria-hidden="true" />
        </Button>
      </div>
      {warm ? (
        <Progress value={Math.min(100, (liveActive / ((req.warmupSec ?? 60) * 1000)) * 100)} className="mt-3 h-2.5" aria-label="ウォームアップの のこり" />
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <Progress value={(doneCount / Math.max(1, firstCount)) * 100} className="h-2.5 flex-1" aria-label="すすみぐあい" />
          <span className="text-sm font-black tabular-nums">
            {item.requeue ? "もういちど" : `${Math.min(pos + 1, firstCount)} / ${firstCount}`}
          </span>
        </div>
      )}

      <form onSubmit={onSubmitForm} className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div
          className={cn(
            "relative rounded-3xl border-2 bg-card px-4 pb-6 pt-8 text-center shadow-sm transition-colors sm:px-8",
            phase === "right" ? "border-green-600" : phase === "wrong" ? "border-red-600" : "border-border",
          )}
        >
          <motion.div
            key={`${pos}-${phase}`}
            aria-hidden="true"
            className="absolute -top-9 right-4 w-16 sm:w-20"
            animate={reduce ? undefined : phase === "right" ? { y: [0, -14, 0] } : phase === "wrong" ? { x: [0, -5, 5, 0] } : undefined}
            transition={{ duration: 0.45 }}
          >
            <Hamster mood={mood} wear={wear} className="w-full" />
          </motion.div>
          {paused ? (
            <div className="grid min-h-48 place-items-center gap-3">
              <p className="text-2xl font-black">いちじ ていし ちゅう</p>
              <Button size="lg" className="h-12 text-base" onClick={togglePause}>
                <Play aria-hidden="true" />
                つづける
              </Button>
            </div>
          ) : (
            <>
              {item.requeue && <p className="text-sm font-black text-orange-800 dark:text-orange-300">さっきの もんだいを もういちど</p>}
              <motion.div key={`problem-${pos}`} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                <ProblemText inst={item.inst} hint={mode === "H"} className={display(item.inst.problem).length > 12 ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl"} />
              </motion.div>
              {solver}
              <div aria-live="polite" className="mt-4 min-h-10">
                {phase === "right" && (
                  <p className="inline-flex items-center gap-2 text-2xl font-black text-green-700 dark:text-green-400">
                    <Check className="size-7" aria-hidden="true" />
                    せいかい！
                  </p>
                )}
                {phase === "wrong" && (
                  <p className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-xl font-black text-red-800 dark:bg-red-950 dark:text-red-200">
                    <X className="size-6" aria-hidden="true" />
                    こたえは {reveal}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <div ref={setKeypadEl} className={cn("self-start", paused && "invisible")} />
      </form>
    </section>
  );
}
