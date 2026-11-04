// Familiar quantities for stage 9 (9-4 量の目安, 9-5 ありえない答え) and the hint cards that show them.
import type { Label } from "./units";

export type Part = string | Label;
export type BenchCategory = "speed" | "weight" | "length" | "volume" | "area" | "time" | "count";

export interface BenchmarkItem {
  id: string;
  /** the question, e.g. あるく はやさは？ */
  q: Part[];
  /** smallest first */
  options: string[];
  answer: number;
  cat: BenchCategory;
}

export interface PlausibleItem {
  id: string;
  text: Part[];
  /** true: ありえる */
  ok: boolean;
  cat: BenchCategory;
}

const JISOKU: Label = { v: "時速", r: "じそく" };
const FUNSOKU: Label = { v: "分速", r: "ふんそく" };
const BYOSOKU: Label = { v: "秒速", r: "びょうそく" };
const ENDAMA: Label = { v: "円玉", r: "えんだま" };

export const BENCHMARKS: BenchmarkItem[] = [
  { id: "walk", q: ["あるく はやさは？"], options: ["分速8m", "分速80m", "分速800m", "分速8km"], answer: 1, cat: "speed" },
  { id: "walkKmh", q: ["あるく はやさを ", JISOKU, "で いうと？"], options: ["時速0.4km", "時速4km", "時速40km", "時速400km"], answer: 1, cat: "speed" },
  { id: "bike", q: ["じてんしゃの はやさは？"], options: ["時速1.5km", "時速15km", "時速150km", "時速1500km"], answer: 1, cat: "speed" },
  { id: "car", q: ["こうそくどうろの じどうしゃの はやさは？"], options: ["時速10km", "時速100km", "時速1000km", "時速10000km"], answer: 1, cat: "speed" },
  { id: "shinkansen", q: ["しんかんせんの はやさは？"], options: ["時速3km", "時速30km", "時速300km", "時速3000km"], answer: 2, cat: "speed" },
  { id: "run", q: ["小学生が はしる はやさは？"], options: ["秒速0.5m", "秒速5m", "秒速50m", "秒速500m"], answer: 1, cat: "speed" },
  { id: "sound", q: ["おとの はやさは？"], options: ["秒速34m", "秒速340m", "秒速3400m", "秒速34000m"], answer: 1, cat: "speed" },
  { id: "water1L", q: ["1Lの 水の おもさは？"], options: ["1g", "10g", "100g", "1kg"], answer: 3, cat: "weight" },
  { id: "water1cm3", q: ["1cm³の 水の おもさは？"], options: ["1mg", "1g", "1kg", "1t"], answer: 1, cat: "weight" },
  { id: "coin", q: ["1", ENDAMA, " 1まいの おもさは？"], options: ["1g", "10g", "100g", "1kg"], answer: 0, cat: "weight" },
  { id: "child", q: ["4年生の たいじゅうは？"], options: ["3kg", "30kg", "300kg", "3t"], answer: 1, cat: "weight" },
  { id: "randoseru", q: ["ランドセルの おもさは？"], options: ["12g", "120g", "1.2kg", "12kg"], answer: 2, cat: "weight" },
  { id: "carWeight", q: ["ふつうの じどうしゃの おもさは？"], options: ["15kg", "150kg", "1.5t", "15t"], answer: 2, cat: "weight" },
  { id: "ceiling", q: ["きょうしつの てんじょうの たかさは？"], options: ["30cm", "3m", "30m", "300m"], answer: 1, cat: "length" },
  { id: "door", q: ["いえの ドアの たかさは？"], options: ["2cm", "20cm", "2m", "20m"], answer: 2, cat: "length" },
  { id: "pencil", q: ["えんぴつ 1本の ながさは？"], options: ["1.8cm", "18cm", "1.8m", "18m"], answer: 1, cat: "length" },
  { id: "coinSize", q: ["1", ENDAMA, "の ちょっけいは？"], options: ["2mm", "2cm", "20cm", "2m"], answer: 1, cat: "length" },
  { id: "textbook", q: ["きょうかしょ 1さつの あつさは？"], options: ["1mm", "1cm", "10cm", "1m"], answer: 1, cat: "length" },
  { id: "fuji", q: ["ふじさんの たかさは？"], options: ["37.76m", "377.6m", "3776m", "37760m"], answer: 2, cat: "length" },
  { id: "cup", q: ["コップ 1ぱいの 水の かさは？"], options: ["2mL", "20mL", "200mL", "2L"], answer: 2, cat: "volume" },
  { id: "milk", q: ["ぎゅうにゅうパック（大）の かさは？"], options: ["10mL", "100mL", "1L", "10L"], answer: 2, cat: "volume" },
  { id: "classroom", q: ["きょうしつの ゆかの めんせきは？"], options: ["6m²", "60m²", "600m²", "6000m²"], answer: 1, cat: "area" },
  { id: "dash", q: ["小学生が 50mを はしる じかんは？"], options: ["0.9秒", "9秒", "90秒", "900秒"], answer: 1, cat: "time" },
];

