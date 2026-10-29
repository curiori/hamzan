import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Crown, Lock, Play, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hamster, ItemThumb, Paw, RoomScene } from "@/components/hamster-art";
import { LEVEL, LEVELS, SPEC, STAGES, type Mode } from "@/domain/spec";
import { addDays, weekdayOf, type LocalDate } from "@/domain/dates";
import { frontier, lpOf, pendingStar3, statusOf, type LevelStatus } from "@/domain/progression";
import { challengeAvailable, planDailySession, resolveSlot, type SessionPart } from "@/domain/session";
import { KID_LEVEL_NAME, KID_STAGE_NAME, MODE_LABEL } from "@/i18n/ja";
import { REWARDS, unlockedRewards } from "@/lib/rewards";
import { rewardStats, useAppStore, type Profile } from "@/lib/store";
import { cn } from "@/lib/utils";

function partLabel(part: SessionPart, p: Profile, unlockAll: boolean): string {
  if (part.kind === "warmup") return "ウォームアップ";
  if (part.kind === "stageCheck") return `ステージチェック（ステージ${part.stage}）`;
  if (part.kind === "review") return `ふくしゅう（${part.levelIds.map((id) => KID_LEVEL_NAME[id]).join("・")}）`;
  const r = resolveSlot(part.slot, p.progress, unlockAll);
  return r ? `${KID_LEVEL_NAME[r.levelId]}（${MODE_LABEL[r.mode]}）` : "メイン";
}

const STATUS_STYLE: Record<LevelStatus, string> = {
  locked: "border-dashed border-foreground/25 bg-muted text-muted-foreground",
  available: "border-primary bg-card text-foreground",
  practicing: "border-primary bg-card text-foreground",
  star2: "border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-50",
  mastered: "border-amber-800 bg-amber-700 text-white dark:border-amber-300",
};

const STATUS_LABEL: Record<LevelStatus, string> = {
  locked: "まだ ひらいていない",
  available: "はじめられる",
  practicing: "れんしゅう ちゅう",
  star2: "★2 ごうかく",
  mastered: "マスター",
};

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} role="img" aria-label={`★${n}`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} aria-hidden="true" strokeWidth={2.2} className={cn("size-3.5", i < n ? "fill-amber-400 text-amber-700 dark:text-amber-300" : "fill-transparent text-foreground/30")} />
      ))}
    </span>
  );
}

