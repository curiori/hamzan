import { describe, expect, test } from "bun:test";
import { COURSE, MANIFEST, SOURCES, validateCourse, type CourseManifest } from "../../src/course/course";
import { ALL_LEVELS, displayText, levelLabel, levelName, stageName, stageNo } from "../../src/course/levels";
import { KID_LEVEL_NAME, KID_STAGE_NAME } from "../../src/i18n/ja";

const manifest = (): CourseManifest => JSON.parse(JSON.stringify(MANIFEST));

describe("the one course", () => {
  test("ten stages in the planned order, numbered by their position", () => {
    expect(COURSE.stages.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 6, 8, 7, 5, 9]);
    expect(COURSE.stages.map((s) => s.no)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(COURSE.version).toBe(2);
  });

  test("89 levels whose order is their position in the course", () => {
    expect(ALL_LEVELS.length).toBe(89);
    expect(ALL_LEVELS.map((l) => l.order)).toEqual(ALL_LEVELS.map((_, i) => i));
    expect(ALL_LEVELS.every((l) => COURSE.stage[l.stage].levelIds.includes(l.id))).toBe(true);
    expect(COURSE.stage[7].levelIds).toEqual(["unit-length-weight", "unit-area", "unit-volume", "unit-time", "unit-speed", "unit-trip", "unit-mix"]);
  });

  test("the numbers on screen come from positions, not from ids", () => {
    expect(levelLabel("frac-reduce")).toBe("5-2");
    expect(levelLabel("pi-table")).toBe("6-1");
    expect(levelLabel("unit-time")).toBe("7-4");
    expect(levelLabel("5-4")).toBe("8-4");
    expect(levelLabel("3-14")).toBe("3-14");
    expect(levelLabel("est-mix")).toBe("9-6");
    expect(stageNo(5)).toBe(8);
    expect(stageNo(6)).toBe(5);
    expect(stageNo(8)).toBe(6);
  });

  test("level references in texts read with today's numbers", () => {
    expect(displayText("5-1〜5-10、4-6、4-11の問題")).toBe("8-1〜8-10、4-6、4-11の問題");
    expect(displayText("{frac-reduce}（約分）や{frac-mixed}（仮分数と帯分数）")).toBe("5-2（約分）や5-1（仮分数と帯分数）");
    expect(displayText("0-4、3-8、4-7を短く復習")).toBe("0-4、3-8、4-7を短く復習");
    expect(displayText("2026-11-04 と 0.5-1")).toBe("2026-11-04 と 0.5-1");
    expect(displayText("{gone}")).toBe("{gone}");
    expect(levelSpecExample("est-mix")).toBe("9-1〜9-5の問題");
  });

  test("every level and stage has a child's name, and level names carry no stage number", () => {
    for (const l of ALL_LEVELS) {
      expect(KID_LEVEL_NAME[l.id]).toBeTruthy();
      expect(KID_LEVEL_NAME[l.id]).not.toMatch(/ステージ\s*\d/);
    }
    for (const s of COURSE.stages) expect(KID_STAGE_NAME[s.id]).toBeTruthy();
    expect(levelName("frac-reduce")).toBe("やくぶん");
    expect(stageName(5)).toBe("じゅけんの わざ");
    expect(levelName("gone")).toBe("（いまは ない レベル）");
  });
});

const levelSpecExample = (id: string) => displayText(COURSE.level[id].example);

describe("course.json guards the ids", () => {
  test("the course is valid", () => {
    expect(validateCourse()).toEqual([]);
  });

  test("a level deleted from its spec without being retired or renamed is caught", () => {
    const sources = {
      levels: SOURCES.levels.filter((l) => l.id !== "est-mix"),
      stages: SOURCES.stages.map((s) => (s.id === 9 ? { ...s, levelIds: s.levelIds.filter((id) => id !== "est-mix") } : s)),
    };
    expect(validateCourse(MANIFEST, sources).join("\n")).toContain("est-mix");
    const retired = { ...manifest(), retiredLevels: ["est-mix"] };
    expect(validateCourse(retired, sources)).toEqual([]);
  });

  test("a rename must lead to a level of the course, and the old id must not be in use", () => {
    expect(validateCourse({ ...manifest(), renamedLevels: { ...MANIFEST.renamedLevels, "6-1": "frac-nowhere" } }).join("\n")).toContain("frac-nowhere");
    expect(validateCourse({ ...manifest(), renamedLevels: { ...MANIFEST.renamedLevels, "pi-table": "pi-shift" } }).join("\n")).toContain("pi-table");
  });

  test("prerequisites must come earlier in the course", () => {
    const order = manifest();
    order.stages = [0, 1, 2, 3, 4, 6, 8, 9, 7, 5].map((id) => ({ id }));
    expect(validateCourse(order).join("\n")).toContain("est-benchmark");
  });

  test("a retired id cannot be used again, and every id in use is recorded as used", () => {
    expect(validateCourse({ ...manifest(), retiredLevels: ["pi-table"] }).join("\n")).toContain("pi-table");
    const unlocked = manifest();
    unlocked.levelIdsEverUsed = unlocked.levelIdsEverUsed.filter((id) => id !== "est-mix");
    expect(validateCourse(unlocked).join("\n")).toContain("est-mix");
  });

  test("a stage left out of the course without being retired is caught", () => {
    const m = manifest();
    m.stages = m.stages.filter((s) => s.id !== 9);
    expect(validateCourse(m).join("\n")).toContain("ステージ 9");
  });
});
