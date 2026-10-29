import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Delete, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Hamster } from "@/components/hamster-art";
import { LEVEL, RULE_NUMBERS, SPEC, STAGES } from "@/domain/spec";
import { seedOf } from "@/domain/rng";
import { buildMixed, buildSet, spread } from "@/domain/setBuilder";
import { miniLevel, placementBudgetLeft } from "@/domain/placement";
import { KID_LEVEL_NAME, KID_STAGE_NAME, MODE_LABEL } from "@/i18n/ja";
import { activeProfile, todayOf, useAppStore, type SetSummary } from "@/lib/store";
import { PlayScreen, type PlayOutcome, type PlayRequest } from "@/features/play";
import { ResultScreen } from "@/features/result";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- PIN pad
export function PinPad({ title, note, onComplete, error }: { title: string; note?: string; onComplete: (pin: string) => void; error?: string | null }) {
  const [pin, setPin] = useState("");
  const press = (k: string) => {
    if (k === "del") return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      window.setTimeout(() => {
        onComplete(next);
        setPin("");
      }, 120);
    }
  };
  return (
    <div className="mx-auto grid max-w-xs gap-4 text-center">
      <h2 className="text-xl font-black">{title}</h2>
      {note && <p className="text-sm">{note}</p>}
      <div className="flex justify-center gap-3" aria-label={`${pin.length}けた にゅうりょく ずみ`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("size-5 rounded-full border-2 border-foreground/40", i < pin.length && "border-primary bg-primary")} />
        ))}
      </div>
      {error && <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "del" ? "1もじ けす" : k}
              className="grid h-14 place-items-center rounded-2xl border bg-card text-2xl font-black shadow-sm hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {k === "del" ? <Delete className="size-6" aria-hidden="true" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- input-speed test
