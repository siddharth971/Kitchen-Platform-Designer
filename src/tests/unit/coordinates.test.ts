import { describe, it, expect } from "vitest";
import {
  toScene,
  fromScene,
  toScene2D,
  fromScene2D,
  toSceneLength,
  fromSceneLength,
} from "@/engine/coordinates";

describe("engine/coordinates", () => {
  it("converts mm to Babylon scene units (1 unit = 1000 mm)", () => {
    const sceneVec = toScene({ x: 3600, y: 3000, z: 2500 });
    expect(sceneVec.x).toBeCloseTo(3.6, 6);
    expect(sceneVec.y).toBeCloseTo(3.0, 6);
    expect(sceneVec.z).toBeCloseTo(2.5, 6);
  });

  it("round-trips 3D coordinates exactly", () => {
    const original = { x: 2450.5, y: 850, z: 600.25 };
    const sceneVec = toScene(original);
    const result = fromScene(sceneVec);

    expect(result.x).toBeCloseTo(original.x, 2);
    expect(result.y).toBeCloseTo(original.y, 2);
    expect(result.z).toBeCloseTo(original.z, 2);
  });

  it("converts 2D floorplan points accurately", () => {
    const p2d = { x: 1200, z: 1800 };
    const vec = toScene2D(p2d, 900);

    expect(vec.x).toBeCloseTo(1.2, 6);
    expect(vec.y).toBeCloseTo(0.9, 6);
    expect(vec.z).toBeCloseTo(1.8, 6);

    const back2d = fromScene2D(vec);
    expect(back2d.x).toBe(1200);
    expect(back2d.z).toBe(1800);
  });

  it("converts lengths in mm to scene units and back", () => {
    expect(toSceneLength(2400)).toBeCloseTo(2.4, 6);
    expect(fromSceneLength(2.4)).toBe(2400);

    expect(toSceneLength(600)).toBeCloseTo(0.6, 6);
    expect(fromSceneLength(0.6)).toBe(600);
  });
});
