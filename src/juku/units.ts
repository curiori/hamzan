// Units for stage 7 (and the answers of stages 8–9): their written form, reading, and size.
// A unit's size is a power of ten of its family's base unit (m, g, m², cm³), so converting
// is moving the decimal point. Time is counted in sixties and handled on its own.

export type UnitFamily = "length" | "weight" | "area" | "volume";

export interface UnitDef {
  id: string;
  /** written form, e.g. "km", "m²" */
  text: string;
  /** reading for screen readers */
  speech: string;
  family: UnitFamily;
  /** 1 unit = 10^pow base units */
  pow: number;
}

const U = (id: string, speech: string, family: UnitFamily, pow: number): UnitDef => ({ id, text: id, speech, family, pow });

export const UNITS: Record<string, UnitDef> = Object.fromEntries(
  [
    U("km", "キロメートル", "length", 3),
    U("m", "メートル", "length", 0),
    U("cm", "センチメートル", "length", -2),
    U("mm", "ミリメートル", "length", -3),
    U("t", "トン", "weight", 6),
    U("kg", "キログラム", "weight", 3),
    U("g", "グラム", "weight", 0),
    U("km²", "へいほうキロメートル", "area", 6),
    U("ha", "ヘクタール", "area", 4),
    U("a", "アール", "area", 2),
    U("m²", "へいほうメートル", "area", 0),
    U("cm²", "へいほうセンチメートル", "area", -4),
    U("mm²", "へいほうミリメートル", "area", -6),
    U("kL", "キロリットル", "volume", 6),
    U("m³", "りっぽうメートル", "volume", 6),
    U("L", "リットル", "volume", 3),
    U("dL", "デシリットル", "volume", 2),
    U("mL", "ミリリットル", "volume", 0),
    U("cm³", "りっぽうセンチメートル", "volume", 0),
  ].map((u) => [u.id, u]),
);

export function unit(id: string): UnitDef {
  const u = UNITS[id];
  if (!u) throw new Error(`unknown unit ${id}`);
  return u;
}

/** How many places the point moves from `from` to `to` (1.2km → m: 3). */
export function unitShift(from: string, to: string): number {
  const a = unit(from);
  const b = unit(to);
  if (a.family !== b.family) throw new Error(`${from} and ${to} measure different things`);
  return a.pow - b.pow;
}

/** "1km＝1000m": the bigger unit first. */
export function unitFact(x: string, y: string): string {
  const k = unitShift(x, y);
  const [big, small] = k >= 0 ? [x, y] : [y, x];
  return `1${big}＝${10 ** Math.abs(k)}${small}`;
}

/** A word or unit written in kanji, with its reading shown above it (ruby). */
export interface Label {
  v: string;
  r?: string;
}

export const TIME = {
  h: { v: "時間", r: "じかん" },
  m: { v: "分", r: "ふん" },
  s: { v: "秒", r: "びょう" },
} as const satisfies Record<string, Label>;

/** 歩合: 割・分・厘 */
export const WARI = {
  wari: { v: "割", r: "わり" },
  bu: { v: "分", r: "ぶ" },
  rin: { v: "厘", r: "りん" },
} as const satisfies Record<string, Label>;

export type SpeedUnit = "kmh" | "mmin" | "msec";

/** 時速 km、分速 m、秒速 m */
export const SPEED: Record<SpeedUnit, { name: Label; unit: string; speech: string; perHour: number; metres: number }> = {
  kmh: { name: { v: "時速", r: "じそく" }, unit: "km", speech: "じそく", perHour: 1, metres: 1000 },
  mmin: { name: { v: "分速", r: "ふんそく" }, unit: "m", speech: "ふんそく", perHour: 60, metres: 1 },
  msec: { name: { v: "秒速", r: "びょうそく" }, unit: "m", speech: "びょうそく", perHour: 3600, metres: 1 },
};

/** Speech for a unit written in a problem or answer (units, time words, 歩合, ％). */
export function unitSpeech(text: string, ruby?: string): string {
  if (ruby) return ruby;
  if (UNITS[text]) return UNITS[text].speech;
  if (text === "％") return "パーセント";
  if (text === "°") return "ど";
  return text;
}
