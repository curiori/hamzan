import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Crown, House, RotateCcw, Sparkles, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hamster, ItemThumb, Paw } from "@/components/hamster-art";
import { MODE_LABEL, KID_LEVEL_NAME, KID_STAGE_NAME } from "@/i18n/ja";
import { REWARDS } from "@/lib/rewards";
import type { SetSummary } from "@/lib/store";
import { cn } from "@/lib/utils";

function Confetti() {
  const [pieces] = useState(() => Array.from({ length: 24 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 0.6, r: Math.random() * 360, k: i % 3 })));
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute top-0"
          style={{ left: `${p.x}%` }}
          initial={{ y: -40, rotate: p.r, opacity: 1 }}
          animate={{ y: 700, rotate: p.r + 480, opacity: [1, 1, 0] }}
          transition={{ duration: 2.4 + p.d, delay: p.d, ease: "easeIn" }}
        >
          {p.k === 0 ? <Star className="size-5 fill-amber-400 text-amber-600" /> : p.k === 1 ? <span className="block size-2.5 rounded-sm bg-sky-500" /> : <span className="block size-2.5 rounded-full bg-orange-500" />}
        </motion.div>
      ))}
    </div>
  );
}

function headline(s: SetSummary): { title: string; good: boolean } {
  if (s.result === "interrupted") return { title: "とちゅうで おやすみ", good: false };
  switch (s.kind) {
    case "warmup":
      return { title: "ウォームアップ おわり！", good: true };
    case "challenge":
      return { title: s.challengeBest?.isNew ? "じこベスト こうしん！" : "チャレンジ おわり！", good: true };
    case "review":
      return { title: s.reviews.every((r) => r.passed) ? "ふくしゅう ごうかく！" : "ふくしゅう おわり", good: s.reviews.every((r) => r.passed) };
    case "stage_check":
      return { title: s.stageCheck?.passed ? "ステージチェック ごうかく！" : "ステージチェック おわり", good: !!s.stageCheck?.passed };
    case "placement":
      return { title: s.placement?.phase === "done" ? "しんだん おわり！" : "しんだん すすんだよ", good: true };
    default:
      if (s.events.includes("mastered")) return { title: "マスター！", good: true };
      if (s.result === "retry") return { title: "もう すこし！", good: false };
      if (s.mode !== "S") return { title: "まちがい なし！", good: true };
      return { title: s.result === "star3" ? "すごい！ ★3" : s.result === "star2" ? "ごうかく！ ★2" : "まちがい なし！ ★1", good: true };
  }
}