export function InputTest({ onDone }: { onDone: (perDigitSec: number[]) => void }) {
  const cfg = SPEC.timeModel.inputSpeedTest;
  const [items] = useState(() => Array.from({ length: cfg.items }, () => 10 ** (cfg.itemDigits - 1) + Math.floor(Math.random() * 9 * 10 ** (cfg.itemDigits - 1))));
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const shownAt = useRef(performance.now());
  const samples = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  const commit = useCallback(
    (value: string) => {
      const want = String(items[idx]);
      if (value.length < want.length) return;
      const sec = (performance.now() - shownAt.current) / 1000 / want.length;
      if (value === want) samples.current.push(sec);
      const next = idx + 1;
      if (next >= items.length) {
        if (!finished.current) {
          finished.current = true;
          onDone(samples.current.length ? samples.current : [sec]);
        }
        return;
      }
      setIdx(next);
      setTyped("");
      shownAt.current = performance.now() + 100;
    },
    [idx, items, onDone],
  );
  const press = (k: string) => {
    if (k === "del") return setTyped((t) => t.slice(0, -1));
    const v = (typed + k).slice(0, cfg.itemDigits);
    setTyped(v);
    commit(v);
    inputRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), [idx]);

  return (
    <section aria-labelledby="it-title" className="mx-auto grid w-full max-w-md gap-4 px-4 py-6 text-center">
      <div className="mx-auto w-24">
        <Hamster mood="happy" className="w-full" />
      </div>
      <h1 id="it-title" className="text-2xl font-black">
        でてきた かずを うってね
      </h1>
      <Progress value={(idx / items.length) * 100} className="h-2.5" aria-label="すすみぐあい" />
      <p className="text-7xl font-black tabular-nums" aria-live="polite">
        {items[idx]}
      </p>
      <label className="sr-only" htmlFor="it-input">
        うった かず
      </label>
      <input
        id="it-input"
        ref={inputRef}
        value={typed}
        inputMode="none"
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, "").slice(0, cfg.itemDigits);
          setTyped(v);
          if (!(e.nativeEvent as InputEvent).isComposing) commit(v);
        }}
        className="mx-auto h-16 w-40 rounded-2xl border-2 border-primary bg-background text-center text-4xl font-black tabular-nums outline-none ring-4 ring-primary/25"
      />
      <div className="grid grid-cols-3 gap-2">
        {["7", "8", "9", "4", "5", "6", "1", "2", "3", "", "0", "del"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "del" ? "けす" : k}
              className="grid h-14 place-items-center rounded-2xl border bg-card text-2xl font-black shadow-sm hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {k === "del" ? <Delete className="size-6" aria-hidden="true" /> : k}
            </button>
          ),
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- onboarding
export function Onboarding() {
  const hasPin = useAppStore((s) => !!s.pin);
  const setPin = useAppStore((s) => s.setPin);
  const addProfile = useAppStore((s) => s.addProfile);
  const [step, setStep] = useState<"intro" | "pin" | "pin2" | "child">(hasPin ? "child" : "intro");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState(3);

  return (
    <section aria-labelledby="ob-title" className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        {step === "intro" && (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 shrink-0">
                <Hamster className="w-full" />
              </div>
              <h1 id="ob-title" className="text-2xl font-black">
                保護者の方へ
              </h1>
            </div>
            <p>
              毎日7〜10分、暗算の「技」をヒント → メモ → スピードの順に身につける練習です。正確さを先に、時間はあとで見ます。お子さまの画面にはタイマーを表示しません（設定で変更できます）。
            </p>
            <ul className="grid gap-2 text-sm">
              <li className="flex gap-2">
                <ShieldCheck className="size-5 shrink-0 text-green-700 dark:text-green-400" aria-hidden="true" />
                記録はこの端末（このブラウザ）の中だけに保存します。アカウント登録・広告・外部への送信はありません。
              </li>
              <li className="flex gap-2">
                <Lock className="size-5 shrink-0 text-primary" aria-hidden="true" />
                設定・記録の削除・保護者向けの画面は、4桁のPINの奥にあります。
              </li>
            </ul>
            <Button size="lg" className="h-12 text-base" onClick={() => setStep("pin")}>
              PINを決める
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        )}
        {step === "pin" && (
          <PinPad
            title="保護者用のPIN（4桁）"
            note="お子さまに見えないように入力してください"
            error={pinError}
            onComplete={(p) => {
              setFirstPin(p);
              setPinError(null);
              setStep("pin2");
            }}
          />
        )}
        {step === "pin2" && (
          <PinPad
            title="もう一度 入力してください"
            error={pinError}
            onComplete={(p) => {
              if (p !== firstPin) {
                setPinError("一致しませんでした。最初からやり直してください");
                setStep("pin");
                return;
              }
              setPin(p);
              setStep("child");
            }}
          />
        )}
        {step === "child" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nickname.trim()) return;
              // the home screen takes over from here (first steps: key practice, then the diagnosis)
              addProfile(nickname.trim().slice(0, 10), grade);
            }}
          >
            <h1 id="ob-title" className="text-2xl font-black">
              お子さまのニックネームと学年
            </h1>
            <p className="text-sm">扱う情報はニックネームと学年だけです。本名は入れないでください。</p>
            <div className="grid gap-2">
              <Label htmlFor="ob-nick">ニックネーム</Label>
              <Input id="ob-nick" value={nickname} maxLength={10} onChange={(e) => setNickname(e.target.value)} className="h-12 text-base" />
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">学年</legend>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={grade === g}
                    onClick={() => setGrade(g)}
                    className={cn("h-12 rounded-xl border-2 font-black", grade === g ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
                  >
                    小{g}
                  </button>
                ))}
              </div>
            </fieldset>
            <Button type="submit" size="lg" className="h-12 text-base" disabled={!nickname.trim()}>
              つぎへ
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- first steps of a new profile
export function FirstSteps({ nickname, onDone }: { nickname: string; onDone: (perDigitSec: number[]) => void }) {
  const [started, setStarted] = useState(false);
  if (started) return <InputTest onDone={onDone} />;
  return (
    <section aria-labelledby="fs-title" className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="grid gap-4 rounded-3xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto w-24">
          <Hamster mood="cheer" className="w-full" />
        </div>
        <h1 id="fs-title" className="text-2xl font-black">
          {nickname}さん、はじめよう！
        </h1>
        <p className="font-bold">
          まずは すうじキーの れんしゅう。でてくる 2けたの かずを、そのまま うってね。{SPEC.timeModel.inputSpeedTest.items}こ あるよ。
        </p>
        <p className="text-sm">（保護者の方へ：入力の速さを測って、目安タイムの「書く時間」をお子さまに合わせます。つづいて、どこから始めるかを決める診断に進みます）</p>
        <Button size="lg" className="h-12 text-base" onClick={() => setStarted(true)}>
          はじめる
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- placement
export function PlacementView({ onFinished }: { onFinished: () => void }) {
  const profile = useAppStore((s) => activeProfile(s));
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const short = useAppStore((s) => s.dev.shortPlacement);
  const recordSet = useAppStore((s) => s.recordSet);
  const beginPlacement = useAppStore((s) => s.beginPlacement);
  const setScreen = useAppStore((s) => s.setScreen);
  const [play, setPlay] = useState<PlayRequest | null>(null);
  const [summary, setSummary] = useState<SetSummary | null>(null);
  const date = todayOf(dayOffset);
  const st = profile?.placement ?? null;

  useEffect(() => {
    if (profile && !st) beginPlacement();
  }, [profile, st, beginPlacement]);

  const request = useMemo((): PlayRequest | null => {
    if (!profile || !st || st.phase === "done") return null;
    const attempt = profile.sets.filter((x) => x.kind === "placement").length;
    const seed = seedOf(profile.id, "placement", date, attempt);
    if (st.phase === "stageCheck") {
      const sc = STAGES[st.stage].stageCheck;
      const n = short ? Math.min(6, sc.problems) : sc.problems;
      return {
        key: `pl${attempt}`,
        title: `ステージ${st.stage}「${KID_STAGE_NAME[st.stage]}」`,
        subtitle: "しんだん：ステージチェック",
        mode: "S",
        problems: buildMixed(sc.levels, spread(sc.levels, n, seed), seed),
      };
    }
    const lv = miniLevel(st);
    return {
      key: `pl${attempt}`,
      title: KID_LEVEL_NAME[lv],
      subtitle: "しんだん：ミニチェック",
      mode: "S",
      problems: buildSet(lv, RULE_NUMBERS.miniCheckProblems, seed),
    };
  }, [profile, st, date, short]);

  if (!profile || !st) return null;

  if (play)
    return (
      <PlayScreen
        req={play}
        timer={profile.settings.timer}
        autoSubmit={profile.settings.autoSubmit}
        sound={profile.settings.sound}
        vibration={profile.settings.vibration}
        wear={profile.wearing}
        onQuit={() => {
          setPlay(null);
          setScreen("home");
        }}
        onFinish={(o: PlayOutcome) => {
          const s = recordSet({
            kind: "placement",
            mode: "S",
            levelId: st.phase === "mini" ? miniLevel(st) : null,
            results: o.results,
            interrupted: o.interrupted,
            placementPhase: st.phase === "mini" ? "mini" : "stageCheck",
            activeSec: o.activeSec,
          });
          setPlay(null);
          setSummary(s);
          setScreen("home");
        }}
      />
    );

  if (summary)
    return (
      <ResultScreen
        summary={summary}
        title="しんだん"
        wear={profile.wearing}
        nextLabel="つぎへ"
        onNext={() => setSummary(null)}
        onRetry={null}
        onHome={() => setSummary(null)}
      />
    );

  const left = placementBudgetLeft(st, date);
  const done = st.phase === "done";
  return (
    <section aria-labelledby="pl-title" className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="grid gap-4 rounded-3xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto w-24">
          <Hamster mood={done ? "cheer" : "idle"} wear={profile.wearing} className="w-full" />
        </div>
        <h1 id="pl-title" className="text-2xl font-black">
          {done ? "しんだん おわり！" : `しんだん ${Math.max(1, st.days + (st.day === date ? 0 : 1))}にちめ`}
        </h1>
        {done ? (
          <>
            <p className="font-bold">
              {st.result?.frontier ? `「${KID_LEVEL_NAME[st.result.frontier]}」の ${MODE_LABEL[st.result.mode]}から はじめよう` : "ぜんぶの レベルが ★2いじょう！ マスターを めざそう"}
            </p>
            <Button size="lg" className="h-12 text-base" onClick={onFinished}>
              ホームへ
              <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : !short && left <= 0 ? (
          <>
            <p className="font-bold">きょうは ここまで。あしたも つづきを やろう</p>
            <p className="text-sm">（1日{SPEC.rules.placement.maxMinutesPerDay}分までに区切っています。2〜3日で終わります）</p>
            <Button size="lg" variant="outline" className="h-12 text-base" onClick={() => setScreen("room")}>
              おへやを みる
            </Button>
          </>
        ) : (
          <>
            <p className="font-bold">
              {st.phase === "stageCheck"
                ? `ステージ${st.stage}「${KID_STAGE_NAME[st.stage]}」の チェック`
                : `「${KID_LEVEL_NAME[miniLevel(st)]}」を ${RULE_NUMBERS.miniCheckProblems}もん`}
            </p>
            <p className="text-sm">できる ところから はじめるための テストだよ。わからなくても だいじょうぶ。</p>
            {st.phase === "mini" && <p className="text-xs">レベル {LEVEL[miniLevel(st)].id}</p>}
            <Button
              size="lg"
              className="h-14 text-lg"
              onClick={() => {
                if (!request) return;
                setPlay(request);
                setScreen("play");
              }}
            >
              はじめる
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