export const PLAUSIBLES: PlausibleItem[] = [
  { id: "bus", text: ["バスの じょうきゃくが 12.5人"], ok: false, cat: "count" },
  { id: "class", text: ["クラスの 人数が 32人"], ok: true, cat: "count" },
  { id: "test", text: ["100てん まんてんの テストで 105てん"], ok: false, cat: "count" },
  { id: "onigiri", text: ["おにぎり 1この ねだんが 0.5円"], ok: false, cat: "count" },
  { id: "walkFast", text: ["あるく はやさが ", JISOKU, "30km"], ok: false, cat: "speed" },
  { id: "walk", text: ["あるく はやさが ", JISOKU, "4km"], ok: true, cat: "speed" },
  { id: "walkMin", text: ["あるく はやさが ", FUNSOKU, "80m"], ok: true, cat: "speed" },
  { id: "bike", text: ["じてんしゃの はやさが ", JISOKU, "15km"], ok: true, cat: "speed" },
  { id: "shinkansen", text: ["しんかんせんの はやさが ", JISOKU, "300km"], ok: true, cat: "speed" },
  { id: "runFast", text: ["小学生が はしる はやさが ", BYOSOKU, "50m"], ok: false, cat: "speed" },
  { id: "water", text: ["1Lの 水の おもさが 1kg"], ok: true, cat: "weight" },
  { id: "apple", text: ["りんご 1この おもさが 3kg"], ok: false, cat: "weight" },
  { id: "randoseru", text: ["ランドセルの おもさが 1.2kg"], ok: true, cat: "weight" },
  { id: "child", text: ["4年生の たいじゅうが 300kg"], ok: false, cat: "weight" },
  { id: "coin", text: ["1", ENDAMA, " 1まいの おもさが 100g"], ok: false, cat: "weight" },
  { id: "ceiling", text: ["きょうしつの てんじょうの たかさが 30m"], ok: false, cat: "length" },
  { id: "pencil", text: ["えんぴつ 1本の ながさが 18cm"], ok: true, cat: "length" },
  { id: "pencilLong", text: ["えんぴつ 1本の ながさが 18m"], ok: false, cat: "length" },
  { id: "door", text: ["ドアの たかさが 2m"], ok: true, cat: "length" },
  { id: "cup", text: ["コップ 1ぱいの 水が 20L"], ok: false, cat: "volume" },
  { id: "milk", text: ["ぎゅうにゅうパック（大）の かさが 1L"], ok: true, cat: "volume" },
  { id: "classroom", text: ["きょうしつの ゆかの めんせきが 60m²"], ok: true, cat: "area" },
  { id: "dash", text: ["小学生が 50mを 9びょうで はしる"], ok: true, cat: "time" },
  { id: "sleep", text: ["1日に 30時間 ねむる"], ok: false, cat: "time" },
];

/** The familiar sizes the hint card shows for each kind of quantity. */
export const BENCH_NOTES: Record<BenchCategory, string[]> = {
  speed: ["あるく：分速80m（時速4.8km）", "じてんしゃ：時速15km", "じどうしゃ：時速40〜100km", "しんかんせん：時速300km"],
  weight: ["1円玉 1まい：1g", "1Lの 水：1kg（1cm³で 1g）", "4年生の たいじゅう：30kg", "じどうしゃ：1.5t"],
  length: ["1円玉の ちょっけい：2cm", "えんぴつ：18cm", "ドアの たかさ：2m", "きょうしつの たかさ：3m"],
  volume: ["コップ 1ぱい：200mL", "ぎゅうにゅうパック（大）：1L", "1L＝1000cm³", "1Lの 水：1kg"],
  area: ["きょうしつの ゆか：60m²（8m×8m くらい）", "1a＝10m×10m", "1ha＝100m×100m"],
  time: ["50mを はしる：9びょう くらい", "1日：24時間", "1時間：60分"],
  count: ["人や ものは 1、2、3…と かぞえる（12.5人は ない）", "テストは 100てん まんてん", "1円より こまかい おかねは ない"],
};

export const benchmark = (id: string): BenchmarkItem => {
  const it = BENCHMARKS.find((b) => b.id === id);
  if (!it) throw new Error(`unknown benchmark ${id}`);
  return it;
};

export const plausible = (id: string): PlausibleItem => {
  const it = PLAUSIBLES.find((b) => b.id === id);
  if (!it) throw new Error(`unknown plausible item ${id}`);
  return it;
};

export const partText = (parts: Part[]) => parts.map((p) => (typeof p === "string" ? p : p.v)).join("");
export const partSpeech = (parts: Part[]) => parts.map((p) => (typeof p === "string" ? p : (p.r ?? p.v))).join("");
