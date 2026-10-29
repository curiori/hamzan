// Shared helpers for the hamzan domain tests (run with bun).
import curriculum from "../../src/domain/curriculum.json";
import type { HintLine, StepValue } from "../../src/domain/problem.ts";

export const LEVELS = curriculum.levels;
export const SCAFFOLD_KINDS = curriculum.scaffoldKinds as unknown as Record<
  string,
  { hint?: string; examples?: { level?: string; problem: string; steps: unknown[]; memo?: number[] }[] }
>;
export const KIND: Record<string, string> = Object.fromEntries(LEVELS.map((l) => [l.id, l.scaffoldKind]));

export class Checker {
  checks = 0;
  fails = 0;
  private shown = new Map<string, number>();
  constructor(readonly name: string) {}
  /** records one check; prints the first few failures per label */
  ok(cond: unknown, label: string, detail?: () => string): boolean {
    this.checks++;
    if (cond) return true;
    this.fails++;
    const n = (this.shown.get(label) ?? 0) + 1;
    this.shown.set(label, n);
    if (n <= 5) console.log(`  FAIL [${label}] ${detail ? detail() : ""}`);
    return false;
  }
  finish(): never {
    const status = this.fails === 0 ? "PASS" : "FAIL";
    console.log(`\n${status} ${this.name}: ${this.checks - this.fails}/${this.checks} checks passed${this.fails ? `, ${this.fails} failed` : ""}`);
    process.exit(this.fails === 0 ? 0 : 1);
  }
}

/** Arithmetic on display strings: ＋－×÷ with precedence and （）. */
export function evalArith(src: string): number {
  const s = src
    .replace(/＋/g, "+")
    .replace(/－/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, "");
  let i = 0;
  const factor = (): number => {
    if (s[i] === "(") {
      i++;
      const v = expr();
      if (s[i++] !== ")") throw new Error(`missing ) in ${src}`);
      return v;
    }
    const m = /^\d+/.exec(s.slice(i));
    if (!m) throw new Error(`bad expression "${src}" at ${i}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const term = (): number => {
    let v = factor();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const r = factor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const v = expr();
  if (i !== s.length) throw new Error(`trailing input in "${src}"`);
  return v;
}

/** Answer check on the display string only, like reference_generators.py _self_test (plus: canonical, non-negative, exact ÷). */
export function selfTestAnswer(q: string, a: string): boolean {
  try {
    if (a.includes("あまり")) {
      const m = /^(\d+)÷(\d+)＝$/.exec(q);
      if (!m || !/^\d+あまり\d+$/.test(a)) return false;
      const n = Number(m[1]);
      const d = Number(m[2]);
      const [qq, mm] = a.split("あまり").map(Number);
      return qq * d + mm === n && mm > 0 && mm < d;
    }
    if (a === "○" || a === "×") {
      const m = /^(\d+)は(\d+)の倍数？$/.exec(q);
      if (!m) return false;
      return (Number(m[1]) % Number(m[2]) === 0) === (a === "○");
    }
    if (!/^(0|[1-9]\d*)$/.test(a)) return false;
    const ans = Number(a);
    if (q.includes("□")) {
      let m = /^(\d+)と□で(\d+)$/.exec(q);
      if (m) return Number(m[1]) + ans === Number(m[2]);
      m = /^(\d+)は10と□$/.exec(q);
      if (m) return 10 + ans === Number(m[1]);
      const parts = q.replace("□", a).split("＝");
      return parts.length === 2 && evalArith(parts[0]) === evalArith(parts[1]);
    }
    if (q.includes("の半分")) {
      const m = /^(\d+)の半分＝$/.exec(q);
      return !!m && Number(m[1]) === 2 * ans;
    }
    const m = /^(.+)＝$/.exec(q);
    if (!m) return false;
    const v = evalArith(m[1]);
    return Number.isInteger(v) && v === ans;
  } catch {
    return false;
  }
}

/** reference_scaffolds.py final_matches */
export function finalMatches(kind: string, steps: StepValue[], answer: string): boolean {
  if (!steps.length) return true;
  const last = steps[steps.length - 1];
  if (kind === "DIVISIBILITY_RULE") return last === (answer === "○");
  if (kind === "ESTIMATE_DIVIDE") return String(steps[0]) === answer;
  if (kind === "REMAINDER") return steps[2] ? `${steps[0]}あまり${steps[2]}` === answer : String(steps[0]) === answer;
  if (typeof last === "object") return `${last.quotient}あまり${last.remainder}` === answer;
  return String(last) === answer;
}

/** "[7×5＝ □0] [□0 ＋ □1 ＝ □2]" */
export function renderLines(lines: HintLine[]): string {
  return lines.map((ln) => `[${ln.map((t) => (t.t === "text" ? t.v : `□${t.step}`)).join(" ")}]`).join(" ");
}

export type PyRow = [string, string] | [string, string, string, StepValue[], number[]];
export interface PyReference {
  levels: Record<string, Record<string, PyRow[]>>;
  rng: { seed: number; random: number[]; randint: number[]; choice: number[]; shuffle: number[] };
}

/** runs py_reference.py (reference_generators.py / reference_scaffolds.py) with python3, else python; null when neither runs */
export function pythonReference(n: number, seeds: number[], withScaffold: boolean): PyReference | null {
  const rest = ["py_reference.py", String(n), seeds.join(","), ...(withScaffold ? ["scaffold"] : [])];
  // PYTHONUTF8: Windows writes stdout in the ANSI code page by default, which garbles the Japanese display strings
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" };
  for (const python of ["python3", "python"]) {
    let res: ReturnType<typeof Bun.spawnSync>;
    try {
      res = Bun.spawnSync([python, ...rest], { cwd: import.meta.dir, env });
    } catch (e) {
      console.log(`  ${python} not available: ${String(e)}`);
      continue;
    }
    if (res.exitCode !== 0) {
      console.log(`  ${python} failed: ${res.stderr.toString().slice(0, 500)}`);
      continue;
    }
    return JSON.parse(res.stdout.toString()) as PyReference;
  }
  return null;
}
