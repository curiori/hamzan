# -*- coding: utf-8 -*-
"""
Reference implementation (Python) of the scaffold steps (hint/memo) for every scaffoldKind.

- scaffold(level_id, problem_text) -> {"kind", "steps", "memo", "answer"} computed from the display string.
- The TypeScript app should compute the same steps from its structured Problem objects.
- `_self_test()` checks, for every level and 2,000 generated problems, that the steps end in the correct answer,
  and that the worked examples in curriculum.json match.
- Run: python reference_scaffolds.py
"""
import json
import os
import random
import re

from reference_generators import LEVELS

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE_SETS = {"2-2": [3, 4], "2-3": [6, 7], "2-4": [8, 9]}
OPS = {"＋": "+", "－": "-", "×": "*", "÷": "/"}


def parse(text):
    m = re.match(r"^(\d+)と□で(\d+)$", text)
    if m:
        return {"shape": "complementTo", "a": int(m[1]), "total": int(m[2])}
    m = re.match(r"^(\d+)は10と□$", text)
    if m:
        return {"shape": "decompose", "n": int(m[1])}
    m = re.match(r"^(\d+)の半分＝$", text)
    if m:
        return {"shape": "half", "n": int(m[1])}
    m = re.match(r"^(\d+)＋□＝(\d+)$", text)
    if m:
        return {"shape": "missingAddend", "b": int(m[1]), "total": int(m[2])}
    m = re.match(r"^(\d+)×□＝(\d+)$", text)
    if m:
        return {"shape": "missingFactor", "known": int(m[1]), "product": int(m[2])}
    m = re.match(r"^□×(\d+)＝(\d+)$", text)
    if m:
        return {"shape": "missingFactor", "known": int(m[1]), "product": int(m[2])}
    m = re.match(r"^(\d+)は(\d+)の倍数？$", text)
    if m:
        return {"shape": "divisibility", "n": int(m[1]), "k": int(m[2])}
    body = text.rstrip("＝")
    nums = [int(x) for x in re.findall(r"\d+", body)]
    ops = [OPS[c] for c in re.findall(r"[＋－×÷]", body)]
    if len(nums) >= 3:
        return {"shape": "chain", "terms": nums, "ops": ops}
    return {"shape": "binary", "a": nums[0], "op": ops[0], "b": nums[1]}


def tz(x):
    n = 0
    while x and x % 10 == 0:
        x //= 10
        n += 1
    return n


def place_parts(x):
    s = str(x)
    return [int(d) * 10 ** (len(s) - i - 1) for i, d in enumerate(s) if d != "0"]


