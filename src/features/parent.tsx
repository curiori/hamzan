import { useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ArrowLeft, CalendarPlus, Lock, Plus, RotateCcw, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useConfirm } from "@/hooks/use-confirm";
import { ERROR_TYPES, LEVEL, LEVELS, SPEC, STAGES, type Coeffs } from "@/domain/spec";
import { addDays, diffDays, weekdayOf } from "@/domain/dates";
import { display, kanjiNumber } from "@/domain/problem";
import { lpOf, statusOf } from "@/domain/progression";
import { targetSec } from "@/domain/timing";
import { GRADE_LABEL, MODE_LABEL } from "@/i18n/ja";
import { timeOpts, todayOf, useAppStore, type Profile, type Settings } from "@/lib/store";
import { InputTest, PinPad } from "@/features/onboarding";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- gate
export function ParentGate({ onUnlock, onBack }: { onUnlock: () => void; onBack: () => void }) {
  const checkPin = useAppStore((s) => s.checkPin);
  const setPin = useAppStore((s) => s.setPin);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState<"no" | "challenge" | "new" | "new2">("no");
  const [challenge] = useState(() => 1000 + Math.floor(Math.random() * 9000));
  const [answer, setAnswer] = useState("");
  const [newPin, setNewPin] = useState("");
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);

  const startHold = () => {
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      setForgot("challenge");
    }, 3000);
  };
  const stopHold = () => {
    setHolding(false);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  };

  return (
    <section aria-labelledby="gate-title" className="mx-auto w-full max-w-md px-4 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft aria-hidden="true" />
        もどる
      </Button>
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <h1 id="gate-title" className="mb-4 flex items-center justify-center gap-2 text-lg font-black">
          <Lock className="size-5" aria-hidden="true" />
          保護者の方へ
        </h1>
        {forgot === "no" && (
          <>
            <PinPad
              title="PINを入力"
              error={error}
              onComplete={(p) => {
                if (checkPin(p)) onUnlock();
                else setError("PINがちがいます");
              }}
            />
            <div className="mt-6 text-center">
              <button
                type="button"
                className={cn("rounded-xl border px-4 py-2 text-sm font-bold transition-colors", holding && "bg-primary text-primary-foreground")}
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onContextMenu={(e) => e.preventDefault()}
              >
                PINを忘れたとき（3秒長押し）
              </button>
            </div>
          </>
        )}
        {forgot === "challenge" && (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(answer) === challenge) setForgot("new");
              else setError("数字がちがいます");
            }}
          >
            <p className="text-sm">次の数を数字（4桁）で入力すると、PINを設定し直せます。</p>
            <p className="text-center text-3xl font-black">{kanjiNumber(challenge)}</p>
            <Label htmlFor="kanji-ans">数字で入力</Label>
            <Input id="kanji-ans" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-11 text-lg" />
            {error && <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
            <Button type="submit">確認</Button>
          </form>
        )}
        {forgot === "new" && (
          <PinPad
            title="新しいPIN（4桁）"
            onComplete={(p) => {
              setNewPin(p);
              setForgot("new2");
            }}
          />
        )}
        {forgot === "new2" && (
          <PinPad
            title="もう一度入力"
            onComplete={(p) => {
              if (p === newPin) {
                setPin(p);
                onUnlock();
              } else setForgot("new");
            }}
          />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- dashboard
const STATUS_JA = { locked: "ロック", available: "未着手", practicing: "練習中", star2: "★2", mastered: "マスター" } as const;

function Dashboard({ p }: { p: Profile }) {
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const date = todayOf(dayOffset);
  const opts = timeOpts(p);
  const sLevels = useMemo(() => LEVELS.filter((l) => p.sets.some((s) => s.levelId === l.id && s.mode === "S" && s.kind !== "placement")), [p.sets]);
  const [trendLevel, setTrendLevel] = useState<string>("");
  const lvId = trendLevel || sLevels[sLevels.length - 1]?.id || "";
  const trend = p.sets
    .filter((s) => s.levelId === lvId && s.mode === "S" && s.result !== "interrupted" && s.kind !== "placement")
    .slice(-20)
    .map((s, i) => ({ i: i + 1, date: s.date.slice(5), sec: s.perProblemSec, errors: s.errors }));
  const t2 = lvId ? targetSec(LEVEL[lvId], 2, opts) : 0;
  const t3 = lvId ? targetSec(LEVEL[lvId], 3, opts) : 0;
  const weak = Object.entries(p.facts)
    .filter(([, f]) => f.errors > 0)
    .sort((a, b) => b[1].errors - a[1].errors || (b[1].lastLatencyMs ?? 0) - (a[1].lastLatencyMs ?? 0))
    .slice(0, 10);
  const recentErrors = p.errors.filter((e) => diffDays(date, e.date) < 30);
  const days = Array.from({ length: 35 }, (_, i) => addDays(date, i - 34));
  const practiced = new Set(p.sets.map((s) => s.date));
  const chartConfig: ChartConfig = { sec: { label: "1問あたりの秒", color: "var(--chart-1)" } };
  const retest = p.writeTestedAt && diffDays(date, p.writeTestedAt) >= SPEC.timeModel.inputSpeedTest.retestAfterDays;

  return (
    <div className="grid grid-cols-1 gap-6">
      {retest && <p className="rounded-xl border-2 border-amber-600 px-3 py-2 text-sm font-bold">入力テストから{SPEC.timeModel.inputSpeedTest.retestAfterDays}日以上たちました。「設定」から測り直せます。</p>}

      <section aria-labelledby="d-cal">
        <h3 id="d-cal" className="mb-2 font-black">
          練習した日（直近5週間）
        </h3>
        <div className="grid max-w-md grid-cols-7 gap-1 text-center text-xs">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <span key={d} className="font-bold">
              {d}
            </span>
          ))}
          {Array.from({ length: weekdayOf(days[0]) }, (_, i) => (
            <span key={`pad${i}`} />
          ))}
          {days.map((d) => {
            const goal = p.sessions[d]?.goal;
            const did = practiced.has(d);
            return (
              <span
                key={d}
                className={cn(
                  "grid h-9 place-items-center rounded-md border text-xs font-bold tabular-nums",
                  goal ? "border-green-700 bg-green-700 text-white" : did ? "border-green-600 bg-green-100 text-green-950 dark:bg-green-950 dark:text-green-50" : "bg-card",
                  d === date && "ring-2 ring-primary",
                )}
                title={d}
              >
                {Number(d.slice(8))}
                <span className="sr-only">{goal ? "ゴール達成" : did ? "練習あり" : "練習なし"}</span>
              </span>
            );
          })}
        </div>
        <p className="mt-1 text-xs">濃い緑＝きょうのゴール達成、うすい緑＝練習あり</p>
      </section>

      <section aria-labelledby="d-prog">
        <h3 id="d-prog" className="mb-2 font-black">
          ステージ・レベルの進み具合
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {STAGES.map((st) => (
            <details key={st.id} className="min-w-0 rounded-xl border bg-card p-3" open={st.id === LEVEL[LEVELS.find((l) => !["star2", "mastered"].includes(statusOf(p.progress, l.id)))?.id ?? "5-11"].stage}>
              <summary className="cursor-pointer font-bold">
                ステージ{st.id} {st.name}（★2以上 {st.levelIds.filter((id) => ["star2", "mastered"].includes(statusOf(p.progress, id))).length}/{st.levelIds.length}）
                {p.stageChecks[st.id] && <span className="ml-2 text-xs">ステージチェック：{p.stageChecks[st.id].byPlacement ? "診断で通過" : p.stageChecks[st.id].passed ? "合格" : "不合格"}</span>}
              </summary>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>レベル</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>モード</TableHead>
                    <TableHead className="text-right">自己ベスト</TableHead>
                    <TableHead className="text-right">目安 ★2/★3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {st.levelIds.map((id) => {
                    const lp = lpOf(p.progress, id);
                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium">
                          {id} {LEVEL[id].name}
                        </TableCell>
                        <TableCell>{STATUS_JA[statusOf(p.progress, id)]}</TableCell>
                        <TableCell>{MODE_LABEL[lp.mode]}</TableCell>
                        <TableCell className="text-right tabular-nums">{lp.personalBestSec !== null ? `${lp.personalBestSec.toFixed(1)}秒` : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {targetSec(LEVEL[id], 2, opts).toFixed(1)} / {targetSec(LEVEL[id], 3, opts).toFixed(1)}秒
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="d-weak">
        <h3 id="d-weak" className="mb-2 font-black">
          苦手な事実 トップ10
        </h3>
        {weak.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>問題</TableHead>
                <TableHead>レベル</TableHead>
                <TableHead className="text-right">ミス / 回数</TableHead>
                <TableHead className="text-right">最後の時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weak.map(([k, f]) => (
                <TableRow key={k}>
                  <TableCell className="font-bold tabular-nums">{display(f.problem)}</TableCell>
                  <TableCell>{f.levelId}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.errors} / {f.attempts}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{f.lastLatencyMs !== null ? `${(f.lastLatencyMs / 1000).toFixed(1)}秒` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm">まだミスの記録はありません。</p>
        )}
      </section>

      <section aria-labelledby="d-err">
        <h3 id="d-err" className="mb-2 font-black">
          ミスの種類と直し方（直近30日）
        </h3>
        <ul className="grid gap-2">
          {ERROR_TYPES.map((t) => {
            const n = recentErrors.filter((e) => e.type === t.id).length;
            return (
              <li key={t.id} className={cn("rounded-xl border p-3", n === 0 && "opacity-70")}>
                <p className="flex justify-between font-bold">
                  <span>{t.name}</span>
                  <span className="tabular-nums">{n}件</span>
                </p>
                <p className="text-sm">直し方：{t.remedy}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="d-trend">
        <h3 id="d-trend" className="mb-2 font-black">
          1問あたりの秒の推移（スピードモード）
        </h3>
        {sLevels.length ? (
          <>
            <Label htmlFor="trend-level" className="mb-1 block text-sm">
              レベル
            </Label>
            <NativeSelect id="trend-level" value={lvId} onChange={(e) => setTrendLevel(e.target.value)}>
              {sLevels.map((l) => (
                <NativeSelectOption key={l.id} value={l.id}>
                  {l.id} {l.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="mt-2 text-sm">
              直近{trend.length}セット。目安 ★2 {t2.toFixed(1)}秒・★3 {t3.toFixed(1)}秒（点線）
            </p>
            <ChartContainer config={chartConfig} className="mt-2 h-56 w-full">
              <LineChart data={trend} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis width={36} tickLine={false} axisLine={false} domain={[0, "auto"]} />
                <ReferenceLine y={t2} stroke="var(--chart-3)" strokeDasharray="4 4" />
                <ReferenceLine y={t3} stroke="var(--chart-2)" strokeDasharray="2 4" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="sec" stroke="var(--color-sec)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead className="text-right">1問あたり</TableHead>
                  <TableHead className="text-right">ミス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trend.slice(-6).map((r) => (
                  <TableRow key={r.i}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.sec.toFixed(1)}秒</TableCell>
                    <TableCell className="text-right tabular-nums">{r.errors}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <p className="text-sm">スピードモードの記録がたまると表示されます。</p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- settings
function CoeffEditor({ p }: { p: Profile }) {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const cur = p.settings.coeffs ?? { star2: SPEC.timeModel.star2, star3: SPEC.timeModel.star3 };
  const set = (star: "star2" | "star3", key: keyof Coeffs, v: number) => {
    if (!(v > 0)) return;
    updateProfile(p.id, { settings: { ...p.settings, coeffs: { ...cur, [star]: { ...cur[star], [key]: v } } } });
  };
  return (
    <div className="grid gap-3">
      {(["star2", "star3"] as const).map((star) => (
        <fieldset key={star} className="grid grid-cols-3 gap-2">
          <legend className="mb-1 text-sm font-bold">{star === "star2" ? "★2" : "★3"} の係数</legend>
          {(["read", "think", "write"] as const).map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`${star}-${k}`} className="text-xs">
                {k === "read" ? "読む" : k === "think" ? "考える" : "書く"}
              </Label>
              <Input id={`${star}-${k}`} type="number" step="0.05" min="0.05" value={cur[star][k]} onChange={(e) => set(star, k, Number(e.target.value))} />
            </div>
          ))}
        </fieldset>
      ))}
      <p className="text-xs">T＝読む＋考える×K＋書く×D。入力テストの結果がある場合、「書く」はお子さまの値（{p.writeSecPerDigit ?? "—"}秒/桁）に置き換わります。</p>
      <Button variant="outline" onClick={() => updateProfile(p.id, { settings: { ...p.settings, coeffs: null } })} disabled={!p.settings.coeffs}>
        <RotateCcw aria-hidden="true" />
        既定に戻す
      </Button>
    </div>
  );
}

function SettingsPane({ p, onInputTest, onPinChange }: { p: Profile; onInputTest: () => void; onPinChange: () => void }) {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const toggles: { key: keyof Omit<Settings, "coeffs">; label: string; note: string }[] = [
    { key: "timer", label: "タイマーを表示", note: "既定はオフ（お子さまに時間を意識させすぎないため）" },
    { key: "autoSubmit", label: "自動送信", note: "答えの桁数まで入力したら自動で送信" },
    { key: "sound", label: "効果音", note: "" },
    { key: "vibration", label: "振動", note: "対応している端末のみ" },
  ];
  return (
    <div className="grid gap-6">
      <section aria-labelledby="s-basic" className="grid gap-3">
        <h3 id="s-basic" className="font-black">
          {p.nickname}さんの設定
        </h3>
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div>
              <Label htmlFor={`set-${t.key}`} className="font-bold">
                {t.label}
              </Label>
              {t.note && <p className="text-xs">{t.note}</p>}
            </div>
            <Switch id={`set-${t.key}`} checked={p.settings[t.key]} onCheckedChange={(v) => updateProfile(p.id, { settings: { ...p.settings, [t.key]: v } })} />
          </div>
        ))}
      </section>
      <section aria-labelledby="s-test" className="grid gap-2">
        <h3 id="s-test" className="font-black">
          入力テスト
        </h3>
        <p className="text-sm">
          {p.writeSecPerDigit !== null ? `書く速さ ${p.writeSecPerDigit}秒/桁（${p.writeTestedAt} 測定）` : "まだ測っていません"}
        </p>
        <Button variant="outline" onClick={onInputTest}>
          入力テストをやり直す
        </Button>
      </section>
      <section aria-labelledby="s-coef" className="grid gap-2">
        <h3 id="s-coef" className="font-black">
          時間モデルの係数（上級者向け）
        </h3>
        <CoeffEditor p={p} />
      </section>
      <section aria-labelledby="s-pin" className="grid gap-2">
        <h3 id="s-pin" className="font-black">
          PIN
        </h3>
        <Button variant="outline" onClick={onPinChange}>
          PINを変更する
        </Button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- profiles & data
function ProfilesPane() {
  const profiles = useAppStore((s) => s.profiles);
  const activeId = useAppStore((s) => s.activeId);
  const addProfile = useAppStore((s) => s.addProfile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const switchProfile = useAppStore((s) => s.switchProfile);
  const [nick, setNick] = useState("");
  const [grade, setGrade] = useState(3);
  const max = Number(SPEC.freemium.premiumProfiles) || 4;
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {profiles.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
            <UserRound className="size-5" aria-hidden="true" />
            <Input aria-label="ニックネーム" value={p.nickname} maxLength={10} onChange={(e) => updateProfile(p.id, { nickname: e.target.value })} className="h-9 w-40" />
            <NativeSelect aria-label="学年" value={p.grade} onChange={(e) => updateProfile(p.id, { grade: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <NativeSelectOption key={g} value={g}>
                  {GRADE_LABEL(g)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {p.id === activeId ? (
              <span className="ml-auto rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">使用中</span>
            ) : (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => switchProfile(p.id)}>
                切り替える
              </Button>
            )}
          </li>
        ))}
      </ul>
      {profiles.length < max ? (
        <form
          className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nick.trim()) return;
            addProfile(nick.trim().slice(0, 10), grade, false);
            setNick("");
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="new-nick">ニックネーム</Label>
            <Input id="new-nick" value={nick} maxLength={10} onChange={(e) => setNick(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="new-grade">学年</Label>
            <NativeSelect id="new-grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <NativeSelectOption key={g} value={g}>
                  {GRADE_LABEL(g)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" disabled={!nick.trim()}>
            <Plus aria-hidden="true" />
            追加
          </Button>
        </form>
      ) : (
        <p className="text-sm">プロフィールは{max}人までです。</p>
      )}
      <p className="text-xs">追加したプロフィールは、切り替えたあと最初に入力テストと診断を行います。</p>
    </div>
  );
}

function DataPane() {
  const profiles = useAppStore((s) => s.profiles);
  const resetProfileData = useAppStore((s) => s.resetProfileData);
  const deleteProfile = useAppStore((s) => s.deleteProfile);
  const confirm = useConfirm();
  return (
    <ul className="grid gap-3">
      {profiles.map((p) => (
        <li key={p.id} className="grid gap-2 rounded-xl border p-3">
          <p className="font-bold">
            {p.nickname}（{GRADE_LABEL(p.grade)}）— セット記録 {p.sets.length}件
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (await confirm({ title: `${p.nickname}さんの記録をすべて消しますか？`, description: "進み具合・ミスの記録・ごほうびが消え、診断からやり直します。元に戻せません。", confirmLabel: "消す", destructive: true }))
                  resetProfileData(p.id);
              }}
            >
              <RotateCcw aria-hidden="true" />
              記録をすべて消す
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (await confirm({ title: `${p.nickname}さんのプロフィールを削除しますか？`, description: "このプロフィールの記録もすべて消えます。元に戻せません。", confirmLabel: "削除する", destructive: true }))
                  deleteProfile(p.id);
              }}
            >
              <Trash2 aria-hidden="true" />
              プロフィールを削除
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TestPane() {
  const dev = useAppStore((s) => s.dev);
  const setDev = useAppStore((s) => s.setDev);
  const profile = useAppStore((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);
  const resetProfileData = useAppStore((s) => s.resetProfileData);
  const skipPlacementTo = useAppStore((s) => s.skipPlacementTo);
  const setScreen = useAppStore((s) => s.setScreen);
  const [startLevel, setStartLevel] = useState(LEVELS[0].id);
  const confirm = useConfirm();
  return (
    <div className="grid gap-4">
      <p className="text-sm">動作確認のための機能です。日付を進めると、復習・マスター（別の日に★3を2回）・週1のチャレンジなどを試せます。</p>
      <div className="grid gap-2 rounded-xl border p-3">
        <p className="font-bold tabular-nums">
          アプリの日付：{todayOf(dev.dayOffset)}
          {dev.dayOffset ? `（+${dev.dayOffset}日）` : "（今日）"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDev({ dayOffset: dev.dayOffset + 1 })}>
            <CalendarPlus aria-hidden="true" />
            1日進める
          </Button>
          <Button variant="outline" onClick={() => setDev({ dayOffset: dev.dayOffset + 7 })}>
            <CalendarPlus aria-hidden="true" />
            7日進める
          </Button>
          <Button variant="ghost" onClick={() => setDev({ dayOffset: 0 })} disabled={!dev.dayOffset}>
            今日に戻す
          </Button>
        </div>
      </div>
      {(
        [
          ["unlockAll", "すべてのレベルを開放する", "前提の★2がなくても練習できます（判定は通常どおり）"],
          ["shortPlacement", "診断を短くする", "ステージチェックを6問にし、1日8分の区切りを外します"],
        ] as const
      ).map(([key, label, note]) => (
        <div key={key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div>
            <Label htmlFor={`dev-${key}`} className="font-bold">
              {label}
            </Label>
            <p className="text-xs">{note}</p>
          </div>
          <Switch id={`dev-${key}`} checked={dev[key]} onCheckedChange={(v) => setDev({ [key]: v })} />
        </div>
      ))}
      {profile && (
        <div className="grid gap-2 rounded-xl border p-3">
          <Label htmlFor="dev-start" className="font-bold">
            診断をとばして、えらんだレベルから始める
          </Label>
          <p className="text-xs">それより前のレベルは★2として扱います。ヒント・メモ・スピードの各モードや、各ステージの問題をすぐに試せます。</p>
          <div className="flex flex-wrap gap-2">
            <NativeSelect id="dev-start" value={startLevel} onChange={(e) => setStartLevel(e.target.value)}>
              {STAGES.map((st) => (
                <optgroup key={st.id} label={`ステージ${st.id} ${st.name}`}>
                  {st.levelIds.map((id) => (
                    <NativeSelectOption key={id} value={id}>
                      {id} {LEVEL[id].name}（{LEVEL[id].modes.map((m) => MODE_LABEL[m]).join("→")}）
                    </NativeSelectOption>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
            <Button
              onClick={async () => {
                if (
                  await confirm({
                    title: `レベル ${startLevel} から始めますか？`,
                    description: `${profile.nickname}さんの今の進み具合は、この設定で上書きされます。`,
                    confirmLabel: "このレベルから始める",
                    destructive: true,
                  })
                ) {
                  skipPlacementTo(startLevel);
                  setScreen("home");
                }
              }}
            >
              このレベルから始める
            </Button>
          </div>
        </div>
      )}
      {profile && (
        <Button
          variant="outline"
          onClick={async () => {
            if (await confirm({ title: "診断をやり直しますか？", description: `${profile.nickname}さんの進み具合を消して、診断から始めます。`, confirmLabel: "やり直す", destructive: true }))
              resetProfileData(profile.id);
          }}
        >
          <RotateCcw aria-hidden="true" />
          {profile.nickname}さんの診断をやり直す
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- parent area
export function ParentArea({ onExit }: { onExit: () => void }) {
  const profiles = useAppStore((s) => s.profiles);
  const activeId = useAppStore((s) => s.activeId);
  const saveInputTest = useAppStore((s) => s.saveInputTest);
  const setPin = useAppStore((s) => s.setPin);
  const [viewId, setViewId] = useState<string | null>(null);
  const [mode, setMode] = useState<"tabs" | "inputTest" | "pin" | "pin2">("tabs");
  const [pin1, setPin1] = useState("");
  const p = profiles.find((x) => x.id === (viewId ?? activeId)) ?? profiles[0];

  if (mode === "inputTest")
    return (
      <InputTest
        onDone={(s) => {
          saveInputTest(s);
          setMode("tabs");
        }}
      />
    );
  if (mode === "pin" || mode === "pin2")
    return (
      <section className="mx-auto w-full max-w-md px-4 py-8">
        <div className="rounded-3xl border bg-card p-6">
          <PinPad
            title={mode === "pin" ? "新しいPIN（4桁）" : "もう一度入力"}
            onComplete={(v) => {
              if (mode === "pin") {
                setPin1(v);
                setMode("pin2");
              } else {
                if (v === pin1) setPin(v);
                setMode("tabs");
              }
            }}
          />
        </div>
      </section>
    );

  return (
    <section aria-labelledby="parent-title" className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 id="parent-title" className="text-2xl font-black">
          保護者の画面
        </h1>
        {profiles.length > 1 && p && (
          <NativeSelect aria-label="表示するお子さま" value={p.id} onChange={(e) => setViewId(e.target.value)}>
            {profiles.map((x) => (
              <NativeSelectOption key={x.id} value={x.id}>
                {x.nickname}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        <Button variant="outline" className="ml-auto" onClick={onExit}>
          <Lock aria-hidden="true" />
          閉じる
        </Button>
      </div>
      <Tabs defaultValue="dash">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="dash">ダッシュボード</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
          <TabsTrigger value="profiles">プロフィール</TabsTrigger>
          <TabsTrigger value="data">データ</TabsTrigger>
          <TabsTrigger value="test">テスト用</TabsTrigger>
          <TabsTrigger value="info">アプリ情報</TabsTrigger>
        </TabsList>
        <div className="mt-4 min-w-0 rounded-3xl border bg-card p-4 sm:p-5">
          <TabsContent value="dash">{p ? <Dashboard p={p} /> : <p>プロフィールがありません。</p>}</TabsContent>
          <TabsContent value="settings">{p && <SettingsPane p={p} onInputTest={() => setMode("inputTest")} onPinChange={() => setMode("pin")} />}</TabsContent>
          <TabsContent value="profiles">
            <ProfilesPane />
          </TabsContent>
          <TabsContent value="data">
            <DataPane />
          </TabsContent>
          <TabsContent value="test">
            <TestPane />
          </TabsContent>
          <TabsContent value="info">
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="font-bold">カリキュラム</dt>
                <dd>
                  {SPEC.title}（仕様 v{SPEC.specVersion}、{LEVELS.length}レベル・{STAGES.length}ステージ）
                </dd>
              </div>
              <div>
                <dt className="font-bold">データの保存</dt>
                <dd>この端末のブラウザ内だけに保存します。外部への送信、広告、分析ツールはありません。</dd>
              </div>
              <div>
                <dt className="font-bold">課金</dt>
                <dd>この試作版では課金の仕組みを入れず、すべてのステージと機能を使えます。</dd>
              </div>
            </dl>
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
