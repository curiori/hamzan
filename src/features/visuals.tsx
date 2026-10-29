// Picture hints for VISUAL_* scaffold kinds (hint mode only; the child types the answer only).
import { LEVEL } from "@/domain/spec";
import type { ProblemInstance } from "@/domain/problem";
import { cn } from "@/lib/utils";

type Dot = "a" | "b" | "empty" | "cross";

function Frame({ cells, label }: { cells: Dot[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="inline-grid grid-cols-5 gap-1.5 rounded-xl border-2 border-foreground/30 bg-card p-2">
      {cells.map((c, i) => (
        <span key={i} className="grid size-8 place-items-center rounded-md border border-foreground/15 sm:size-9">
          {c !== "empty" && (
            <span
              className={cn(
                "relative block size-6 rounded-full sm:size-7",
                c === "a" && "bg-amber-500",
                c === "b" && "bg-sky-600",
                c === "cross" && "bg-amber-500/40",
              )}
            >
              {c === "cross" && <span className="absolute inset-0 grid place-items-center text-lg font-black text-red-700">×</span>}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

const fill = (n: number, kind: Dot, total = 10): Dot[] => Array.from({ length: total }, (_, i) => (i < n ? kind : "empty"));

function Dots({ n, color = "bg-sky-600" }: { n: number; color?: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cn("size-6 rounded-full sm:size-7", color)} />
      ))}
    </span>
  );
}

function NumberLine({ from, to, start, end }: { from: number; to: number; start: number; end: number }) {
  const ticks = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <div role="img" aria-label={`かずの せん。${start}から ${end - start}こ すすむ`} className="flex w-full max-w-md">
      {ticks.map((t) => (
        <div key={t} className="flex flex-1 flex-col items-center">
          <span className={cn("h-6 text-xl leading-none", t > start && t <= end ? "text-sky-700 dark:text-sky-300" : "text-transparent")}>↷</span>
          <div className="relative h-4 w-full">
            <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-foreground/50" />
            <span className={cn("absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2", t === start ? "bg-amber-600" : "bg-foreground/60")} />
          </div>
          <span className={cn("mt-1 text-sm tabular-nums", t === start && "font-black text-amber-700 dark:text-amber-400")}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function PlaceValue({ n, shift }: { n: number; shift: number }) {
  const cols = ["せん", "ひゃく", "じゅう", "いち"];
  const digits = String(n).padStart(4, " ").split("");
  return (
    <div role="img" aria-label={`くらいの ひょう。${n}を ${shift > 0 ? "ひだり" : "みぎ"}へ ${Math.abs(shift)}けた うごかす`} className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border-2 border-foreground/30 text-center">
        {cols.map((c) => (
          <span key={c} className="border-b border-r border-foreground/20 bg-muted px-3 py-1 text-xs font-bold last:border-r-0">
            {c}
          </span>
        ))}
        {digits.map((d, i) => (
          <span key={i} className="border-r border-foreground/20 px-3 py-2 text-2xl font-black tabular-nums last:border-r-0">
            {d.trim()}
          </span>
        ))}
      </div>
      <p className="text-sm font-bold">{shift > 0 ? `← ひだりへ ${shift}けた（0を ${shift}こ つける）` : `みぎへ ${-shift}けた（0を ${-shift}こ とる） →`}</p>
    </div>
  );
}

function SkipCount({ t }: { t: number }) {
  if (t === 10)
    return <p className="rounded-xl bg-muted px-4 py-3 text-lg font-bold">×10は うしろに 0を つける</p>;
  const row = Array.from({ length: 9 }, (_, i) => t * (i + 1));
  return (
    <div role="img" aria-label={`${t}の だん: ${row.join("、")}`} className="flex flex-wrap justify-center gap-1.5">
      {row.map((v, i) => (
        <span key={v} className="grid min-w-11 place-items-center rounded-lg border bg-card px-2 py-1">
          <span className="text-[10px] font-bold">{`${t}×${i + 1}`}</span>
          <span className="text-lg font-black tabular-nums">{v}</span>
        </span>
      ))}
    </div>
  );
}

export function Visual({ inst }: { inst: ProblemInstance }) {
  const p = inst.problem;
  const kind = LEVEL[inst.levelId].scaffoldKind;
  if (kind === "VISUAL_TEN_FRAME") {
    if (p.shape === "complementTo") return <Frame cells={fill(p.a, "a")} label={`10マスの うち ${p.a}こ ぬってある`} />;
    if (p.shape === "decompose")
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Frame cells={fill(10, "a")} label="10の かたまり" />
          <Dots n={p.n - 10} />
        </div>
      );
    if (p.shape === "binary" && p.op === "+" && inst.levelId === "0-2")
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Frame cells={fill(10, "a")} label="10の かたまり" />
          <Dots n={p.a === 10 ? p.b : p.a} />
        </div>
      );
    if (p.shape === "binary" && p.op === "+") {
      const cells: Dot[] = Array.from({ length: 10 }, (_, i) => (i < p.a ? "a" : i < p.a + p.b ? "b" : "empty"));
      return <Frame cells={cells} label={`${p.a}こと ${p.b}こ`} />;
    }
    if (p.shape === "binary" && p.op === "-") {
      const cells: Dot[] = Array.from({ length: 10 }, (_, i) => (i < p.a - p.b ? "a" : i < p.a ? "cross" : "empty"));
      return <Frame cells={cells} label={`${p.a}こから ${p.b}こ とる`} />;
    }
  }
  if (kind === "VISUAL_PAIRS") {
    if (p.shape === "binary")
      return (
        <div role="img" aria-label={`${p.a}こが 2れつ`} className="grid gap-2">
          <Dots n={p.a} color="bg-amber-500" />
          <Dots n={p.b} color="bg-amber-500" />
        </div>
      );
    if (p.shape === "half")
      return (
        <div role="img" aria-label={`${p.n}こを 2れつに わける`} className="grid gap-2">
          <Dots n={p.n / 2} color="bg-sky-600" />
          <div className="border-t-2 border-dashed border-foreground/40" />
          <Dots n={p.n / 2} color="bg-sky-600" />
        </div>
      );
  }
  if (kind === "VISUAL_PLACE_VALUE" && p.shape === "binary")
    return <PlaceValue n={p.a} shift={p.op === "×" ? String(p.b).length - 1 : -(String(p.b).length - 1)} />;
  if (kind === "VISUAL_TENS_BLOCKS" && p.shape === "complementTo")
    return (
      <div role="img" aria-label={`10の かたまりが 10こ。${p.a / 10}こ ぬってある`} className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={cn("h-24 w-5 rounded-md border border-foreground/20", i < p.a / 10 ? "bg-amber-500" : "bg-card")} />
        ))}
      </div>
    );
  if (kind === "VISUAL_NUMBER_LINE") {
    if (p.shape === "binary") {
      const big = Math.max(p.a, p.b);
      const small = Math.min(p.a, p.b);
      return <NumberLine from={Math.max(0, big - 1)} to={big + 3} start={big} end={big + small} />;
    }
    if (p.shape === "missingAddend") return <NumberLine from={p.b} to={p.total} start={p.b} end={p.total} />;
  }
  if (kind === "VISUAL_SKIP_COUNT") {
    if (p.shape === "missingFactor") return <SkipCount t={p.known} />;
    if (p.shape === "binary" && p.op === "÷") return <SkipCount t={p.b} />;
    if (p.shape === "binary") return <SkipCount t={inst.tableFactor ?? p.b} />;
  }
  return null;
}
