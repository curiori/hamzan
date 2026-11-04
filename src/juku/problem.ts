// Problems and answers of the juku.json levels (小数と分数・円周率・単位・見積もり). A problem is plain data (stored in the records);
// its picture (tokens), reading, answer and fact key are worked out here.
import { yomi } from "@/domain/problem";
import { benchmark, partSpeech, partText, plausible, type Part } from "./benchmarks";
import {
  addDec,
  dec,
  decInt,
  decLength,
  decText,
  decToFrac,
  decValue,
  divDec,
  fracText,
  fracToDec,
  improperOf,
  mixedOf,
  mulDec,
  reduceFrac,
  shiftDec,
  subDec,
  type Dec,
} from "./num";
import { SPEED, TIME, WARI, unitShift, unitSpeech, type Label, type SpeedUnit } from "./units";

export type JOp = "×" | "÷";
export type RateKind = "decToPct" | "pctToDec" | "decToWari" | "wariToDec" | "pctToFrac";
export type TimeKind = "hToM" | "mToH" | "sToMS" | "mToHM" | "mToS";
export type FigureKind = "circleArea" | "circumference" | "sectorArea" | "arc" | "cylinder";

/** Every number is kept as its written decimal ("3.14"), so a stored problem reads back exactly. */
export type JProblem =
  | { shape: "juku"; type: "op"; a: string; op: JOp; b: string }
  | { shape: "juku"; type: "missing"; known: string; product: string; pos: "left" | "right" }
  | { shape: "juku"; type: "piSum"; terms: string[][]; signs: ("+" | "-")[] }
  | { shape: "juku"; type: "fracForm"; w: number; n: number; d: number; to: "improper" | "mixed" }
  | { shape: "juku"; type: "reduce"; n: number; d: number }
  | { shape: "juku"; type: "fracToDec"; w: number; n: number; d: number }
  | { shape: "juku"; type: "decToFrac"; v: string }
  | { shape: "juku"; type: "rate"; kind: RateKind; v: string }
  | { shape: "juku"; type: "change"; amount: number; by: "wari" | "pct"; dir: "off" | "up" }
  | { shape: "juku"; type: "convert"; v: string; from: string; to: string }
  | { shape: "juku"; type: "time"; kind: TimeKind; a: string; b?: number }
  | { shape: "juku"; type: "speed"; v: string; from: SpeedUnit; to: SpeedUnit }
  | { shape: "juku"; type: "trip"; ask: "dist" | "time" | "speed"; speed: string; su: SpeedUnit; dist: string; du: "km" | "m"; mins: number }
  | { shape: "juku"; type: "figure"; fig: FigureKind; r: number; angle?: number; h?: number; dia?: boolean }
  | { shape: "juku"; type: "round"; v: string }
  | { shape: "juku"; type: "estimate"; a: string; op: JOp; b: string; options: string[] }
  | { shape: "juku"; type: "compare"; a: string; op: JOp; b: string }
  | { shape: "juku"; type: "benchmark"; item: string }
  | { shape: "juku"; type: "plausible"; item: string };

export type JAnswer =
  | { kind: "dec"; v: string; unit?: Label }
  | { kind: "frac"; w: number; n: number; d: number; mixed: boolean }
  | { kind: "pair"; a: number; b: number; units: [Label, Label] }
  | { kind: "choice"; i: number; options: string[] }
  | { kind: "tf"; v: boolean; labels: [string, string] };

/** How a problem is drawn: numbers and operators large, units and words smaller, fractions stacked. */
export type JTok =
  | { t: "num"; v: string }
  | { t: "op"; v: string }
  | { t: "frac"; w: number; n: number; d: number }
  | { t: "unit"; v: string; r?: string }
  | { t: "box" }
  | { t: "word"; v: string; r?: string };

export interface JInstance {
  levelId: string;
  problem: JProblem;
  answer: JAnswer;
  /** characters per answer field, like ProblemInstance.answerDigits */
  answerDigits: number[];
  factKey: string;
}

export const PI = "3.14";
export const OK_NG: [string, string] = ["ありえる", "ありえない"];
export const BIG_SMALL = ["おおきい", "ちいさい"];
const BAI: Label = { v: "倍", r: "ばい" };
const PCT: Label = { v: "％" };

const OP_FW: Record<string, string> = { "+": "＋", "-": "－", "×": "×", "÷": "÷" };

