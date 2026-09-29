import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Point2D, Point3D } from "@/types/geometry";

/**
 * MM to Babylon scene units scale factor.
 * 1 Babylon unit = 1000 mm = 1 meter.
 * Handedness: Babylon Scene is set to useRightHandedSystem = true.
 */
export const MM_PER_SCENE_UNIT = 1000;
export const SCENE_UNITS_PER_MM = 1 / MM_PER_SCENE_UNIT;

/**
 * Converts project domain coordinates (in mm) to Babylon scene coordinates.
 */
export function toScene(point: Point3D): Vector3 {
  return new Vector3(
    point.x * SCENE_UNITS_PER_MM,
    point.y * SCENE_UNITS_PER_MM,
    point.z * SCENE_UNITS_PER_MM
  );
}

/**
 * Converts a 2D floorplan point (x, z in mm) and an optional height (y in mm) to a Babylon Vector3.
 */
export function toScene2D(point: Point2D, yMm: number = 0): Vector3 {
  return new Vector3(
    point.x * SCENE_UNITS_PER_MM,
    yMm * SCENE_UNITS_PER_MM,
    point.z * SCENE_UNITS_PER_MM
  );
}

/**
 * Converts Babylon scene coordinates back to project domain coordinates (in mm).
 */
export function fromScene(vec: Vector3 | { x: number; y: number; z: number }): Point3D {
  return {
    x: Math.round(vec.x * MM_PER_SCENE_UNIT * 100) / 100,
    y: Math.round(vec.y * MM_PER_SCENE_UNIT * 100) / 100,
    z: Math.round(vec.z * MM_PER_SCENE_UNIT * 100) / 100,
  };
}

/**
 * Converts Babylon scene vector back to a 2D floorplan point (x, z in mm).
 */
export function fromScene2D(vec: Vector3 | { x: number; z: number }): Point2D {
  return {
    x: Math.round(vec.x * MM_PER_SCENE_UNIT * 100) / 100,
    z: Math.round(vec.z * MM_PER_SCENE_UNIT * 100) / 100,
  };
}

/**
 * Converts a length in millimetres to Babylon scene units.
 */
export function toSceneLength(mm: number): number {
  return mm * SCENE_UNITS_PER_MM;
}

/**
 * Converts a length in Babylon scene units back to millimetres.
 */
export function fromSceneLength(units: number): number {
  return Math.round(units * MM_PER_SCENE_UNIT * 100) / 100;
}