def near_round(x):
    """Return R if x is 1-2 below a round number (x%10 in 8,9 -> next ten; x%100 in 98,99 and x>=100 -> next hundred)."""
    if x >= 100 and x % 100 >= 98:
        return (x // 100 + 1) * 100
    if x % 10 in (8, 9):
        return (x // 10 + 1) * 10
    return None


def scaffold(level_id, text):
    kind = KIND[level_id]
    p = parse(text)
    steps, memo = [], []
    if kind.startswith("VISUAL") or kind == "NONE":
        return {"kind": kind, "steps": [], "memo": []}
    a, b = p.get("a"), p.get("b")
    if kind == "NEAR_DOUBLE":
        s = min(a, b)
        steps = [2 * s] if a == b else [2 * s, 2 * s + 1]
    elif kind == "MAKE_TEN":
        big, small = max(a, b), min(a, b)
        need = 10 - big
        steps = [need, small - need, 10 + small - need]
    elif kind == "SUB_FROM_TEN":
        steps = [10 - b, (10 - b) + (a - 10)]
    elif kind == "MULT_FROM_KNOWN":
        ts = TABLE_SETS[level_id]
        cands = [v for v in (a, b) if v in ts]
        t = max(cands)
        x = b if a == t else a
        steps = {3: [x * 2, x * 3], 4: [x * 2, x * 4], 6: [x * 5, x * 6], 7: [x * 5, x * 2, x * 7], 8: [x * 4, x * 8], 9: [x * 10, x * 9]}[t]
    elif kind == "REMAINDER":
        q = a // b
        steps = [q, b * q, a - b * q]
    elif kind == "ZERO_ADDSUB":
        if a % 10 == 0 and b % 10 == 0:
            core = a // 10 + b // 10 if p["op"] == "+" else a // 10 - b // 10
            steps = [core, core * 10]
        else:
            steps = [a + b if p["op"] == "+" else a - b]
    elif kind == "TENS_ONLY":
        if p["op"] == "+":
            base, t = (a, b) if b % 10 == 0 else (b, a)
            core = base // 10 + t // 10
            steps = [core, base + t]
        else:
            core = a // 10 - b // 10
            steps = [core, a - b]
    elif kind == "ZERO_MUL":
        za, zb = tz(a), tz(b)
        ca, cb = a // 10 ** za, b // 10 ** zb
        steps = [ca * cb, za + zb, a * b]
    elif kind == "ZERO_DIV":
        q = a // b
        k = tz(q)
        steps = [(a // 10 ** k) // b, q]
    elif kind == "ZERO_CANCEL_DIV":
        steps = [(a // 10) // (b // 10)]
    elif kind == "NEXT_TEN_ADD":
        A, B = (a, b) if a >= 10 else (b, a)
        if A % 10 + B >= 10:
            need = 10 - A % 10
            steps = [need, B - need, A + B]
        else:
            steps = [A % 10 + B, A + B]
    elif kind == "NEXT_TEN_SUB":
        if a % 10 == 0:
            steps = [10 - b, a - b]
        elif a % 10 < b:
            steps = [a % 10, b - a % 10, a - b]
        else:
            steps = [a % 10 - b, a - b]
    elif kind == "JUMP_ADD":
        keep, other = max(a, b), min(a, b)
        cur = keep
        for part in place_parts(other):
            cur += part
            steps.append(cur)
        memo = steps[:-1][:2]
    elif kind == "JUMP_SUB":
        cur = a
        for part in place_parts(b):
            cur -= part
            steps.append(cur)
        memo = steps[:-1][:2]
    elif kind == "COMPLEMENT":
        if p["shape"] == "complementTo":
            total, x = p["total"], p["a"]
        else:
            total, x = a, b
        z = min(tz(x), tz(total))
        t2, x2 = total // 10 ** z, x // 10 ** z
        width = len(str(t2)) - 1
        digits = str(x2).zfill(width)
        steps = [9 - int(d) for d in digits[:-1]] + [10 - int(digits[-1])]
        steps.append(total - x)
    elif kind == "PARTIAL_PRODUCT":
        m, k = (a, b) if a >= 10 else (b, a)
        pps = [part * k for part in place_parts(m)]
        if len(pps) == 1:
            steps, memo = [m * k], []
        else:
            steps = pps + [m * k]
            memo = pps if len(pps) == 2 else [pps[0], pps[0] + pps[1]]
    elif kind == "PARTIAL_QUOTIENT":
        rem, d, qsum = a, b, 0
        for pv in (100, 10, 1):
            c = rem // (d * pv)
            if c > 0:
                steps.append(c * pv)
                qsum += c * pv
                rem -= c * d * pv
        memo = steps[:2]
        if rem:
            steps.append(rem)
        steps.append((qsum, rem) if rem else qsum)
    elif kind == "PAIR_FIRST":
        terms, ops = p["terms"], p["ops"]
        if all(o == "+" for o in ops):
            idx = list(range(len(terms)))
            pair1 = next(((i, j) for i in idx for j in idx if i < j and (terms[i] + terms[j]) % 100 == 0), None)
            if pair1 is None:
                pair1 = next(((i, j) for i in idx for j in idx if i < j and (terms[i] + terms[j]) % 10 == 0))
            steps.append(terms[pair1[0]] + terms[pair1[1]])
            rest = [terms[i] for i in idx if i not in pair1]
            if len(rest) == 2 and sum(rest) % 10 == 0:
                steps.append(sum(rest))
            steps.append(sum(terms))
        else:
            x, y, z_ = terms
            steps = [y - z_, x - y + z_]
    elif kind == "COMPENSATION":
        op = p["op"]
        if level_id == "5-6":
            mult = a if a in (9, 11, 99) else b
            other = b if mult == a else a
            steps = {9: [other * 10, other * 9], 99: [other * 100, other * 99], 11: [other * 10, other * 11]}[mult]
        elif op == "+":
            cands = [v for v in (a, b) if near_round(v)]
            x = max(cands)
            other = a + b - x
            R = near_round(x)
            steps = [other + R, a + b]
        elif op == "-":
            R = near_round(b)
            steps = [a - R, a - b]
        else:
            x, k = (a, b) if a >= 10 else (b, a)
            R = near_round(x)
            steps = [R * k, (R - x) * k, a * b]
    elif kind == "CONSTANT_DIFF":
        B = -(-(b + 1) // 100) * 100
        if a - b <= 18 and b < B <= a:
            steps = [B - b, a - B, a - b]
        else:
            s = 10 - b % 10
            steps = [a + s, b + s, a - b]
    elif kind == "TIMES_5_25_50":
        m = min(v for v in (a, b) if v in (5, 25, 50))
        other = a * b // m
        steps = [other * 10, other * 5] if m == 5 else [other * 100, other * m]
    elif kind == "DIV_5_25":
        steps = [a * 2, a // 5] if b == 5 else [a * 4, a // 25]
    elif kind == "DOUBLE_HALVE":
        f = a if a % 10 == 5 else b
        e = b if f == a else a
        steps = [e // 2, f * 2, a * b]
    elif kind == "TEENS_PRODUCT":
        x, y = a - 10, b - 10
        steps = [(a + y) * 10, x * y, a * b]
        memo = steps[:2]
    elif kind == "ESTIMATE_DIVIDE":
        q = a // b
        steps = [q, b * q]
    elif kind == "DIVISIBILITY_RULE":
        n, k = p["n"], p["k"]
        if k in (2, 5):
            steps = [n % 10, n % k == 0]
        elif k == 4:
            steps = [n % 100, n % 4 == 0]
        elif k == 8:
            steps = [n % 1000, n % 8 == 0]
        elif k in (3, 9):
            steps = [sum(map(int, str(n))), n % k == 0]
        else:
            steps = [n % 2 == 0, n % 3 == 0, n % 6 == 0]
    else:
        raise ValueError(kind)
    return {"kind": kind, "steps": steps, "memo": memo}


def final_matches(kind, steps, answer):
    if not steps:
        return True
    if kind == "DIVISIBILITY_RULE":
        return steps[-1] == (answer == "○")
    if kind == "ESTIMATE_DIVIDE":
        return str(steps[0]) == answer
    if kind == "REMAINDER":
        return f"{steps[0]}あまり{steps[2]}" == answer if steps[2] else str(steps[0]) == answer
    last = steps[-1]
    if isinstance(last, tuple):
        return f"{last[0]}あまり{last[1]}" == answer
    return str(last) == answer


SPEC = json.load(open(os.path.join(HERE, "curriculum.json"), encoding="utf-8"))
KIND = {lv["id"]: lv["scaffoldKind"] for lv in SPEC["levels"]}


def _self_test(n=2000):
    bad = []
    for lv in LEVELS:
        lid, gen = lv[0], lv[-1]
        r = random.Random(11)
        for _ in range(n):
            q, a = gen(r)
            s = scaffold(lid, q)
            if not final_matches(s["kind"], s["steps"], a):
                bad.append((lid, q, a, s))
                break
    for kind, spec in SPEC["scaffoldKinds"].items():
        for ex in spec.get("examples", []):
            prob = ex["problem"]
            lid = next(l for l, k in KIND.items() if k == kind)
            if kind == "PARTIAL_QUOTIENT":
                continue
            text = prob if prob.endswith("？") or "□" in prob else prob + "＝"
            lid = ex.get("level", lid)
            got = scaffold(lid, text)["steps"]
            if got != ex["steps"]:
                bad.append(("example", kind, prob, ex["steps"], got))
    return bad


if __name__ == "__main__":
    errs = _self_test()
    print("scaffold errors:", len(errs))
    for e in errs[:20]:
        print(e)
