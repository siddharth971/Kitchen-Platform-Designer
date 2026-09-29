import { describe, it, expect } from "vitest";
import {
  computeMeasurement,
  findNearestSnapPoint,
  extractProjectSnapPoints,
} from "@/core/geometry/measurement";
import { DEFAULT_ROOM_PRESET, PLATFORM_DEFAULTS } from "@/data/presets";
import type { CountertopPlatform } from "@/types/kitchen";

describe("CAD Measurement Module (Phase 4)", () => {
  it("calculates 3D Euclidean distance and orthogonal components correctly", () => {
    const start = { x: 100, y: 0, z: 200 };
    const end = { x: 400, y: 400, z: 200 }; // 300 in X, 400 in Y -> distance = 500

    const m = computeMeasurement("meas-1", start, end, "Diagonal test");
    expect(m.dxMm).toBe(300);
    expect(m.dyMm).toBe(400);
    expect(m.dzMm).toBe(0);
    expect(m.distanceMm).toBe(500);
  });

  it("snaps to nearest point within threshold radius", () => {
    const snapPoints = [
      { x: 0, y: 0, z: 0 },
      { x: 2400, y: 850, z: 600 },
      { x: 3600, y: 0, z: 3000 },
    ];

    // Cursor at (2415, 845, 605) is ~22mm away from second snap point (within 80mm)
    const cursor = { x: 2415, y: 845, z: 605 };
    const res = findNearestSnapPoint(cursor, snapPoints, 80);

    expect(res.snapped).toBe(true);
    expect(res.point).toEqual({ x: 2400, y: 850, z: 600 });
    expect(res.distanceMm).toBeLessThanOrEqual(80);
  });

  it("does not snap when distance exceeds maxSnapRadiusMm", () => {
    const snapPoints = [{ x: 0, y: 0, z: 0 }];
    const cursor = { x: 500, y: 0, z: 500 }; // > 700mm away

    const res = findNearestSnapPoint(cursor, snapPoints, 80);
    expect(res.snapped).toBe(false);
    expect(res.point).toEqual(cursor);
  });

  it("extracts snap points from room, walls, and platform corners", () => {
    const platform: CountertopPlatform = {
      id: "plat-1",
      name: "Main Platform",
      shape: "straight",
      position: { x: 200, z: 200 },
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
      overhang: {
        front: PLATFORM_DEFAULTS.overhangFrontMm,
        side: PLATFORM_DEFAULTS.overhangSideMm,
        back: PLATFORM_DEFAULTS.overhangBackMm,
      },
      backsplash: { enabled: true, height: 600, thickness: 20 },
      cutouts: [
        {
          id: "cut-1",
          type: "sink",
          shape: "rect",
          x: 200,
          y: 70,
          width: 560,
          depth: 460,
        },
      ],
    };

    const pts = extractProjectSnapPoints(DEFAULT_ROOM_PRESET, [], [platform]);
    expect(pts.length).toBeGreaterThan(10);
    // Must contain platform top workingHeight points
    expect(pts.some((p) => p.y === 850)).toBe(true);
    // Must contain cutout points
    expect(pts.some((p) => p.x === 400 && p.y === 850)).toBe(true);
  });
});
