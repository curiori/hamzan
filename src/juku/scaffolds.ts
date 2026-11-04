// Hints for the juku.json levels: the blanks (steps) of hint mode, the memo numbers of memo mode, and the
// lines that show them. The last step is always the answer, so filling every blank solves the problem.
// Lines use the same tokens as src/domain/scaffolds.ts: "→" separates lines and "[i]" is a blank for steps[i].
import type { HintLine, HintToken } from "@/domain/problem";
import { BENCH_NOTES, benchmark, plausible, type BenchCategory } from "./benchmarks";
import { dec, decInt, decText, decValue, divDec, gcd, mulDec, norm, reduceFrac, shiftDec, type Dec } from "./num";
import { BIG_SMALL, PI, figureFactor, jAnswer, roundTop, type JAnswer, type JProblem } from "./problem";
import { JLEVEL } from "./spec";
import { SPEED, unitShift } from "./units";

export interface JScaffold {
  kind: string;
  steps: JAnswer[];
  memo: JAnswer[];
  lines: HintLine[];
}

const num = (x: Dec | number | string): JAnswer => ({ kind: "dec", v: typeof x === "string" ? decText(dec(x)) : typeof x === "number" ? String(x) : decText(x) });

/** a part of an hour (or any n/60): a decimal when it ends, else a reduced fraction (20分 → 1/3) */
function sixtieth(mins: number): JAnswer {
  const d = divDec(decInt(mins), decInt(60));
  if (d) return num(d);
  const f = reduceFrac({ n: mins, d: 60 });
  return { kind: "frac", w: 0, n: f.n, d: f.d, mixed: false };
}

const stepText = (a: JAnswer) => (a.kind === "frac" ? `${a.n}/${a.d}` : a.kind === "dec" ? a.v : "");

function lines(template: string): HintLine[] {
  return template.split("→").map((line) =>
    line.split(/(\[\d+\])/).flatMap((part): HintToken[] => {
      const blank = /^\[(\d+)\]$/.exec(part);
      if (blank) return [{ t: "blank", step: Number(blank[1]) }];
      const v = part.trim();
      return v ? [{ t: "text", v }] : [];
    }),
  );
}

function done(kind: string, steps: JAnswer[], template: string, memo: JAnswer[] = []): JScaffold {
  return { kind, steps, memo, lines: lines(template) };
}

const opText = (o: string) => (o === "-" ? "－" : o === "+" ? "＋" : o);

/** the part of a 3.14 problem that is not 3.14: the other factor */
function otherFactor(p: Extract<JProblem, { type: "op" }>): string {
  return p.a === PI ? p.b : p.b === PI ? p.a : p.a;
}

/** a big unit → small unit fact derived from lengths, or recalled */
const AREA_FACT: Record<string, [string, number]> = {
  "m²|cm²": ["1m＝100cm → 1m²＝100×100＝[0]cm²", 10000],
  "cm²|mm²": ["1cm＝10mm → 1cm²＝10×10＝[0]mm²", 100],
  "a|m²": ["1a＝10m×10m＝[0]m²", 100],
  "ha|m²": ["1ha＝100m×100m＝[0]m²", 10000],
  "km²|m²": ["1km²＝1000m×1000m＝[0]m²", 1000000],
  "ha|a": ["1ha＝[0]a", 100],
  "km²|ha": ["1km²＝[0]ha", 100],
  "L|cm³": ["1L＝10cm×10cm×10cm＝[0]cm³", 1000],
  "m³|cm³": ["1m³＝100cm×100cm×100cm＝[0]cm³", 1000000],
  "L|dL": ["1L＝[0]dL", 10],
  "L|mL": ["1L＝[0]mL", 1000],
  "dL|mL": ["1dL＝[0]mL", 100],
  "m³|L": ["1m³＝[0]L", 1000],
  "kL|L": ["1kL＝[0]L", 1000],
  "mL|cm³": ["1mL＝[0]cm³", 1],
};

function unitHint(kind: string, p: Extract<JProblem, { type: "convert" }>, ans: JAnswer): JScaffold {
  const k = unitShift(p.from, p.to);
  // mL and cm³ are the same size: the fact is always written 1mL＝1cm³
  const big = k > 0 || (k === 0 && p.from === "mL") ? p.from : p.to;
  const small = big === p.from ? p.to : p.from;
  const factor = 10 ** Math.abs(k);
  if (kind === "UNIT_FACTOR") return done(kind, [ans], `1${big}＝${factor}${small} → ${p.v}${k >= 0 ? "×" : "÷"}${factor}＝[0]`);
  const fact = AREA_FACT[`${big}|${small}`];
  if (!fact) throw new Error(`no hint for ${big} and ${small}`);
  if (fact[1] === 1) return done(kind, [num(1), ans], `${fact[0]} → こたえ [1]`);
  return done(kind, [num(fact[1]), ans], `${fact[0]} → ${p.v}${k >= 0 ? "×" : "÷"}[0]＝[1]`);
}

