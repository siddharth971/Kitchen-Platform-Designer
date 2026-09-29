/**
 * core/geometry/measurement/index.ts
 *
 * Pure CAD measurement module for point-to-point dimensioning in 2D/3D.
 * Calculates exact Euclidean distances, orthogonal delta components (dX, dY, dZ),
 * and handles smart snapping to room corners, wall ends, and platform vertices.
 *
 * No React or Babylon dependencies.
 */

import type { Point3D, Point2D } from "@/types/geometry";
import type { Room, Wall } from "@/types/project";
import type { CountertopPlatform } from "@/types/kitchen";
import { computePlatformFootprint } from "@/core/geometry/platform";

export interface MeasurementItem {
  id: string;
  start: Point3D;
  end: Point3D;
  distanceMm: number;
  dxMm: number;
  dyMm: number;
  dzMm: number;
  label?: string;
  createdAt: string;
}

/**
 * Compute full 3D distance and orthogonal components between two points.
 */
export function computeMeasurement(
  id: string,
  start: Point3D,
  end: Point3D,
  label?: string
): MeasurementItem {
  const dx = Math.round(end.x - start.x);
  const dy = Math.round(end.y - start.y);
  const dz = Math.round(end.z - start.z);

  const distance = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));

  return {
    id,
    start,
    end,
    distanceMm: distance,
    dxMm: Math.abs(dx),
    dyMm: Math.abs(dy),
    dzMm: Math.abs(dz),
    label,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Snap a point to the nearest target point if within snapRadiusMm.
 */
export function findNearestSnapPoint(
  cursor: Point3D,
  snapPoints: Point3D[],
  maxSnapRadiusMm: number = 80
): { point: Point3D; snapped: boolean; distanceMm: number } {
  let bestPoint = cursor;
  let bestDist = Infinity;

  for (const p of snapPoints) {
    const dx = p.x - cursor.x;
    const dy = p.y - cursor.y;
    const dz = p.z - cursor.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = p;
    }
  }

  if (bestDist <= maxSnapRadiusMm) {
    return { point: bestPoint, snapped: true, distanceMm: Math.round(bestDist) };
  }

  return { point: cursor, snapped: false, distanceMm: 0 };
}

/**
 * Extract geometric vertices from room, walls, and platforms to serve as snap targets.
 */
export function extractProjectSnapPoints(
  room: Room,
  walls: Wall[],
  platforms: CountertopPlatform[]
): Point3D[] {
  const points: Point3D[] = [];

  // 1. Room corners at floor (y=0) and ceiling (y=height)
  const roomCorners: Point2D[] = [
    { x: 0, z: 0 },
    { x: room.length, z: 0 },
    { x: room.length, z: room.width },
    { x: 0, z: room.width },
  ];

  for (const c of roomCorners) {
    points.push({ x: c.x, y: 0, z: c.z });
    points.push({ x: c.x, y: room.height, z: c.z });
  }

  // 2. Wall start and end points
  for (const w of walls) {
    points.push({ x: w.start.x, y: 0, z: w.start.z });
    points.push({ x: w.end.x, y: 0, z: w.end.z });
    points.push({ x: w.start.x, y: w.height, z: w.start.z });
    points.push({ x: w.end.x, y: w.height, z: w.end.z });
  }

  // 3. Platform corners (floor and top of slab)
  for (const plat of platforms) {
    const footprint = computePlatformFootprint(plat);
    for (const v of footprint) {
      points.push({ x: v.x, y: 0, z: v.z });
      points.push({ x: v.x, y: plat.workingHeight, z: v.z });
    }

    // Cutout corners
    if (plat.cutouts) {
      for (const cut of plat.cutouts) {
        const cx = plat.position.x + cut.x;
        const cz = plat.position.z + cut.y;
        points.push({ x: cx, y: plat.workingHeight, z: cz });
        points.push({ x: cx + cut.width, y: plat.workingHeight, z: cz });
        points.push({ x: cx + cut.width, y: plat.workingHeight, z: cz + cut.depth });
        points.push({ x: cx, y: plat.workingHeight, z: cz + cut.depth });
      }
    }
  }

  return points;
}
