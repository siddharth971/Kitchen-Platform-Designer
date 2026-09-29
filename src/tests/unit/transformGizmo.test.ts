import { describe, expect, it } from "vitest";
import { createInitialProject } from "@/store/projectSlice";
import { applyTransformCommit } from "@/core/geometry/transform";

describe("gizmo transform commits", () => {
  it("translates, rotates, and scales a cabinet while keeping its center aligned", () => {
    const project = createInitialProject();
    project.cabinets = [{
      id: "cab-1",
      type: "base",
      position: { x: 1000, y: 0, z: 500 },
      width: 600,
      height: 720,
      depth: 560,
      doors: 2,
      drawers: 0,
    }];

    const updated = applyTransformCommit(project, {
      objectId: "cab-1",
      objectType: "cabinet",
      positionDeltaMm: { x: 100, y: 20, z: -40 },
      rotationDegrees: { x: 0, y: 90, z: 0 },
      scale: { x: 2, y: 1.5, z: 0.5 },
    });
    const cabinet = updated.cabinets[0];

    expect(cabinet.position).toEqual({ x: 800, y: -160, z: 600 });
    expect(cabinet.width).toBe(1200);
    expect(cabinet.height).toBe(1080);
    expect(cabinet.depth).toBe(280);
    expect(cabinet.rotation).toEqual({ x: 0, y: 90, z: 0 });
  });

  it("rotates and scales a wall about its center while translating its endpoints", () => {
    const project = createInitialProject();
    const original = project.walls.find((wall) => wall.id === "wall-front")!;
    const originalCenterX = (original.start.x + original.end.x) / 2;
    const originalLength = Math.hypot(original.end.x - original.start.x, original.end.z - original.start.z);

    const updated = applyTransformCommit(project, {
      objectId: original.id,
      objectType: "wall",
      positionDeltaMm: { x: 100, y: 0, z: 200 },
      rotationDegrees: { x: 0, y: 90, z: 0 },
      scale: { x: 2, y: 1, z: 1 },
    });
    const wall = updated.walls.find((item) => item.id === original.id)!;

    expect(Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z)).toBeCloseTo(originalLength * 2);
    expect((wall.start.x + wall.end.x) / 2).toBeCloseTo(originalCenterX + 100);
    expect((wall.start.z + wall.end.z) / 2).toBeCloseTo(200);
  });

  it("scales a countertop footprint and shifts its origin to preserve the center", () => {
    const project = createInitialProject();
    const platform = project.platforms[0];
    const centerX = platform.position.x + platform.length / 2;
    const centerZ = platform.position.z + platform.depth / 2;

    const updated = applyTransformCommit(project, {
      objectId: platform.id,
      objectType: "platform",
      positionDeltaMm: { x: 10, y: 0, z: -20 },
      rotationDegrees: { x: 0, y: 90, z: 0 },
      scale: { x: 1.5, y: 1, z: 2 },
    });
    const transformed = updated.platforms[0];

    expect(transformed.length).toBe(3600);
    expect(transformed.depth).toBe(1200);
    expect(transformed.position.x + transformed.length / 2).toBeCloseTo(centerX + 10);
    expect(transformed.position.z + transformed.depth / 2).toBeCloseTo(centerZ - 20);
    expect(transformed.rotation).toEqual({ x: 0, y: 90, z: 0 });
  });
});