import { describe, expect, test } from "bun:test";
import type { PlayContext, PlayPlan } from "@/session/requests";
import { START_GUARD_MS, usePlayStore } from "@/state/play-store";
import type { SetSummary } from "@/state/types";

const plan = (key: string) => ({ req: { key }, ctx: {} }) as unknown as PlayPlan;

describe("play store", () => {
  test("a second start right after the first is ignored, a later one starts", () => {
    const a = plan("a");
    const b = plan("b");
    expect(usePlayStore.getState().begin(a, 10_000)).toBe(true);
    expect(usePlayStore.getState().begin(b, 10_000 + START_GUARD_MS - 1)).toBe(false);
    expect(usePlayStore.getState().plan).toBe(a);
    expect(usePlayStore.getState().begin(b, 10_000 + START_GUARD_MS)).toBe(true);
    expect(usePlayStore.getState().plan).toBe(b);
  });

  test("the next set keeps the last result on screen while it leaves, but is not recorded yet", () => {
    const summary = { levelId: "0-1" } as unknown as SetSummary;
    const ctx = { kind: "extra" } as unknown as PlayContext;
    expect(usePlayStore.getState().begin(plan("c"), 50_000)).toBe(true);
    usePlayStore.getState().showResult(summary, ctx);
    expect(usePlayStore.getState().recorded).toBe(true);

    expect(usePlayStore.getState().begin(plan("d"), 60_000)).toBe(true);
    expect(usePlayStore.getState().summary).toBe(summary);
    expect(usePlayStore.getState().resultCtx).toBe(ctx);
    expect(usePlayStore.getState().recorded).toBe(false);
  });
});