// ---------------- helpers ----------------
const num = (v: string | number): JTok => ({ t: "num", v: String(v) });
const op = (v: string): JTok => ({ t: "op", v: OP_FW[v] ?? v });
const EQ: JTok = { t: "op", v: "＝" };
const BOX: JTok = { t: "box" };
const word = (v: string, r?: string): JTok => (r ? { t: "word", v, r } : { t: "word", v });
const lab = (l: Label): JTok => (l.r ? { t: "unit", v: l.v, r: l.r } : { t: "unit", v: l.v });
const unitTok = (v: string): JTok => ({ t: "unit", v });
const parts = (ps: Part[]): JTok[] => ps.map((p) => (typeof p === "string" ? word(p) : word(p.v, p.r)));

const decAns = (x: Dec, unit?: Label): JAnswer => (unit ? { kind: "dec", v: decText(x), unit } : { kind: "dec", v: decText(x) });

function exactDiv(a: Dec, b: Dec): Dec {
  const q = divDec(a, b);
  if (!q) throw new Error(`${decText(a)}÷${decText(b)} does not end`);
  return q;
}

/** 0.125 → [1, 2, 5] as 割・分・厘 (digits after the point). */
export function wariDigits(v: string): number[] {
  const t = decText(dec(v));
  const after = t.includes(".") ? t.split(".")[1] : "";
  return [0, 1, 2].map((i) => Number(after[i] ?? "0"));
}

/** the minutes of a trip as words: 15分, 1時間30分 */
function minsToks(mins: number): JTok[] {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [...(h ? [num(h), lab(TIME.h)] : []), ...(m ? [num(m), lab(TIME.m)] : [])];
}

const speedToks = (v: string, su: SpeedUnit): JTok[] => [lab(SPEED[su].name), num(v), unitTok(SPEED[su].unit)];

/** speed in metres per hour, exactly */
const metresPerHour = (v: Dec, su: SpeedUnit) => mulDec(v, decInt(SPEED[su].metres * SPEED[su].perHour));

/** the number in front of 3.14 for a figure problem */
export function figureFactor(p: Extract<JProblem, { type: "figure" }>): Dec {
  const r = decInt(p.r);
  switch (p.fig) {
    case "circleArea":
      return mulDec(r, r);
    case "circumference":
      return p.dia ? r : mulDec(r, decInt(2));
    case "sectorArea":
      return exactDiv(mulDec(mulDec(r, r), decInt(p.angle ?? 0)), decInt(360));
    case "arc":
      return exactDiv(mulDec(mulDec(r, decInt(2)), decInt(p.angle ?? 0)), decInt(360));
    case "cylinder":
      return mulDec(mulDec(r, r), decInt(p.h ?? 0));
  }
}

/** rounding to one significant digit, half up: 398 → 400, 4.87 → 5, 0.68 → 0.7, 9.6 → 10 */
export function roundTop(v: string): Dec {
  const x = dec(v);
  const digitsBefore = decText(x).split(".")[0].replace(/^0+/, "").length;
  // the place of the first non-zero digit, as a power of ten
  let top = digitsBefore - 1;
  if (digitsBefore === 0) {
    const after = decText(x).split(".")[1] ?? "";
    top = -(after.search(/[1-9]/) + 1);
  }
  const scaled = shiftDec(x, -top); // 1 ≤ scaled < 10
  const whole = Math.floor(decValue(scaled));
  const rest = subDec(scaled, decInt(whole));
  const up = decValue(rest) >= 0.5 ? 1 : 0;
  return shiftDec(decInt(whole + up), top);
}

/** the true value of an estimation problem */
export const estimateValue = (a: string, o: JOp, b: string) => (o === "×" ? decValue(mulDec(dec(a), dec(b))) : decValue(dec(a)) / decValue(dec(b)));

