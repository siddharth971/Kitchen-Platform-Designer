import { describe, it, expect } from "vitest";
import {
  computeCutoutPolygon,
  polygonArea,
  pointInPolygon,
  isCutoutInsidePlatform,
  computeEdgeClearance,
  validateCutoutPlacement,
  computeCutoutArea,
} from "@/core/geometry/cutout";
import type { Cutout, CountertopPlatform } from "@/types/kitchen";

// ── Helper: minimal straight platform ──
function makeTestPlatform(overrides?: Partial<CountertopPlatform>): CountertopPlatform {
  return {
    id: "test-plat",
    name: "Test Platform",
    shape: "straight",
    position: { x: 100, z: 100 },
    length: 2400,
    depth: 600,
    lengthA: 2400,
    depthA: 600,
    lengthB: 1800,
    depthB: 600,
    workingHeight: 850,
    slabThickness: 20,
    materialId: "granite-black-galaxy",
    edgeProfileId: "square",
    cornerStyle: "square",
    overhang: { front: 0, side: 0, back: 0 },
    backsplash: { enabled: false, height: 0, thickness: 0 },
    cutouts: [],
    ...overrides,
  };
}

describe("computeCutoutPolygon", () => {
  it("should generate a rectangular polygon in global coords", () => {
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 200,
      y: 100,
      width: 560,
      depth: 460,
    };
    const poly = computeCutoutPolygon(cutout, { x: 100, z: 100 });

    expect(poly).toHaveLength(4);
    // First corner: platform.x + cutout.x = 300, platform.z + cutout.y = 200
    expect(poly[0]).toEqual({ x: 300, z: 200 });
    expect(poly[1]).toEqual({ x: 860, z: 200 });
    expect(poly[2]).toEqual({ x: 860, z: 660 });
    expect(poly[3]).toEqual({ x: 300, z: 660 });
  });

  it("should generate a circle polygon with correct number of segments", () => {
    const cutout: Cutout = {
      id: "c2",
      type: "custom",
      shape: "circle",
      x: 100,
      y: 100,
      width: 100,
      depth: 100,
    };
    const poly = computeCutoutPolygon(cutout, { x: 0, z: 0 });
    expect(poly).toHaveLength(24); // default 24 segments
  });

  it("should generate a rounded-rect polygon", () => {
    const cutout: Cutout = {
      id: "c3",
      type: "custom",
      shape: "rounded-rect",
      x: 100,
      y: 100,
      width: 400,
      depth: 300,
      radius: 20,
    };
    const poly = computeCutoutPolygon(cutout, { x: 0, z: 0 });
    expect(poly.length).toBeGreaterThan(4); // More vertices than a simple rect
  });
});

describe("polygonArea", () => {
  it("should compute area of a rectangle (600 x 400 = 240000 sqmm)", () => {
    const rect = [
      { x: 0, z: 0 },
      { x: 600, z: 0 },
      { x: 600, z: 400 },
      { x: 0, z: 400 },
    ];
    expect(polygonArea(rect)).toBeCloseTo(240000, 0);
  });

  it("should compute area of a triangle", () => {
    const tri = [
      { x: 0, z: 0 },
      { x: 100, z: 0 },
      { x: 50, z: 100 },
    ];
    // Area = 0.5 * base * height = 0.5 * 100 * 100 = 5000
    expect(polygonArea(tri)).toBeCloseTo(5000, 0);
  });

  it("should return 0 for less than 3 points", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([{ x: 0, z: 0 }])).toBe(0);
    expect(polygonArea([{ x: 0, z: 0 }, { x: 1, z: 0 }])).toBe(0);
  });
});

describe("pointInPolygon", () => {
  const square = [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
    { x: 100, z: 100 },
    { x: 0, z: 100 },
  ];

  it("should return true for a point inside", () => {
    expect(pointInPolygon({ x: 50, z: 50 }, square)).toBe(true);
  });

  it("should return false for a point outside", () => {
    expect(pointInPolygon({ x: 150, z: 50 }, square)).toBe(false);
    expect(pointInPolygon({ x: -10, z: 50 }, square)).toBe(false);
  });
});

describe("isCutoutInsidePlatform", () => {
  it("should return true for a cutout well inside the platform", () => {
    const platform = makeTestPlatform();
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 200,
      y: 100,
      width: 560,
      depth: 400,
    };
    expect(isCutoutInsidePlatform(cutout, platform)).toBe(true);
  });

  it("should return false for a cutout extending beyond the platform", () => {
    const platform = makeTestPlatform();
    const cutout: Cutout = {
      id: "c2",
      type: "sink",
      shape: "rect",
      x: 2200,
      y: 100,
      width: 560,
      depth: 460,
    };
    // x: 2200 + 560 = 2760 > 2400 (platform length)
    expect(isCutoutInsidePlatform(cutout, platform)).toBe(false);
  });
});

describe("computeEdgeClearance", () => {
  it("should compute correct edge clearance for centered cutout", () => {
    const platform = makeTestPlatform();
    // Platform covers x: 100..2500, z: 100..700
    // Center cutout at x: 1100..1500 (offset 1000, width 400), z: 200..600 (offset 100, depth 400)
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 1000,
      y: 100,
      width: 400,
      depth: 400,
    };
    const clearance = computeEdgeClearance(cutout, platform);
    // Nearest edge should be 100mm (z: 200 - 100 = 100, or z: 700 - 600 = 100)
    expect(clearance).toBeCloseTo(100, 0);
  });
});

describe("validateCutoutPlacement", () => {
  it("should return no issues for a valid cutout", () => {
    const platform = makeTestPlatform();
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 800,
      y: 100,
      width: 560,
      depth: 400,
    };
    const issues = validateCutoutPlacement(cutout, platform, 50);
    expect(issues).toHaveLength(0);
  });

  it("should detect cutout outside platform", () => {
    const platform = makeTestPlatform();
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 2200,
      y: 100,
      width: 560,
      depth: 460,
    };
    const issues = validateCutoutPlacement(cutout, platform, 50);
    expect(issues.some((i) => i.type === "outside-platform")).toBe(true);
  });

  it("should detect insufficient clearance", () => {
    const platform = makeTestPlatform();
    // Place cutout very close to edge
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 10,
      y: 10,
      width: 560,
      depth: 460,
    };
    const issues = validateCutoutPlacement(cutout, platform, 50);
    expect(issues.some((i) => i.type === "insufficient-clearance")).toBe(true);
  });
});

describe("computeCutoutArea", () => {
  it("should compute area of a rectangular cutout", () => {
    const cutout: Cutout = {
      id: "c1",
      type: "sink",
      shape: "rect",
      x: 0,
      y: 0,
      width: 560,
      depth: 460,
    };
    const area = computeCutoutArea(cutout, { x: 0, z: 0 });
    expect(area).toBeCloseTo(560 * 460, 0);
  });
});
