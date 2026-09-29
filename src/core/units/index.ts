import type { DisplayUnit } from "@/types/project";

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const MM_PER_CM = 10;
export const SQ_MM_PER_SQ_FT = 92903.04;
export const SQ_MM_PER_SQ_M = 1000000;

export function mmToCm(mm: number): number {
  return mm / MM_PER_CM;
}

export function cmToMm(cm: number): number {
  return cm * MM_PER_CM;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function mmToFeetInches(mm: number): { feet: number; inches: number } {
  const totalInches = mm / MM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  return {
    feet,
    inches: Number(inches.toFixed(4)),
  };
}

export function feetInchesToMm(feet: number, inches: number): number {
  return (feet * 12 + inches) * MM_PER_INCH;
}

export function mmToFt(mm: number): number {
  return mm / MM_PER_FOOT;
}

export function ftToMm(ft: number): number {
  return ft * MM_PER_FOOT;
}

export function mmToM(mm: number): number {
  return mm / 1000;
}

export function mToMm(m: number): number {
  return m * 1000;
}

export function sqMmToSqFt(sqMm: number): number {
  return sqMm / SQ_MM_PER_SQ_FT;
}

export function sqFtToSqMm(sqFt: number): number {
  return sqFt * SQ_MM_PER_SQ_FT;
}

export function sqMmToSqM(sqMm: number): number {
  return sqMm / SQ_MM_PER_SQ_M;
}

export function sqMToSqMm(sqM: number): number {
  return sqM * SQ_MM_PER_SQ_M;
}

function cleanNumber(num: number, precision: number): string {
  const fixed = num.toFixed(precision);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

/**
 * Formats millimetre length according to display unit mode.
 */
export function formatLength(mm: number, mode: DisplayUnit, precision: number = 2): string {
  if (isNaN(mm)) return "0 mm";

  switch (mode) {
    case "mm":
      return `${Math.round(mm)} mm`;
    case "cm":
      return `${cleanNumber(mmToCm(mm), precision)} cm`;
    case "inch":
      return `${cleanNumber(mmToInches(mm), precision)} in`;
    case "feet-inch": {
      const { feet, inches } = mmToFeetInches(mm);
      if (feet === 0) {
        return `${cleanNumber(inches, precision)}"`;
      }
      return `${feet}' ${cleanNumber(inches, precision)}"`;
    }
    default:
      return `${Math.round(mm)} mm`;
  }
}

/**
 * Parses fractional strings like "1/2" or "3/4"
 */
function parseFraction(part: string): number {
  if (part.includes("/")) {
    const [numStr, denStr] = part.split("/");
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }
  const val = parseFloat(part);
  return isNaN(val) ? 0 : val;
}

/**
 * Parses a length string in various formats into millimetres.
 * Supported formats:
 * - 2400 (uses defaultMode, default mm)
 * - 2400mm, 2400 mm
 * - 240cm, 240 cm
 * - 94.5in, 94.5 in, 94.5"
 * - 7'10", 7' 10", 7 ft 10.5 in, 7ft 10in, 7'10.5"
 * - 7' 10 1/2", 94 1/2 in
 */
export function parseLength(text: string, defaultMode: DisplayUnit = "mm"): number {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid length input: input must be a non-empty string");
  }

  const raw = text.trim();
  if (raw === "") {
    throw new Error("Invalid length input: empty string");
  }

  // Check for Feet & Inches patterns:
  // e.g., 7'10", 7' 10.5", 7 ft 10 in, 7ft 10.5in, 7' 10 1/2"
  const feetInchesRegex = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:"|in|inch|inches)?)?$/i;
  const feetOnlyRegex = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)$/i;

  const ftInMatch = raw.match(feetInchesRegex);
  if (ftInMatch) {
    const feet = parseFloat(ftInMatch[1]);
    let inches = 0;
    if (ftInMatch[2]) {
      const inPart = ftInMatch[2].trim();
      if (inPart.includes(" ")) {
        const [whole, frac] = inPart.split(/\s+/);
        inches = parseFloat(whole) + parseFraction(frac);
      } else if (inPart.includes("/")) {
        inches = parseFraction(inPart);
      } else {
        inches = parseFloat(inPart);
      }
    }
    if (isNaN(feet) || isNaN(inches)) {
      throw new Error(`Invalid feet-inches length: "${text}"`);
    }
    return feetInchesToMm(feet, inches);
  }

  const ftOnlyMatch = raw.match(feetOnlyRegex);
  if (ftOnlyMatch) {
    const feet = parseFloat(ftOnlyMatch[1]);
    if (isNaN(feet)) {
      throw new Error(`Invalid feet length: "${text}"`);
    }
    return feetInchesToMm(feet, 0);
  }

  // Check explicit unit suffixes
  // mm
  const mmMatch = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*mm$/i);
  if (mmMatch) {
    const val = parseFloat(mmMatch[1]);
    if (isNaN(val)) throw new Error(`Invalid mm length: "${text}"`);
    return val;
  }

  // cm
  const cmMatch = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*cm$/i);
  if (cmMatch) {
    const val = parseFloat(cmMatch[1]);
    if (isNaN(val)) throw new Error(`Invalid cm length: "${text}"`);
    return cmToMm(val);
  }

  // inches (e.g. 94.5in, 94.5", 94 1/2 in)
  const inchMatch = raw.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:in|inch|inches|")$/i);
  if (inchMatch) {
    const inPart = inchMatch[1].trim();
    let inches = 0;
    if (inPart.includes(" ")) {
      const [whole, frac] = inPart.split(/\s+/);
      inches = parseFloat(whole) + parseFraction(frac);
    } else if (inPart.includes("/")) {
      inches = parseFraction(inPart);
    } else {
      inches = parseFloat(inPart);
    }
    if (isNaN(inches)) throw new Error(`Invalid inch length: "${text}"`);
    return inchesToMm(inches);
  }

  // meter (e.g. 2.4m, 2.4 m)
  const mMatch = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*m$/i);
  if (mMatch) {
    const val = parseFloat(mMatch[1]);
    if (isNaN(val)) throw new Error(`Invalid meter length: "${text}"`);
    return mToMm(val);
  }

  // Plain number without unit: interpreted according to defaultMode
  const plainNumber = parseFloat(raw);
  if (!isNaN(plainNumber) && /^[+-]?\d+(?:\.\d+)?$/.test(raw)) {
    switch (defaultMode) {
      case "mm":
        return plainNumber;
      case "cm":
        return cmToMm(plainNumber);
      case "inch":
        return inchesToMm(plainNumber);
      case "feet-inch":
        return inchesToMm(plainNumber); // plain number in feet-inch mode is interpreted as inches or mm
      default:
        return plainNumber;
    }
  }

  throw new Error(`Invalid length expression: "${text}". Expected e.g. "2400", "240cm", "7'10\\"", or "94.5in"`);
}

export function formatArea(sqMm: number, unit: "sq-ft" | "sq-m", precision: number = 2): string {
  if (unit === "sq-ft") {
    return `${cleanNumber(sqMmToSqFt(sqMm), precision)} sq ft`;
  }
  return `${cleanNumber(sqMmToSqM(sqMm), precision)} sq m`;
}

export function formatRunningLength(mm: number, unit: "ft" | "m", precision: number = 2): string {
  if (unit === "ft") {
    return `${cleanNumber(mmToFt(mm), precision)} ft`;
  }
  return `${cleanNumber(mmToM(mm), precision)} m`;
}
