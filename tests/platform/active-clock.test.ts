import { describe, expect, test } from "bun:test";
import { RULE_NUMBERS } from "../../src/domain/spec";
import { backgroundMs, commitItem, createClock, isInterrupted, itemElapsedMs, liveMs, pauseFor, resumeFor, startItem, warmupLeftMs } from "../../src/platform/active-clock";

// createClock(0) starts the first item after the 150 ms grace period, at 150.
describe("active clock", () => {
  test("pause plus background is subtracted once", () => {
    let c = createClock(0);
    c = pauseFor(c, "user", 300);
    c = pauseFor(c, "background", 500);
    c = resumeFor(c, "background", 3500);
    c = resumeFor(c, "user", 4000);
    // the web prototype recorded 0 here: (300 - 150) + (6000 - 4000) of real thinking time
    expect(commitItem(c, 6000).latencyMs).toBe(2150);
  });

  test("pause only and background only are each subtracted", () => {
    let paused = pauseFor(createClock(0), "user", 300);
    paused = resumeFor(paused, "user", 4000);
    expect(itemElapsedMs(paused, 6000)).toBe(2150);
    let hidden = pauseFor(createClock(0), "background", 300);
    hidden = resumeFor(hidden, "background", 3300);
    expect(itemElapsedMs(hidden, 5300)).toBe(2150);
  });

  test("time stays frozen while paused", () => {
    const c = pauseFor(createClock(0), "user", 1150);
    expect(itemElapsedMs(c, 1150)).toBe(1000);
    expect(itemElapsedMs(c, 9000)).toBe(1000);
  });

  test("a pause that began during the grace period only counts from the item start", () => {
    let c = pauseFor(createClock(0), "user", 50);
    c = resumeFor(c, "user", 1000);
    expect(itemElapsedMs(c, 2000)).toBe(1000);
  });

  test("pausing twice for the same reason changes nothing", () => {
    const once = pauseFor(createClock(0), "user", 300);
    expect(pauseFor(once, "user", 900)).toEqual(once);
    expect(resumeFor(createClock(0), "user", 900)).toEqual(createClock(0));
  });

  test("more than backgroundLimitSec in the background interrupts the set", () => {
    const limitMs = RULE_NUMBERS.backgroundLimitSec * 1000;
    let c = pauseFor(createClock(0), "background", 1000);
    c = resumeFor(c, "background", 1000 + limitMs - 1);
    expect(isInterrupted(c, 70000, RULE_NUMBERS.backgroundLimitSec)).toBe(false);
    c = pauseFor(c, "background", 80000);
    expect(backgroundMs(c, 80002)).toBe(limitMs + 1);
    expect(isInterrupted(c, 80002, RULE_NUMBERS.backgroundLimitSec)).toBe(true);
  });

  test("commitItem adds the latency to the set's active total and startItem begins the next item", () => {
    const first = commitItem(createClock(0), 1150);
    expect(first.latencyMs).toBe(1000);
    const next = startItem(first.clock, 2000);
    const second = commitItem(next, 2650);
    expect(second.latencyMs).toBe(500);
    expect(second.clock.activeTotal).toBe(1500);
  });

  test("live time adds the open item only while a problem is asked, and never the paused time", () => {
    const c = createClock(0);
    expect(liveMs(c, 1150, true)).toBe(1000);
    expect(liveMs(c, 1150, false)).toBe(0);
    const c2 = pauseFor(c, "user", 1150);
    expect(liveMs(c2, 3150, true)).toBe(1000);
    const c3 = resumeFor(c2, "user", 3150);
    expect(liveMs(c3, 4150, true)).toBe(2000);
  });

  test("the warm-up time left leaves out the background and stops at zero", () => {
    const c = createClock(0);
    expect(warmupLeftMs(c, 20150, true, 60)).toBe(40000);
    const c2 = pauseFor(c, "background", 20150);
    expect(warmupLeftMs(c2, 50150, true, 60)).toBe(40000);
    const c3 = resumeFor(c2, "background", 50150);
    expect(warmupLeftMs(c3, 100150, true, 60)).toBe(0);
  });
});