function build(levelId: string, p: JProblem): JScaffold {
  const kind = JLEVEL[levelId]?.scaffoldKind;
  if (!kind) throw new Error(`unknown level ${levelId}`);
  if (kind === "NONE" || kind.startsWith("VISUAL")) return { kind, steps: [], memo: [], lines: [] };
  const ans = jAnswer(p);
  switch (kind) {
    case "FRACTION_FORM": {
      if (p.type !== "fracForm") break;
      if (p.to === "improper") return done(kind, [num(p.w * p.d + p.n), ans], `${p.d}×${p.w}＋${p.n}＝[0] → こたえ [1]`);
      return done(kind, [num(Math.floor(p.n / p.d)), num(p.n % p.d), ans], `${p.n}÷${p.d}＝[0] あまり [1] → こたえ [2]`);
    }
    case "REDUCE": {
      if (p.type !== "reduce") break;
      return done(kind, [num(gcd(p.n, p.d)), ans], `${p.n}と${p.d}を りょうほう われる いちばん おおきい かずは [0] → こたえ [1]`);
    }
    case "FRAC_DEC":
    case "EIGHTHS": {
      if (p.type === "fracToDec") {
        const unit = divDec(decInt(1), decInt(p.d)) as Dec;
        const part = mulDec(unit, decInt(p.n));
        const u = decText(unit);
        if (p.n === 1) return p.w ? done(kind, [ans], `1/${p.d}＝${u} → ${p.w}＋${u}＝[0]`) : done(kind, [ans], `1÷${p.d}＝[0]`);
        const first = `1/${p.d}＝${u} → ${u}×${p.n}＝[0]`;
        if (!p.w) return done(kind, [ans], first);
        return done(kind, [num(part), ans], `${first} → ${p.w}＋[0]＝[1]`);
      }
      if (p.type === "decToFrac") {
        const v = norm(dec(p.v));
        if (kind === "EIGHTHS") return done(kind, [num(divDec(v, dec("0.125")) as Dec), ans], `${p.v}＝0.125×[0] → こたえ [1]`);
        return done(kind, [num(v.n), ans], `${p.v}＝[0]/${10 ** v.s} → やくぶんして [1]`);
      }
      break;
    }
    case "DECIMAL_POINT": {
      if (p.type !== "op") break;
      const a = norm(dec(p.a));
      const b = norm(dec(p.b));
      const product = num(a.n * b.n);
      return done(kind, [product, num(a.s + b.s), ans], `${a.n}×${b.n}＝[0] → しょうすうてんの したは ${a.s}＋${b.s}＝[1]けた → こたえ [2]`, [product]);
    }
    case "INVERSE_FACTOR": {
      if (p.type !== "op") break;
      const m = ["0.5", "0.25", "0.125"].includes(p.b) ? p.b : p.a;
      const n = m === p.b ? p.a : p.b;
      const f = num(divDec(decInt(1), dec(m)) as Dec);
      if (p.op === "÷") return done(kind, [f, ans], `÷${m}は ×[0] → ${n}×[0]＝[1]`);
      return done(kind, [f, ans], `×${m}は ÷[0] → ${n}÷[0]＝[1]`);
    }
    case "UNIT_FACTOR":
    case "AREA_UNIT":
    case "VOLUME_UNIT":
      if (p.type !== "convert") break;
      return unitHint(kind, p, ans);
    case "TIME_60": {
      if (p.type !== "time") break;
      if (p.kind === "hToM") return done(kind, [ans], `1じかん＝60ぷん → 60×${p.a}＝[0]`);
      if (p.kind === "mToS") return done(kind, [ans], `1ぷん＝60びょう → 60×${p.a}＝[0]`);
      if (p.kind === "mToH") {
        const part = sixtieth(p.b ?? 0);
        if (p.a === "0") return done(kind, [ans], `${p.b}÷60＝[0]`);
        return done(kind, [part, ans], `${p.b}÷60＝[0] → ${p.a}＋[0]＝[1]`);
      }
      if (ans.kind !== "pair") break;
      // the pair of the answer, read as quotient and remainder of ÷60
      const qr: JAnswer = { kind: "pair", a: ans.a, b: ans.b, units: [{ v: "あまり" }, { v: "" }] };
      return done(kind, [qr], `${p.a}÷60＝[0]`);
    }
    case "SPEED_UNIT": {
      if (p.type !== "speed") break;
      const v = dec(p.v);
      if (p.from === "kmh") {
        const m = num(mulDec(v, decInt(1000)));
        const div = p.to === "mmin" ? 60 : 3600;
        return done(kind, [m, ans], `${p.v}km＝[0]m → [0]÷${div}＝[1]`, [m]);
      }
      if (p.to === "kmh") {
        const per = p.from === "mmin" ? "60" : "60×60";
        const m = num(mulDec(v, decInt(p.from === "mmin" ? 60 : 3600)));
        return done(kind, [m, ans], `${p.v}×${per}＝[0]m → [0]m＝[1]km`, [m]);
      }
      return done(kind, [ans], p.from === "mmin" ? `${p.v}÷60＝[0]` : `${p.v}×60＝[0]`);
    }
    case "SPEED_STORY": {
      if (p.type !== "trip") break;
      const timeTerm = p.mins >= 60 && p.mins % 60 === 0 ? `${p.mins / 60}じかん` : `${p.mins}ぷん`;
      if (p.su === "kmh") {
        const hours = sixtieth(p.mins);
        const memo = hours.kind === "dec" ? [hours] : [];
        if (p.ask === "dist") return done(kind, [hours, ans], `${timeTerm}＝[0]じかん → ${p.speed}×[0]＝[1]`, memo);
        if (p.ask === "speed") return done(kind, [hours, ans], `${timeTerm}＝[0]じかん → ${p.dist}÷[0]＝[1]`, memo);
        const h = divDec(dec(p.dist), dec(p.speed));
        const step = h ? num(h) : sixtieth(p.mins);
        return done(kind, [step, ans], `${p.dist}÷${p.speed}＝[0]じかん → 60×[0]＝[1]`, step.kind === "dec" ? [step] : []);
      }
      if (p.ask === "dist") return done(kind, [ans], `${p.speed}×${p.mins}＝[0]`);
      if (p.ask === "time") return done(kind, [ans], `${p.dist}÷${p.speed}＝[0]`);
      if (p.du === "km") {
        const m = num(mulDec(dec(p.dist), decInt(1000)));
        return done(kind, [m, ans], `${p.dist}km＝[0]m → [0]÷${p.mins}＝[1]`, [m]);
      }
      return done(kind, [ans], `${p.dist}÷${p.mins}＝[0]`);
    }
    case "PI_SHIFT": {
      if (p.type !== "op") break;
      const other = otherFactor(p);
      const big = p.a === "31.4" || p.a === "314" ? p.a : null;
      const d = big ? Number(p.b) : Number(other.replace(/0+$/, ""));
      const places = big === "314" ? 2 : big === "31.4" ? 1 : String(other).length - 1;
      const base = num(mulDec(dec(PI), decInt(d)));
      return done(kind, [base, ans], `3.14×${d}＝[0] → しょうすうてんを みぎへ ${places}つ → こたえ [1]`);
    }
    case "PI_SPLIT": {
      if (p.type !== "op") break;
      const k = Number(otherFactor(p));
      if (k === 25) {
        const h = num("314");
        return done(kind, [h, ans], `3.14×100＝[0] → [0]÷4＝[1]`, [h]);
      }
      const tens = Math.floor(k / 10) * 10;
      const ones = k % 10;
      const t = num(mulDec(dec(PI), decInt(tens)));
      const o = num(mulDec(dec(PI), decInt(ones)));
      return done(kind, [t, o, ans], `3.14×${tens}＝[0] → 3.14×${ones}＝[1] → [0]＋[1]＝[2]`, [t, o]);
    }
    case "PI_FACTOR": {
      if (p.type !== "piSum") break;
      const expr = p.terms
        .map((factors, i) => `${i > 0 ? opText(p.signs[i - 1]) : ""}${factors.filter((f) => f !== PI).join("×")}`)
        .join("");
      const k = num(norm(divDec(dec((ans as { v: string }).v), dec(PI)) as Dec));
      return done(kind, [k, ans], `${expr}＝[0] → 3.14×[0]＝[1]`, [k]);
    }
    case "PI_FIGURE": {
      if (p.type !== "figure") break;
      const k = num(figureFactor(p));
      if (p.fig === "circumference" && p.dia) return done(kind, [ans], `${p.r}×3.14＝[0]`);
      const expr =
        p.fig === "circleArea"
          ? `${p.r}×${p.r}`
          : p.fig === "circumference"
            ? `${p.r}×2`
            : p.fig === "sectorArea"
              ? `${p.r}×${p.r}×${p.angle}/360`
              : p.fig === "arc"
                ? `${p.r}×2×${p.angle}/360`
                : `${p.r}×${p.r}×${p.h}`;
      return done(kind, [k, ans], `${expr}＝[0] → [0]×3.14＝[1]`, [k]);
    }
    case "ESTIMATE_ROUND":
    case "ESTIMATE_DECIMAL": {
      if (p.type === "estimate") {
        const ra = roundTop(p.a);
        const rb = roundTop(p.b);
        const est = p.op === "×" ? mulDec(ra, rb) : divDec(ra, rb, 3);
        if (!est) break;
        return done(kind, [num(est), ans], `${decText(ra)}${p.op}${decText(rb)}＝[0] → いちばん ちかいのは [1]`);
      }
      if (p.type === "compare") {
        const side: JAnswer = { kind: "choice", i: decValue(dec(p.b)) > 1 ? 0 : 1, options: BIG_SMALL };
        const rule =
          p.op === "×" ? "1より おおきい かずを かけると おおきく、ちいさい かずを かけると ちいさく なる" : "1より おおきい かずで わると ちいさく、ちいさい かずで わると おおきく なる";
        return done(kind, [side, ans], `${p.b}は 1より [0] → ${rule} → こたえは [1]`);
      }
      break;
    }
  }
  throw new Error(`no hint for ${levelId}: ${JSON.stringify(p)}`);
}