export function ResultScreen({
  summary: s,
  title,
  wear,
  nextLabel,
  onNext,
  onRetry,
  onHome,
}: {
  summary: SetSummary;
  title: string;
  wear: string | null;
  nextLabel: string | null;
  onNext: () => void;
  onRetry: (() => void) | null;
  onHome: () => void;
}) {
  const reduce = useReducedMotion();
  const h = headline(s);
  const timed = (s.kind === "main" || s.kind === "extra") && s.mode === "S" && s.result !== "interrupted";
  const celebrate = h.good && (s.stars >= 2 || s.events.includes("mastered") || s.goalReached || !!s.stageCheck?.passed || s.newRewards.length > 0);
  const notes: { icon: typeof Star; text: string }[] = [];
  if (s.events.includes("star2")) notes.push({ icon: Sparkles, text: "つぎの レベルが ひらいたよ" });
  if (s.events.includes("mastered")) notes.push({ icon: Crown, text: "この レベルを マスター！ ときどき ふくしゅうが でるよ" });
  if (s.nextMode && s.events.includes("modeUp")) notes.push({ icon: ArrowRight, text: `つぎは「${MODE_LABEL[s.nextMode]}」で やってみよう` });
  if (s.nextMode && s.events.includes("modeDown")) notes.push({ icon: RotateCcw, text: `「${MODE_LABEL[s.nextMode]}」で もういちど かたを たしかめよう` });
  if (s.result === "retry" && s.mode === "S" && !s.nextMode) notes.push({ icon: RotateCcw, text: "まちがえた もんだいを ふくしゅうして もういちど" });
  if (s.goalReached) notes.push({ icon: Trophy, text: "きょうの ゴール たっせい！" });
  if (s.stageCheck && !s.stageCheck.passed) notes.push({ icon: RotateCcw, text: "まちがえた ところを つぎの れんしゅうで やるよ" });

  return (
    <section aria-labelledby="result-title" className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="relative overflow-hidden rounded-3xl border bg-card px-5 py-8 text-center shadow-sm sm:px-8">
        {celebrate && !reduce && <Confetti />}
        <motion.div
          aria-hidden="true"
          className="relative mx-auto w-28"
          initial={reduce ? false : { scale: 0.7, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, y: h.good ? [0, -18, 0, -8, 0] : 0 }}
          transition={{ duration: 1.1 }}
        >
          <Hamster mood={h.good ? "cheer" : "oops"} wear={wear} className="w-full" />
        </motion.div>
        <p className="mt-2 text-sm font-bold">{title}</p>
        <h1 id="result-title" className="text-3xl font-black sm:text-4xl">
          {h.title}
        </h1>

        {timed && (
          <div className="mt-4 flex justify-center gap-2" role="img" aria-label={`★${s.stars}つ`}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.2, type: "spring", stiffness: 260, damping: 12 }}
              >
                <Star
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className={cn("size-12", i < s.stars ? "fill-amber-400 text-amber-700 dark:text-amber-300" : "fill-transparent text-foreground/30")}
                />
              </motion.span>
            ))}
          </div>
        )}

        {s.kind !== "warmup" && s.result !== "interrupted" && (
          <dl className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-muted px-2 py-3">
              <dt className="text-xs font-bold">まちがい</dt>
              <dd className="text-2xl font-black tabular-nums">
                {s.errors} / {s.n}
              </dd>
            </div>
            <div className="rounded-2xl bg-muted px-2 py-3">
              <dt className="text-xs font-bold">1もん あたり</dt>
              <dd className="text-2xl font-black tabular-nums">{s.perProblemSec.toFixed(1)}びょう</dd>
            </div>
          </dl>
        )}
        {timed && (
          <p className="mt-2 text-sm font-bold tabular-nums">
            {s.events.includes("personalBest") ? "じこベスト こうしん！" : s.prevBest !== null ? `じこベスト ${s.prevBest.toFixed(1)}びょう` : ""}
          </p>
        )}
        {s.kind === "challenge" && s.challengeBest?.sec !== null && s.challengeBest && (
          <p className="mt-2 text-sm font-bold tabular-nums">じこベスト {s.challengeBest.sec?.toFixed(1)}びょう</p>
        )}
        {s.result === "interrupted" && <p className="mt-3 text-sm font-bold">ながく はなれていたので、こんかいは はんていなしで きろくしたよ</p>}

        {s.reviews.length > 0 && (
          <ul className="mx-auto mt-4 grid max-w-sm gap-1.5 text-left">
            {s.reviews.map((r) => (
              <li key={r.levelId} className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold">
                <span>{KID_LEVEL_NAME[r.levelId]}</span>
                <span className={r.passed ? "text-green-800 dark:text-green-300" : "text-orange-800 dark:text-orange-300"}>
                  {r.passed ? "ごうかく" : r.demoted ? "もういちど ★3を めざそう" : "また こんど"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {s.stageCheck && <p className="mt-3 text-sm font-bold">ステージ{s.stageCheck.stage}「{KID_STAGE_NAME[s.stageCheck.stage]}」</p>}

        {notes.length > 0 && (
          <ul className="mx-auto mt-5 grid max-w-md gap-2 text-left">
            {notes.map((n) => (
              <li key={n.text} className="flex items-center gap-2 rounded-2xl border px-3 py-2 font-bold">
                <n.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                {n.text}
              </li>
            ))}
          </ul>
        )}

        {s.newRewards.length > 0 && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-left dark:bg-amber-950/50">
            <p className="flex items-center gap-2 font-black">
              <Paw className="size-5 text-amber-700 dark:text-amber-400" />
              ごほうびが とどいたよ
            </p>
            <ul className="mt-2 flex flex-wrap gap-3">
              {s.newRewards.map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-bold">
                  <ItemThumb id={id} className="size-9" />
                  {REWARDS.find((r) => r.id === id)?.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {nextLabel && (
            <Button size="lg" className="h-12 text-base" onClick={onNext}>
              {nextLabel}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
          {onRetry && (
            <Button size="lg" variant={nextLabel ? "outline" : "default"} className="h-12 text-base" onClick={onRetry}>
              <RotateCcw aria-hidden="true" />
              もういちど
            </Button>
          )}
          <Button size="lg" variant="outline" className="h-12 text-base" onClick={onHome}>
            <House aria-hidden="true" />
            ホームへ
          </Button>
        </div>
      </div>
    </section>
  );
}
