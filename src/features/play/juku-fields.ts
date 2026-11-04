import { decLength, parseDec } from "@/juku/num";
import type { JAnswer } from "@/juku/problem";
import type { FieldDef } from "./field-set";

// Answer boxes of juku.json answers (and hint blanks): a number with a point, fraction boxes, two numbers
// with units between them, options, or ○×. Units are shown next to the boxes, never typed.

const len = (n: number) => String(n).length;

export function jDefsFor(a: JAnswer, label = "こたえ"): FieldDef[] {
  switch (a.kind) {
    case "dec": {
      const d = parseDec(a.v);
      return [{ kind: "dec", digits: d ? decLength(d) : a.v.length, label, role: "plain", suffix: a.unit?.v, suffixRuby: a.unit?.r }];
    }
    case "frac":
      return [
        ...(a.mixed ? [{ kind: "num", digits: len(a.w), label: "せいすう", role: "whole", manual: true } satisfies FieldDef] : []),
        { kind: "num", digits: len(a.n), label: "ぶんし", role: "num", manual: true },
        { kind: "num", digits: len(a.d), label: "ぶんぼ", role: "den", manual: true },
      ];
    case "pair":
      return [
        { kind: "num", digits: len(a.a), label: a.units[0].v || label, role: "a", suffix: a.units[0].v, suffixRuby: a.units[0].r },
        { kind: "num", digits: len(a.b), label: a.units[1].v || label, role: "b", suffix: a.units[1].v, suffixRuby: a.units[1].r },
      ];
    case "choice":
      return [{ kind: "choice", digits: 1, label, role: "plain", options: a.options }];
    case "tf":
      return [{ kind: "bool", digits: 1, label, role: "plain", options: a.labels }];
  }
}

/** What the child typed, in the form of the answer it is compared with. */
export function jToAnswer(vals: string[], like: JAnswer): JAnswer {
  const n = (s: string | undefined) => Number(s ?? "");
  switch (like.kind) {
    case "dec":
      return { kind: "dec", v: vals[0] ?? "", unit: like.unit };
    case "frac":
      return like.mixed ? { kind: "frac", w: n(vals[0]), n: n(vals[1]), d: n(vals[2]), mixed: true } : { kind: "frac", w: 0, n: n(vals[0]), d: n(vals[1]), mixed: false };
    case "pair":
      return { kind: "pair", a: n(vals[0]), b: n(vals[1]), units: like.units };
    case "choice":
      return { kind: "choice", i: n(vals[0]), options: like.options };
    case "tf":
      return { kind: "tf", v: vals[0] === "○", labels: like.labels };
  }
}

/** The keypad's middle key moves to the next box of a fraction or a pair ("つぎ"). */
export const hasNextBox = (defs: FieldDef[], active: number) => active < defs.length - 1 && ["whole", "num", "a"].includes(defs[active]?.role ?? "");
