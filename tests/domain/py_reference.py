# -*- coding: utf-8 -*-
"""Dumps reference_generators.py problems (and reference_scaffolds.py steps/memo) as JSON on stdout.

usage: python3 py_reference.py N SEED[,SEED...] [scaffold]
For every level and seed: N problems from gen(random.Random(seed)), in order.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference"))

import json  # noqa: E402
import random  # noqa: E402

import reference_generators as G  # noqa: E402

n = int(sys.argv[1])
seeds = [int(x) for x in sys.argv[2].split(",")]
with_scaffold = len(sys.argv) > 3 and sys.argv[3] == "scaffold"
if with_scaffold:
    import reference_scaffolds as S


def enc(v):
    return {"quotient": v[0], "remainder": v[1]} if isinstance(v, tuple) else v


out = {"levels": {}}
for lv in G.LEVELS:
    lid, gen = lv[0], lv[-1]
    per = {}
    for seed in seeds:
        r = random.Random(seed)
        rows = []
        for _ in range(n):
            q, a = gen(r)
            if with_scaffold:
                s = S.scaffold(lid, q)
                rows.append([q, a, s["kind"], [enc(x) for x in s["steps"]], s["memo"]])
            else:
                rows.append([q, a])
        per[str(seed)] = rows
    out["levels"][lid] = per

r = random.Random(seeds[0])
xs = [1, 2, 3, 4, 5]
out["rng"] = {
    "seed": seeds[0],
    "random": [r.random() for _ in range(3)],
    "randint": [r.randint(1, 9999) for _ in range(3)],
    "choice": [r.choice([1, 2, 3, 4, 5, 6, 7]) for _ in range(3)],
    "shuffle": (r.shuffle(xs), xs)[1],
}
json.dump(out, sys.stdout, ensure_ascii=False)
