import { describe, it, expect } from "vitest";
import {
  computePlatformFootprint,
  calculatePolygonArea,
  triangulateFootprint,
  computePlatformSeams,
  decomposePlatformIntoPieces,
  calculatePlatformQuantities,
} from "@/core/geometry/platform";
import type { CountertopPlatform } from "@/types/kitchen";

describe("core/geometry/platform (Golden Geometry Tests)", () => {
  const straightPlatform: CountertopPlatform = {
    id: "plat-1",
    name: "Main Platform",
    shape: "straight",
    position: { x: 0, z: 0 },
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
    backsplash: { enabled: true, height: 600, thickness: 20 },
    cutouts: [],
  };

  const lShapedPlatform: CountertopPlatform = {
    ...straightPlatform,
    id: "plat-2",
    shape: "l-shaped",
    lengthA: 2400,
    depthA: 600,
    lengthB: 1800,
    depthB: 600,
  };

  const uShapedPlatform: CountertopPlatform = {
    ...straightPlatform,
    id: "plat-3",
    shape: "u-shaped",
    lengthA: 2400,
    depthA: 600,
    lengthB: 1800,
    depthB: 600,
  };

  it("straight platform footprint area equals analytic area (2400 x 600 = 1,440,000 sq mm)", () => {
    const footprint = computePlatformFootprint(straightPlatform);
    expect(footprint).toHaveLength(4);

    const analyticArea = 2400 * 600;
    const computedArea = calculatePolygonArea(footprint);
    expect(computedArea).toBe(analyticArea);

    // Triangulated area with earcut
    const { indices, triangulatedArea } = triangulateFootprint(footprint);
    expect(indices.length).toBe(6); // 2 triangles = 6 indices
    expect(triangulatedArea).toBeCloseTo(analyticArea, 4);
  });

  it("L-shaped platform footprint area counts shared corner once (analytic = 2,160,000 sq mm)", () => {
    const footprint = computePlatformFootprint(lShapedPlatform);
    expect(footprint).toHaveLength(6);

    // Analytic area: (2400 x 600) + (1800 - 600) * 600 = 1,440,000 + 720,000 = 2,160,000
    const analyticArea = 2400 * 600 + (1800 - 600) * 600;
    const computedArea = calculatePolygonArea(footprint);
    expect(computedArea).toBe(analyticArea);

    // Triangulated area using earcut
    const { indices, triangulatedArea } = triangulateFootprint(footprint);
    expect(indices.length).toBe(12); // 4 triangles = 12 indices
    expect(triangulatedArea).toBeCloseTo(analyticArea, 4);
  });

  it("U-shaped platform footprint creates a three-sided contour without overlap", () => {
    const footprint = computePlatformFootprint(uShapedPlatform);
    expect(footprint).toHaveLength(8);

    const analyticArea = 2400 * 600 + 2 * (1800 - 600) * 600;
    const computedArea = calculatePolygonArea(footprint);
    expect(computedArea).toBe(analyticArea);

    const { triangulatedArea } = triangulateFootprint(footprint);
    expect(triangulatedArea).toBeCloseTo(analyticArea, 4);
  });

  it("triangulates footprint with cutouts subtracted accurately", () => {
    const footprint = computePlatformFootprint(straightPlatform);
    // Sink cutout: 800 x 400 mm positioned at (600, 100)
    const hole: { x: number; z: number }[] = [
      { x: 600, z: 100 },
      { x: 1400, z: 100 },
      { x: 1400, z: 500 },
      { x: 600, z: 500 },
    ];

    const { triangulatedArea } = triangulateFootprint(footprint, [hole]);
    const grossArea = 2400 * 600; // 1,440,000
    const cutoutArea = 800 * 400; // 320,000
    const expectedNetArea = grossArea - cutoutArea; // 1,120,000

    expect(triangulatedArea).toBeCloseTo(expectedNetArea, 2);
  });

  it("places corner seam for L-shaped platform", () => {
    const seams = computePlatformSeams(lShapedPlatform, 3000);
    expect(seams).toHaveLength(1);
    expect(seams[0].reason).toBe("corner-joint");
    expect(seams[0].start).toEqual({ x: 600, z: 0 });
    expect(seams[0].end).toEqual({ x: 600, z: 600 });
  });

  it("flags seam validation warning if a cutout is too close to seam (<150mm)", () => {
    const platformWithCloseCutout: CountertopPlatform = {
      ...lShapedPlatform,
      cutouts: [
        {
          id: "sink-cutout",
          type: "sink",
          shape: "rect",
          x: 650, // 50mm from seam at x=600!
          y: 50,
          width: 600,
          depth: 450,
        },
      ],
    };

    const seams = computePlatformSeams(platformWithCloseCutout, 3000, 150);
    expect(seams[0].isValid).toBe(false);
    expect(seams[0].warning).toContain("closer than 150mm");
  });

  it("decomposes platform into discrete fabrication pieces", () => {
    const pieces = decomposePlatformIntoPieces(lShapedPlatform);
    expect(pieces).toHaveLength(2);
    expect(pieces[0].lengthMm).toBe(2400);
    expect(pieces[0].depthMm).toBe(600);
    expect(pieces[1].lengthMm).toBe(1200); // 1800 - 600
    expect(pieces[1].depthMm).toBe(600);

    const sumPiecesArea = pieces[0].areaSqMm + pieces[1].areaSqMm;
    expect(sumPiecesArea).toBe(2160000);
  });

  it("calculates quantities, backsplash area, and finished edge length", () => {
    const q = calculatePlatformQuantities(lShapedPlatform, 8);
    expect(q.grossAreaSqMm).toBe(2160000);
    expect(q.netAreaSqMm).toBe(2160000);
    expect(q.billableAreaNetWithWasteSqMm).toBeCloseTo(2160000 * 1.08, 1);

    // Backsplash length = 2400 + 1800 = 4200 mm
    expect(q.backsplashLengthMm).toBe(4200);
    expect(q.backsplashAreaSqMm).toBe(4200 * 600); // 2,520,000 sq mm

    // Finished edge length: exposed front A (1800) + outer return A (600) + exposed front B (1200) + outer return B (600) = 4200 mm
    expect(q.finishedEdgeLengthMm).toBe(4200);
  });
});