/** index of the option nearest to x on a ×10 scale */
export function nearestOption(options: string[], x: number): number {
  let best = 0;
  let dist = Infinity;
  options.forEach((o, i) => {
    const d = Math.abs(Math.log10(decValue(dec(o))) - Math.log10(x));
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

// ---------------- answer ----------------
export function jAnswer(p: JProblem): JAnswer {
  switch (p.type) {
    case "op":
      return decAns(p.op === "×" ? mulDec(dec(p.a), dec(p.b)) : exactDiv(dec(p.a), dec(p.b)));
    case "missing":
      return decAns(exactDiv(dec(p.product), dec(p.known)));
    case "piSum": {
      let total = decInt(0);
      p.terms.forEach((factors, i) => {
        const v = factors.reduce((acc, f) => mulDec(acc, dec(f)), decInt(1));
        total = i > 0 && p.signs[i - 1] === "-" ? subDec(total, v) : addDec(total, v);
      });
      return decAns(total);
    }
    case "fracForm":
      return p.to === "improper"
        ? { kind: "frac", w: 0, ...improperOf({ w: p.w, n: p.n, d: p.d }), mixed: false }
        : { kind: "frac", ...mixedOf({ n: p.n, d: p.d }), mixed: true };
    case "reduce":
      return { kind: "frac", w: 0, ...reduceFrac({ n: p.n, d: p.d }), mixed: false };
    case "fracToDec": {
      const x = fracToDec(improperOf({ w: p.w, n: p.n, d: p.d }));
      if (!x) throw new Error(`${p.n}/${p.d} has no ending decimal`);
      return decAns(x);
    }
    case "decToFrac":
      return { kind: "frac", w: 0, ...decToFrac(dec(p.v)), mixed: false };
    case "rate": {
      const v = dec(p.v);
      if (p.kind === "decToPct") return decAns(shiftDec(v, 2), PCT);
      if (p.kind === "pctToDec" || p.kind === "wariToDec") return decAns(p.kind === "pctToDec" ? shiftDec(v, -2) : v);
      if (p.kind === "pctToFrac") return { kind: "frac", w: 0, ...decToFrac(shiftDec(v, -2)), mixed: false };
      const [w, b] = wariDigits(p.v);
      return b ? { kind: "pair", a: w, b, units: [WARI.wari, WARI.bu] } : decAns(decInt(w), WARI.wari);
    }
    case "change": {
      const part = shiftDec(decInt(p.amount), p.by === "wari" ? -1 : -2);
      return decAns(p.dir === "off" ? subDec(decInt(1), part) : addDec(decInt(1), part), BAI);
    }
    case "convert":
      return decAns(shiftDec(dec(p.v), unitShift(p.from, p.to)), { v: p.to });
    case "time": {
      const a = dec(p.a);
      if (p.kind === "hToM") return decAns(mulDec(a, decInt(60)), TIME.m);
      if (p.kind === "mToS") return decAns(mulDec(a, decInt(60)), TIME.s);
      if (p.kind === "mToH") return decAns(addDec(a, exactDiv(decInt(p.b ?? 0), decInt(60))), TIME.h);
      const n = decValue(a);
      return p.kind === "sToMS"
        ? { kind: "pair", a: Math.floor(n / 60), b: n % 60, units: [TIME.m, TIME.s] }
        : { kind: "pair", a: Math.floor(n / 60), b: n % 60, units: [TIME.h, TIME.m] };
    }
    case "speed": {
      const mph = metresPerHour(dec(p.v), p.from);
      return decAns(exactDiv(mph, decInt(SPEED[p.to].metres * SPEED[p.to].perHour)), { v: SPEED[p.to].unit });
    }
    case "trip": {
      const mph = metresPerHour(dec(p.speed), p.su);
      const distM = p.du === "km" ? mulDec(dec(p.dist), decInt(1000)) : dec(p.dist);
      if (p.ask === "dist") {
        const m = exactDiv(mulDec(mph, decInt(p.mins)), decInt(60));
        return decAns(p.du === "km" ? exactDiv(m, decInt(1000)) : m, { v: p.du });
      }
      if (p.ask === "time") return decAns(exactDiv(mulDec(distM, decInt(60)), mph), TIME.m);
      const perHour = exactDiv(mulDec(distM, decInt(60)), decInt(p.mins));
      return decAns(exactDiv(perHour, decInt(SPEED[p.su].metres * SPEED[p.su].perHour)), { v: SPEED[p.su].unit });
    }
    case "figure": {
      const unit = p.fig === "circleArea" || p.fig === "sectorArea" ? "cm²" : p.fig === "cylinder" ? "cm³" : "cm";
      return decAns(mulDec(figureFactor(p), dec(PI)), { v: unit });
    }
    case "round":
      return decAns(roundTop(p.v));
    case "estimate":
      return { kind: "choice", i: nearestOption(p.options, estimateValue(p.a, p.op, p.b)), options: p.options };
    case "compare": {
      const x = estimateValue(p.a, p.op, p.b);
      return { kind: "choice", i: x > decValue(dec(p.a)) ? 0 : 1, options: BIG_SMALL };
    }
    case "benchmark": {
      const it = benchmark(p.item);
      return { kind: "choice", i: it.answer, options: it.options };
    }
    case "plausible":
      return { kind: "tf", v: plausible(p.item).ok, labels: OK_NG };
  }
}

// ---------------- picture ----------------
const FIGURE_WORDS = {
  hankei: word("半径", "はんけい"),
  chokkei: word("直径", "ちょっけい"),
  en: word("円", "えん"),
  menseki: word("面積", "めんせき"),
  nagasa: word("長さ", "ながさ"),
  chushinkaku: word("中心角", "ちゅうしんかく"),
  ko: word("弧", "こ"),
  takasa: word("高さ", "たかさ"),
  enchu: word("円柱", "えんちゅう"),
  taiseki: word("体積", "たいせき"),
};

export function jTokens(p: JProblem): JTok[] {
  switch (p.type) {
    case "op":
      return [num(p.a), op(p.op), num(p.b), EQ];
    case "missing":
      return p.pos === "left" ? [BOX, op("×"), num(p.known), EQ, num(p.product)] : [num(p.known), op("×"), BOX, EQ, num(p.product)];
    case "piSum":
      return [
        ...p.terms.flatMap((factors, i) => [
          ...(i > 0 ? [op(p.signs[i - 1])] : []),
          ...factors.flatMap((f, j) => (j > 0 ? [op("×"), num(f)] : [num(f)])),
        ]),
        EQ,
      ];
    case "fracForm":
      return [
        { t: "frac", w: p.w, n: p.n, d: p.d },
        word("を "),
        p.to === "improper" ? word("仮分数", "かぶんすう") : word("帯分数", "たいぶんすう"),
        word("に"),
      ];
    case "reduce":
      return [{ t: "frac", w: 0, n: p.n, d: p.d }, word("を "), word("約分", "やくぶん")];
    case "fracToDec":
      return [{ t: "frac", w: p.w, n: p.n, d: p.d }, word("を "), word("小数", "しょうすう"), word("に")];
    case "decToFrac":
      return [num(p.v), word("を "), word("分数", "ぶんすう"), word("に")];
    case "rate":
      switch (p.kind) {
        case "decToPct":
          return [num(p.v), EQ, BOX, lab(PCT)];
        case "pctToDec":
          return [num(p.v), lab(PCT), EQ, BOX];
        case "pctToFrac":
          return [num(p.v), lab(PCT), word("を "), word("分数", "ぶんすう"), word("に")];
        case "decToWari": {
          const [, b] = wariDigits(p.v);
          return [num(p.v), EQ, BOX, lab(WARI.wari), ...(b ? [BOX, lab(WARI.bu)] : [])];
        }
        case "wariToDec": {
          const [w, b, r] = wariDigits(p.v);
          return [...(w ? [num(w), lab(WARI.wari)] : []), ...(b ? [num(b), lab(WARI.bu)] : []), ...(r ? [num(r), lab(WARI.rin)] : []), EQ, BOX];
        }
      }
      break;
    case "change":
      return [
        num(p.amount),
        p.by === "wari" ? lab(WARI.wari) : lab(PCT),
        p.dir === "off" ? word("引き", "びき") : word("増し", "まし"),
        word("は もとの "),
        BOX,
        lab(BAI),
      ];
    case "convert":
      return [num(p.v), unitTok(p.from), EQ, BOX, unitTok(p.to)];
    case "time": {
      if (p.kind === "hToM") return [num(p.a), lab(TIME.h), EQ, BOX, lab(TIME.m)];
      if (p.kind === "mToS") return [num(p.a), lab(TIME.m), EQ, BOX, lab(TIME.s)];
      if (p.kind === "mToH") return [...(p.a !== "0" ? [num(p.a), lab(TIME.h)] : []), num(p.b ?? 0), lab(TIME.m), EQ, BOX, lab(TIME.h)];
      if (p.kind === "sToMS") return [num(p.a), lab(TIME.s), EQ, BOX, lab(TIME.m), BOX, lab(TIME.s)];
      return [num(p.a), lab(TIME.m), EQ, BOX, lab(TIME.h), BOX, lab(TIME.m)];
    }
    case "speed":
      return [...speedToks(p.v, p.from), EQ, lab(SPEED[p.to].name), BOX, unitTok(SPEED[p.to].unit)];
    case "trip":
      if (p.ask === "dist") return [...speedToks(p.speed, p.su), word("で "), ...minsToks(p.mins), word(" すすむと "), BOX, unitTok(p.du)];
      if (p.ask === "time") return [num(p.dist), unitTok(p.du), word("を "), ...speedToks(p.speed, p.su), word("で すすむと "), BOX, lab(TIME.m)];
      return [num(p.dist), unitTok(p.du), word("を "), ...minsToks(p.mins), word("で すすむ はやさは "), lab(SPEED[p.su].name), BOX, unitTok(SPEED[p.su].unit)];
    case "figure": {
      const W = FIGURE_WORDS;
      const radius = p.dia ? [W.chokkei, num(p.r), unitTok("cm")] : [W.hankei, num(p.r), unitTok("cm")];
      const angle = [word("、"), W.chushinkaku, num(p.angle ?? 0), unitTok("°")];
      switch (p.fig) {
        case "circleArea":
          return [...radius, word("の "), W.en, word("の "), W.menseki, word("は "), BOX, unitTok("cm²")];
        case "circumference":
          return [...radius, word("の "), W.en, word("の まわりの "), W.nagasa, word("は "), BOX, unitTok("cm")];
        case "sectorArea":
          return [...radius, ...angle, word("の おうぎがたの "), W.menseki, word("は "), BOX, unitTok("cm²")];
        case "arc":
          return [...radius, ...angle, word("の おうぎがたの "), W.ko, word("の "), W.nagasa, word("は "), BOX, unitTok("cm")];
        case "cylinder":
          return [...radius, word("、"), W.takasa, num(p.h ?? 0), unitTok("cm"), word("の "), W.enchu, word("の "), W.taiseki, word("は "), BOX, unitTok("cm³")];
      }
      break;
    }
    case "round":
      return [num(p.v), word("を "), word("上", "うえ"), word("から 1けたの がいすうに")];
    case "estimate":
      return [num(p.a), op(p.op), num(p.b), word(" は？")];
    case "compare":
      return [num(p.a), op(p.op), num(p.b), word(" は "), num(p.a), word("より")];
    case "benchmark":
      return parts(benchmark(p.item).q);
    case "plausible":
      return [...parts(plausible(p.item).text), word("。 ありえる？")];
  }
  throw new Error(`no picture for ${JSON.stringify(p)}`);
}

/** The problem as one line of text (parent screens, keys of the records). */
export function jText(p: JProblem): string {
  return jTokens(p)
    .map((t) => (t.t === "box" ? "□" : t.t === "frac" ? fracText(t) : t.v))
    .join("");
}

// ---------------- reading aloud ----------------
const DIGIT = ["ぜろ", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

/** 3.14 → さん てん いち よん */
export function decYomi(v: string): string {
  const [w, f] = v.split(".");
  const head = yomi(Number(w || "0"));
  return f ? `${head} てん ${[...f].map((d) => DIGIT[Number(d)]).join(" ")}` : head;
}

const OP_YOMI: Record<string, string> = { "＋": "たす", "－": "ひく", "×": "かける", "÷": "わる", "＝": "は" };

export function jSpeech(p: JProblem): string {
  return jTokens(p)
    .map((t, i, all) => {
      switch (t.t) {
        case "num":
          return decYomi(t.v);
        case "op":
          return OP_YOMI[t.v] ?? t.v;
        case "frac":
          return `${t.w ? `${yomi(t.w)} と ` : ""}${yomi(t.d)}ぶんの${yomi(t.n)}`;
        case "unit":
          return unitSpeech(t.v, t.r);
        case "box":
          // なんぷん, なんメートル; a bare unknown is なに like the core problems
          return all[i + 1]?.t === "unit" ? "なん" : "なに";
        case "word":
          return t.r ?? t.v;
      }
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------- answers as text ----------------
/** 1600000 → 1,600,000 (options of a 4択 are easier to compare grouped); other text stays as it is */
export const groupDigits = (s: string) => (/^\d{5,}$/.test(s) ? s.replace(/\B(?=(\d{3})+$)/g, ",") : s);

export function jAnswerText(a: JAnswer): string {
  switch (a.kind) {
    case "dec":
      return `${a.v}${a.unit?.v ?? ""}`;
    case "frac":
      return fracText(a);
    case "pair":
      return `${a.a}${a.units[0].v}${a.b}${a.units[1].v}`;
    case "choice":
      return groupDigits(a.options[a.i] ?? "");
    case "tf":
      return a.labels[a.v ? 0 : 1];
  }
}

/** Characters and moves a child makes for the answer: the point and each move between fraction boxes count as one. */
export function jWriteUnits(a: JAnswer): number {
  switch (a.kind) {
    case "dec":
      return decLength(dec(a.v));
    case "frac": {
      const boxes = a.mixed ? [a.w, a.n, a.d] : [a.n, a.d];
      // digits, a move between each pair of boxes, and OK (fraction boxes are never sent by themselves)
      return boxes.reduce((s, v) => s + String(v).length, 0) + boxes.length;
    }
    case "pair":
      return String(a.a).length + String(a.b).length;
    case "choice":
    case "tf":
      return 1;
  }
}

/** Characters per answer field (for the width of the boxes and sending by length). */
export function jAnswerDigits(a: JAnswer): number[] {
  switch (a.kind) {
    case "dec":
      return [decLength(dec(a.v))];
    case "frac":
      return (a.mixed ? [a.w, a.n, a.d] : [a.n, a.d]).map((v) => String(v).length);
    case "pair":
      return [String(a.a).length, String(a.b).length];
    case "choice":
    case "tf":
      return [1];
  }
}

// ---------------- fact keys ----------------
/** Dedupe / weakness key; × puts the smaller number first so 3.14×7 and 7×3.14 are one fact. */
export function jFactKey(p: JProblem): string {
  switch (p.type) {
    case "op": {
      if (p.op === "×") {
        const [x, y] = [p.a, p.b].sort((s, t) => decValue(dec(s)) - decValue(dec(t)) || s.localeCompare(t));
        return `j:mul:${x}x${y}`;
      }
      return `j:div:${p.a}/${p.b}`;
    }
    case "missing":
      return `j:mis:${p.known}/${p.product}`;
    case "piSum":
      return `j:pis:${p.terms.map((t) => t.join("x")).join(",")}:${p.signs.join("")}`;
    case "fracForm":
      return `j:ff:${p.w}+${p.n}/${p.d}>${p.to}`;
    case "reduce":
      return `j:red:${p.n}/${p.d}`;
    case "fracToDec":
      return `j:f2d:${p.w}+${p.n}/${p.d}`;
    case "decToFrac":
      return `j:d2f:${p.v}`;
    case "rate":
      return `j:rate:${p.kind}:${p.v}`;
    case "change":
      return `j:chg:${p.amount}${p.by}${p.dir}`;
    case "convert":
      return `j:cv:${p.v}${p.from}>${p.to}`;
    case "time":
      return `j:time:${p.kind}:${p.a}${p.b !== undefined ? `+${p.b}` : ""}`;
    case "speed":
      return `j:spd:${p.v}${p.from}>${p.to}`;
    case "trip":
      return `j:trip:${p.ask}:${p.speed}${p.su}:${p.dist}${p.du}:${p.mins}`;
    case "figure":
      return `j:fig:${p.fig}:${p.dia ? "d" : "r"}${p.r}:${p.angle ?? ""}:${p.h ?? ""}`;
    case "round":
      return `j:rnd:${p.v}`;
    case "estimate":
      return `j:est:${p.a}${p.op}${p.b}`;
    case "compare":
      return `j:cmp:${p.a}${p.op}${p.b}`;
    case "benchmark":
      return `j:bm:${p.item}`;
    case "plausible":
      return `j:pl:${p.item}`;
  }
}

export function makeJInstance(levelId: string, problem: JProblem): JInstance {
  const answer = jAnswer(problem);
  return { levelId, problem, answer, answerDigits: jAnswerDigits(answer), factKey: jFactKey(problem) };
}

export const isJProblem = (p: { shape: string }): p is JProblem => p.shape === "juku";

export { partSpeech, partText };