export function jScaffoldOf(levelId: string, p: JProblem): JScaffold {
  return build(levelId, p);
}

export const jHintLines = (levelId: string, p: JProblem): HintLine[] => build(levelId, p).lines;

// ---------------- what the picture hints show ----------------
/** est-round: the number line between the two round numbers around v, with the middle */
export function roundingLine(v: string): { lo: string; hi: string; mid: string; v: string; answer: string } {
  const answer = roundTop(v);
  const x = dec(v);
  const t = decText(x);
  const before = t.split(".")[0].replace(/^0+/, "").length;
  const top = before ? before - 1 : -((t.split(".")[1] ?? "").search(/[1-9]/) + 1);
  const unit = shiftDec(decInt(1), top);
  const lo = mulDec(decInt(Math.floor(decValue(x) / decValue(unit) + 1e-9)), unit);
  const hi = mulDec(decInt(Math.floor(decValue(x) / decValue(unit) + 1e-9) + 1), unit);
  const mid = mulDec(mulDec(decInt(Math.floor(decValue(x) / decValue(unit) + 1e-9) * 2 + 1), unit), dec("0.5"));
  return { lo: decText(lo), hi: decText(hi), mid: decText(mid), v: t, answer: decText(answer) };
}

/** est-benchmark and est-plausible: the familiar sizes of the problem's kind of quantity */
export function benchNotes(p: JProblem): { cat: BenchCategory; notes: string[] } | null {
  if (p.type === "benchmark") return { cat: benchmark(p.item).cat, notes: BENCH_NOTES[benchmark(p.item).cat] };
  if (p.type === "plausible") return { cat: plausible(p.item).cat, notes: BENCH_NOTES[plausible(p.item).cat] };
  return null;
}

/** pi-table and pi-divide: 3.14×1〜9, and the row to look at */
export function piTable(p: JProblem): { rows: { k: number; v: string }[]; mark: number | null; shift: number } {
  const rows = Array.from({ length: 9 }, (_, i) => ({ k: i + 1, v: decText(mulDec(dec(PI), decInt(i + 1))) }));
  // the multiplier the problem is about, and how far the point moved from the table (40 → row 4, shift 1)
  let k: number | null = null;
  if (p.type === "op") k = p.op === "×" ? Number(p.a === PI ? p.b : p.a) : decValue(divDec(dec(p.a), dec(PI)) as Dec);
  if (p.type === "missing") k = decValue(divDec(dec(p.product), dec(p.known)) as Dec);
  if (k === null || !Number.isFinite(k)) return { rows, mark: null, shift: 0 };
  let shift = 0;
  let base = Math.round(k);
  while (base >= 10 && base % 10 === 0) {
    base /= 10;
    shift += 1;
  }
  return { rows, mark: base >= 1 && base <= 9 ? base : null, shift };
}

export { stepText, SPEED };