export function HomeView({
  date,
  onStartSession,
  onPractice,
  onChallenge,
}: {
  date: LocalDate;
  onStartSession: () => void;
  onPractice: (levelId: string, mode: Mode) => void;
  onChallenge: () => void;
}) {
  const profile = useAppStore((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);
  const unlockAll = useAppStore((s) => s.dev.unlockAll);
  const reduce = useReducedMotion();
  const [openLevel, setOpenLevel] = useState<string | null>(null);
  // wide screens: bring the current level into view (the plan card stays pinned on the left)
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const el = document.querySelector<HTMLElement>('[data-frontier="true"]');
    if (el && el.getBoundingClientRect().bottom > window.innerHeight - 40) el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);
  if (!profile) return null;
  const day = profile.sessions[date];
  const plan = day?.plan ?? planDailySession({ progress: profile.progress, reviews: profile.reviews, stageChecks: profile.stageChecks, date, unlockAll });
  const done = day?.done ?? 0;
  const goal = day?.goal ?? false;
  const fr = frontier(profile.progress, unlockAll);
  const pend = pendingStar3(profile.progress);
  const chall = challengeAvailable(profile.progress, profile.challenge.lastDate, date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const sel = openLevel ? LEVEL[openLevel] : null;
  const selP = sel ? lpOf(profile.progress, sel.id) : null;
  const selStatus = sel ? statusOf(profile.progress, sel.id, unlockAll) : null;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="grid gap-4 self-start lg:sticky lg:top-20">
        <section aria-labelledby="today-title" className="rounded-3xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <motion.div className="w-20 shrink-0" animate={reduce ? undefined : { y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
              <Hamster wear={profile.wearing} mood={goal ? "happy" : "idle"} className="w-full" />
            </motion.div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{profile.nickname}さん</p>
              <h1 id="today-title" className="text-xl font-black">
                きょうの れんしゅう
              </h1>
            </div>
          </div>
          <ol className="mt-4 grid gap-1.5">
            {plan.map((part, i) => (
              <li key={i} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold", i < done ? "bg-green-50 dark:bg-green-950/50" : i === done ? "bg-amber-50 dark:bg-amber-950/40" : "bg-muted")}>
                {i < done ? <Check className="size-4 shrink-0 text-green-700 dark:text-green-400" aria-label="おわり" /> : <span className="grid size-4 shrink-0 place-items-center text-xs">{i + 1}</span>}
                <span className="min-w-0 flex-1 truncate">{partLabel(part, profile, unlockAll)}</span>
              </li>
            ))}
          </ol>
          {goal ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-green-100 px-3 py-2 font-black text-green-900 dark:bg-green-900/60 dark:text-green-50">
              <Trophy className="size-5" aria-hidden="true" />
              きょうの ゴール たっせい！
            </p>
          ) : (
            <Button size="lg" className="mt-3 h-14 w-full text-lg" onClick={onStartSession}>
              <Play aria-hidden="true" />
              {done > 0 ? "つづきから" : "はじめる"}
            </Button>
          )}
          <h2 className="mt-5 text-sm font-black">ゴールの しるし</h2>
          <ol className="mt-2 grid grid-cols-7 gap-1">
            {week.map((d) => {
              const g = profile.sessions[d]?.goal;
              return (
                <li key={d} className="flex flex-col items-center gap-0.5">
                  {g ? <Paw className="size-6 text-amber-700 dark:text-amber-400" /> : <span aria-hidden="true" className="grid size-6 place-items-center"><span className="size-3 rounded-full border-2 border-foreground/25" /></span>}
                  <span className={cn("text-xs", d === date ? "font-black underline" : "font-medium")}>{d === date ? "きょう" : "日月火水木金土"[weekdayOf(d)]}</span>
                  <span className="sr-only">{g ? "ゴール たっせい" : "なし"}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {chall && (
          <section aria-labelledby="chal-title" className="rounded-3xl border-2 border-amber-600 bg-card p-5">
            <h2 id="chal-title" className="flex items-center gap-2 text-lg font-black">
              <Trophy className="size-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              チャレンジ
            </h2>
            <p className="mt-1 text-sm font-bold">マスターした レベルから {SPEC.rules.dailySession.weeklyChallenge.problems}もん</p>
            {profile.challenge.bestSec !== null && <p className="mt-1 text-sm font-bold tabular-nums">じこベスト 1もん {profile.challenge.bestSec.toFixed(1)}びょう</p>}
            <Button variant="outline" className="mt-3 h-12 w-full text-base" onClick={onChallenge}>
              チャレンジする
            </Button>
          </section>
        )}
      </aside>

      <section aria-labelledby="map-title" className="min-w-0">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 id="map-title" className="text-2xl font-black">
            ステージの ちず
          </h2>
          <p className="text-sm font-bold tabular-nums">
            マスター {LEVELS.filter((l) => statusOf(profile.progress, l.id) === "mastered").length} / {LEVELS.length}
          </p>
        </div>
        <div className="grid gap-4">
          {STAGES.map((st) => {
            const levels = LEVELS.filter((l) => l.stage === st.id);
            const passed = levels.filter((l) => ["star2", "mastered"].includes(statusOf(profile.progress, l.id))).length;
            return (
              <section key={st.id} aria-labelledby={`stage-${st.id}`} className="rounded-3xl border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id={`stage-${st.id}`} className="text-lg font-black">
                    ステージ{st.id} {KID_STAGE_NAME[st.id]}
                  </h3>
                  <span className="flex items-center gap-2 text-xs font-bold tabular-nums">
                    {profile.stageChecks[st.id]?.passed && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900 dark:bg-green-900/60 dark:text-green-50">
                        {profile.stageChecks[st.id].byPlacement ? "しんだんで クリア" : "チェック ごうかく"}
                      </span>
                    )}
                    ★2いじょう {passed}/{levels.length}
                  </span>
                </div>
                <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {levels.map((l) => {
                    const status = statusOf(profile.progress, l.id, unlockAll);
                    const lp = lpOf(profile.progress, l.id);
                    const isFront = fr?.id === l.id;
                    const isPend = pend?.id === l.id;
                    return (
                      <li key={l.id} className="relative" data-frontier={isFront || undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenLevel(l.id)}
                          aria-label={`${l.id} ${KID_LEVEL_NAME[l.id]}、${STATUS_LABEL[status]}`}
                          className={cn(
                            "flex min-h-[4.5rem] w-full items-start gap-2 rounded-2xl border-2 p-2.5 text-left transition hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            STATUS_STYLE[status],
                            isFront && "ring-4 ring-primary/40",
                            isPend && "ring-4 ring-sky-500/40",
                          )}
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background/70 text-xs font-black text-foreground">
                            {status === "locked" ? <Lock className="size-4" aria-hidden="true" /> : status === "mastered" ? <Crown className="size-4 text-amber-700" aria-hidden="true" /> : l.id}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black leading-tight">{KID_LEVEL_NAME[l.id]}</span>
                            <span className="mt-1 flex items-center gap-1.5">
                              {status !== "locked" && <Stars n={status === "mastered" ? 3 : lp.bestStars} />}
                              {(status === "available" || status === "practicing") && <span className="rounded bg-background/70 px-1 text-[11px] font-bold">{MODE_LABEL[lp.mode]}</span>}
                            </span>
                          </span>
                        </button>
                        {isFront && (
                          <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-4 w-10">
                            <Hamster wear={profile.wearing} className="w-full" />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </section>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setOpenLevel(null)}>
        <DialogContent className="max-w-md">
          {sel && selP && selStatus && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black">{KID_LEVEL_NAME[sel.id]}</DialogTitle>
                <DialogDescription className="font-bold text-foreground">
                  レベル {sel.id}・{STATUS_LABEL[selStatus]}
                </DialogDescription>
              </DialogHeader>
              <p className="rounded-xl bg-muted px-3 py-2 text-lg font-black tabular-nums">れい：{sel.example}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm font-bold">
                <div className="rounded-xl border p-2">
                  <dt className="text-xs">いまの モード</dt>
                  <dd className="text-base">{MODE_LABEL[selP.mode]}</dd>
                </div>
                <div className="rounded-xl border p-2">
                  <dt className="text-xs">じこベスト（1もん）</dt>
                  <dd className="text-base tabular-nums">{selP.personalBestSec !== null ? `${selP.personalBestSec.toFixed(1)}びょう` : "まだ"}</dd>
                </div>
                <div className="col-span-2 rounded-xl border p-2">
                  <dt className="text-xs">マスターまで（★3を ちがう日に {SPEC.rules.stars.mastery.star3OnDistinctLocalDates}かい）</dt>
                  <dd className="text-base tabular-nums">{selP.masteredAt ? "マスター！" : `★3 ${selP.star3Dates.length} / ${SPEC.rules.stars.mastery.star3OnDistinctLocalDates}`}</dd>
                </div>
              </dl>
              {selStatus === "locked" ? (
                <p className="rounded-xl border-2 border-dashed px-3 py-2 text-sm font-bold">
                  <Lock className="mr-1 inline size-4" aria-hidden="true" />
                  {sel.prerequisites.filter((id) => !["star2", "mastered"].includes(statusOf(profile.progress, id))).map((id) => KID_LEVEL_NAME[id]).join("・")}で ★2を とると ひらくよ
                </p>
              ) : (
                <Button
                  size="lg"
                  className="h-12 text-base"
                  onClick={() => {
                    setOpenLevel(null);
                    onPractice(sel.id, selStatus === "star2" || selStatus === "mastered" ? "S" : selP.mode);
                  }}
                >
                  <Play aria-hidden="true" />
                  れんしゅうする
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RoomView() {
  const profile = useAppStore((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);
  const updateProfile = useAppStore((s) => s.updateProfile);
  if (!profile) return null;
  const owned = unlockedRewards(rewardStats(profile));
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-labelledby="room-title" className="min-w-0">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h1 id="room-title" className="text-2xl font-black">
            ハムスターの おへや
          </h1>
          <p className="text-sm font-bold tabular-nums">
            ごほうび {owned.length} / {REWARDS.length}
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border bg-card">
          <RoomScene owned={owned} wear={profile.wearing} name={profile.nickname} className="block h-auto w-full" />
        </div>
      </section>
      <section aria-labelledby="goods-title">
        <h2 id="goods-title" className="mb-3 text-xl font-black">
          ごほうび
        </h2>
        <ul className="grid gap-2">
          {REWARDS.map((r) => {
            const has = owned.includes(r.id);
            const on = profile.wearing === r.id;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <span className={cn("grid size-14 shrink-0 place-items-center rounded-xl bg-muted", !has && "opacity-40 grayscale")}>
                  <ItemThumb id={r.id} className="size-11" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black">{r.name}</span>
                  <span className="block text-sm font-medium">{has ? "もっている" : r.need}</span>
                </span>
                {has && r.wear && (
                  <Button variant={on ? "default" : "outline"} className="h-12 px-4" aria-pressed={on} onClick={() => updateProfile(profile.id, { wearing: on ? null : r.id })}>
                    {on && <Check aria-hidden="true" />}
                    つける
                  </Button>
                )}
                {has && !r.wear && <Check className="size-5 text-green-700 dark:text-green-400" aria-label="もっている" />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
