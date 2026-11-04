import { describe, expect, test } from "bun:test";
import { buildCourse, COURSE, MANIFEST, SOURCES, shippedIdErrors, validateCourse, type CourseManifest, type ShippedIds } from "../../src/course/course";
import { ALL_LEVELS, COURSE_ERROR_TYPES, displayText, levelLabel, levelName, levelRefErrors, stageName, stageNo } from "../../src/course/levels";
import { KID_LEVEL_NAME, KID_STAGE_NAME } from "../../src/i18n/ja";
import { JSPEC } from "../../src/juku/spec";
import shipped from "./shipped-ids.json";

const manifest = (): CourseManifest => JSON.parse(JSON.stringify(MANIFEST));
/** the ids children's records may already hold */
const SHIPPED: ShippedIds = shipped;

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

  test("a level a text names keeps its number after the level is renamed", () => {
    const rn = (id: string) => (id === "frac-reduce" ? "frac-simplify" : id);
    const m = { ...manifest(), renamedLevels: { ...MANIFEST.renamedLevels, "frac-reduce": "frac-simplify" }, levelIdsEverUsed: [...MANIFEST.levelIdsEverUsed, "frac-simplify"] };
    const sources = {
      stages: SOURCES.stages.map((s) => ({ ...s, levelIds: s.levelIds.map(rn), stageCheck: { ...s.stageCheck, levels: s.stageCheck.levels.map(rn) } })),
      levels: SOURCES.levels.map((l) => ({ ...l, id: rn(l.id), prerequisites: l.prerequisites.map(rn) })),
    };
    expect(validateCourse(m, sources)).toEqual([]);
    const renamed = buildCourse(m, sources);
    expect(displayText("{frac-reduce}（約分）や{frac-mixed}", renamed)).toBe("5-2（約分）や5-1");
    expect(levelRefErrors("{frac-reduce}", renamed)).toEqual([]);
  });

  test("every level a shown text names is a level of the course", () => {
    const shown = [...COURSE.levels.map((l) => l.example), ...COURSE_ERROR_TYPES.map((t) => t.remedy), ...Object.values(JSPEC.remedyAddendum)];
    expect(shown.flatMap((t) => levelRefErrors(t))).toEqual([]);
    expect(levelRefErrors("{nowhere}の問題").join("\n")).toContain("nowhere");
    const stage6 = COURSE.stage[6].levelIds.filter((id) => id !== "dec-divide");
    const noDivide = buildCourse({ ...manifest(), retiredLevels: ["dec-divide"], stages: MANIFEST.stages.map((s) => (s.id === 6 ? { id: 6, levels: stage6 } : s)) }, SOURCES);
    expect(levelRefErrors("{frac-mixed}〜{dec-divide}の問題", noDivide).join("\n")).toContain("dec-divide");
    // a level written as numbers that the course retired: its number now names another level
    const stage3 = COURSE.stage[3].levelIds.filter((id) => id !== "3-8");
    const no38 = buildCourse({ ...manifest(), retiredLevels: ["3-8"], stages: MANIFEST.stages.map((s) => (s.id === 3 ? { id: 3, levels: stage3 } : s)) }, SOURCES);
    expect(levelRefErrors("0-4、3-8、4-7を短く復習", no38).join("\n")).toContain("3-8");
    expect(levelRefErrors("2026-11-04 と 0.5-1", no38)).toEqual([]);
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

  test("a renamed or retired id stays recorded as used", () => {
    const dropped = manifest();
    dropped.levelIdsEverUsed = dropped.levelIdsEverUsed.filter((id) => id !== "6-1");
    expect(validateCourse(dropped).join("\n")).toContain("6-1");
    const retiredStage = manifest();
    retiredStage.retiredStages = [42];
    expect(validateCourse(retiredStage).join("\n")).toContain("42");
  });

  test("course.json keeps every id that shipped, so trimming it cannot free an id for reuse", () => {
    expect(shippedIdErrors(MANIFEST, SHIPPED)).toEqual([]);
    // an old id taken out of both lists, ready to be given to another level
    const freed = manifest();
    delete freed.renamedLevels["6-1"];
    freed.levelIdsEverUsed = freed.levelIdsEverUsed.filter((id) => id !== "6-1");
    expect(shippedIdErrors(freed, SHIPPED).join("\n")).toContain("6-1");
    // the numbered ids of the 塾 build cleaned away as leftovers
    const cleaned = manifest();
    cleaned.renamedLevels = {};
    cleaned.levelIdsEverUsed = cleaned.levelIdsEverUsed.filter((id) => !/^[6-9]-\d+$/.test(id));
    expect(shippedIdErrors(cleaned, SHIPPED).join("\n")).toContain("9-6");
    expect(shippedIdErrors({ ...manifest(), retiredLevels: [] }, { ...SHIPPED, retiredLevels: ["est-mix"] }).join("\n")).toContain("est-mix");
  });

  test("the copy of shipped ids has every id of course.json (add new ids to tests/course/shipped-ids.json too)", () => {
    expect(MANIFEST.levelIdsEverUsed.filter((id) => !SHIPPED.levelIdsEverUsed.includes(id))).toEqual([]);
    expect(MANIFEST.stageIdsEverUsed.filter((id) => !SHIPPED.stageIdsEverUsed.includes(id))).toEqual([]);
    expect(Object.entries(MANIFEST.renamedLevels).filter(([from, to]) => SHIPPED.renamedLevels[from] !== to)).toEqual([]);
    expect(MANIFEST.retiredLevels.filter((id) => !SHIPPED.retiredLevels.includes(id))).toEqual([]);
    expect(MANIFEST.retiredStages.filter((id) => !SHIPPED.retiredStages.includes(id))).toEqual([]);
  });
});
