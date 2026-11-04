import { describe, expect, test } from "bun:test";
import {
  addDec,
  cmpDec,
  dec,
  decLength,
  decText,
  decToFrac,
  divDec,
  eqDec,
  fracEq,
  fracText,
  fracToDec,
  gcd,
  improperOf,
  isReduced,
  mixedOf,
  mulDec,
  parseDec,
  powerOfTenRatio,
  reduceFrac,
  shiftDec,
  subDec,
} from "../../src/juku/num";

describe("decimals", () => {
  test("reading drops trailing zeros and accepts a missing leading zero", () => {
    expect(parseDec("15.70")).toEqual({ n: 157, s: 1 });
    expect(parseDec(".5")).toEqual({ n: 5, s: 1 });
    expect(parseDec("1200.")).toEqual({ n: 1200, s: 0 });
    expect(parseDec("007")).toEqual({ n: 7, s: 0 });
    for (const bad of ["", ".", "1.2.3", "-1", "a", "1,2"]) expect(parseDec(bad)).toBeNull();
  });

  test("written forms have no trailing zeros", () => {
    expect(decText(dec("94.20"))).toBe("94.2");
    expect(decText({ n: 2, s: 2 })).toBe("0.02");
    expect(decText({ n: 1200, s: 0 })).toBe("1200");
    expect(decText({ n: 9420, s: 2 })).toBe("94.2");
    expect(decLength(dec("21.98"))).toBe(5);
  });

  test("arithmetic stays exact", () => {
    expect(decText(mulDec(dec("3.14"), dec("7")))).toBe("21.98");
    expect(decText(mulDec(dec("0.4"), dec("0.05")))).toBe("0.02");
    expect(decText(addDec(dec("31.4"), dec("18.84")))).toBe("50.24");
    expect(decText(subDec(dec("0.3"), dec("0.1")))).toBe("0.2");
    expect(decText(shiftDec(dec("1.2"), 3))).toBe("1200");
    expect(decText(shiftDec(dec("350"), -3))).toBe("0.35");
    expect(cmpDec(dec("0.5"), dec("0.25"))).toBe(1);
    expect(eqDec(dec("15.70"), dec("15.7"))).toBe(true);
  });

  test("division gives an ending decimal or nothing", () => {
    expect(decText(divDec(dec("28.26"), dec("3.14"))!)).toBe("9");
    expect(decText(divDec(dec("15"), dec("60"))!)).toBe("0.25");
    expect(decText(divDec(dec("36000"), dec("60"))!)).toBe("600");
    expect(divDec(dec("1"), dec("3"))).toBeNull();
    expect(divDec(dec("1"), dec("0"))).toBeNull();
  });

  test("a moved decimal point is a power of ten apart", () => {
    expect(powerOfTenRatio(dec("150"), dec("1.5"))).toBe(2);
    expect(powerOfTenRatio(dec("0.8"), dec("8000"))).toBe(-4);
    expect(powerOfTenRatio(dec("21.98"), dec("21.98"))).toBeNull();
    expect(powerOfTenRatio(dec("22"), dec("21.98"))).toBeNull();
  });
});

describe("fractions", () => {
  test("reducing and comparing", () => {
    expect(gcd(18, 24)).toBe(6);
    expect(reduceFrac({ n: 45, d: 60 })).toEqual({ n: 3, d: 4 });
    expect(isReduced({ n: 9, d: 12 })).toBe(false);
    expect(fracEq({ n: 9, d: 12 }, { n: 3, d: 4 })).toBe(true);
  });

  test("mixed and improper forms", () => {
    expect(improperOf({ w: 2, n: 3, d: 4 })).toEqual({ n: 11, d: 4 });
    expect(mixedOf({ n: 17, d: 5 })).toEqual({ w: 3, n: 2, d: 5 });
    expect(fracText({ w: 3, n: 2, d: 5 })).toBe("3と2/5");
    expect(fracText({ w: 0, n: 11, d: 4 })).toBe("11/4");
  });

  test("fractions and decimals both ways", () => {
    expect(decText(fracToDec({ n: 3, d: 8 })!)).toBe("0.375");
    expect(fracToDec({ n: 1, d: 3 })).toBeNull();
    expect(decToFrac(dec("0.625"))).toEqual({ n: 5, d: 8 });
    expect(decToFrac(dec("0.6"))).toEqual({ n: 3, d: 5 });
  });
});
