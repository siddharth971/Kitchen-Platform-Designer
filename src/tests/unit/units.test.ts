import { describe, it, expect } from "vitest";
import {
  mmToCm,
  cmToMm,
  mmToInches,
  inchesToMm,
  mmToFeetInches,
  feetInchesToMm,
  formatLength,
  parseLength,
  sqMmToSqFt,
  sqMmToSqM,
  mmToFt,
  mmToM,
} from "@/core/units";

describe("core/units", () => {
  describe("Conversions between metric & imperial", () => {
    it("converts mm to cm and back", () => {
      expect(mmToCm(2400)).toBe(240);
      expect(cmToMm(240)).toBe(2400);
    });

    it("converts mm to inches and back accurately", () => {
      expect(inchesToMm(1)).toBe(25.4);
      expect(mmToInches(25.4)).toBe(1);
      expect(inchesToMm(10)).toBe(254);
    });

    it("converts mm to feet and inches accurately", () => {
      // 2400 mm = 94.488188... inches = 7 feet (84 in) + 10.4882 in
      const res = mmToFeetInches(2400);
      expect(res.feet).toBe(7);
      expect(res.inches).toBeCloseTo(10.4882, 3);

      const roundTrip = feetInchesToMm(res.feet, res.inches);
      expect(roundTrip).toBeCloseTo(2400, 1);
    });

    it("converts exact feet inches to mm", () => {
      // 8 feet = 96 in = 2438.4 mm
      expect(feetInchesToMm(8, 0)).toBeCloseTo(2438.4, 4);
      // 7 feet 10 inches = 94 inches = 2387.6 mm
      expect(feetInchesToMm(7, 10)).toBeCloseTo(2387.6, 4);
    });

    it("converts area and running length", () => {
      // 1 sq meter = 10.7639 sq ft
      const oneSqMInSqMm = 1000 * 1000;
      expect(sqMmToSqM(oneSqMInSqMm)).toBe(1);
      expect(sqMmToSqFt(oneSqMInSqMm)).toBeCloseTo(10.7639, 3);

      // 1000 mm = 1 m = 3.28084 ft
      expect(mmToM(1000)).toBe(1);
      expect(mmToFt(1000)).toBeCloseTo(3.28084, 4);
    });
  });

  describe("formatLength", () => {
    it("formats in mm", () => {
      expect(formatLength(2400, "mm")).toBe("2400 mm");
      expect(formatLength(2400.4, "mm")).toBe("2400 mm");
    });

    it("formats in cm", () => {
      expect(formatLength(2400, "cm")).toBe("240 cm");
      expect(formatLength(2405, "cm")).toBe("240.5 cm");
    });

    it("formats in inches", () => {
      expect(formatLength(254, "inch")).toBe("10 in");
    });

    it("formats in feet-inches", () => {
      // 2400 mm ~ 7' 10.49"
      const formatted = formatLength(2400, "feet-inch");
      expect(formatted).toMatch(/^7' 10\.49"$/);
    });
  });

  describe("parseLength", () => {
    it("parses plain numbers using defaultMode", () => {
      expect(parseLength("2400", "mm")).toBe(2400);
      expect(parseLength("240", "cm")).toBe(2400);
      expect(parseLength("10", "inch")).toBe(254);
    });

    it("parses explicit mm and cm units", () => {
      expect(parseLength("2400mm")).toBe(2400);
      expect(parseLength("2400 mm")).toBe(2400);
      expect(parseLength("240cm")).toBe(2400);
      expect(parseLength("240.5 cm")).toBe(2405);
      expect(parseLength("2.4m")).toBe(2400);
    });

    it("parses inch units and quote shorthand", () => {
      expect(parseLength("10in")).toBe(254);
      expect(parseLength("94.5 in")).toBeCloseTo(2400.3, 1);
      expect(parseLength("94.5\"")).toBeCloseTo(2400.3, 1);
    });

    it("parses feet and inches combinations", () => {
      expect(parseLength("7'10\"")).toBeCloseTo(2387.6, 1);
      expect(parseLength("7' 10\"")).toBeCloseTo(2387.6, 1);
      expect(parseLength("7 ft 10 in")).toBeCloseTo(2387.6, 1);
      expect(parseLength("7 ft 10.5 in")).toBeCloseTo(2400.3, 1);
      expect(parseLength("8ft")).toBeCloseTo(2438.4, 1);
      expect(parseLength("8'")).toBeCloseTo(2438.4, 1);
    });

    it("parses fractional expressions", () => {
      // 10 1/2 in = 10.5 in = 266.7 mm
      expect(parseLength("10 1/2 in")).toBeCloseTo(266.7, 1);
      // 7' 10 1/2" = 94.5 in = 2400.3 mm
      expect(parseLength("7' 10 1/2\"")).toBeCloseTo(2400.3, 1);
    });

    it("rejects invalid inputs with descriptive error", () => {
      expect(() => parseLength("")).toThrowError(/empty string/);
      expect(() => parseLength("abc")).toThrowError(/Invalid length expression/);
      expect(() => parseLength("12.34.56")).toThrowError(/Invalid length expression/);
      expect(() => parseLength("invalid'format\"\"")).toThrowError();
    });
  });
});
