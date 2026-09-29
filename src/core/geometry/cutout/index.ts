/**
 * core/geometry/cutout/index.ts
 *
 * Pure geometry functions for computing cutout shapes, validating placement,
 * and generating polygon holes for platform slabs.
 *
 * No React or Babylon imports allowed.
 */

import type { Point2D } from "@/types/geometry";
import type { Cutout, CountertopPlatform } from "@/types/kitchen";
import { computePlatformFootprint } from "@/core/geometry/platform";

/**
 * Generate the 2D polygon for a cutout, in global mm coordinates.
 * The cutout's x/y are relative to the platform origin.
 */
export function computeCutoutPolygon(
  cutout: Cutout,
  platformPosition: Point2D
): Point2D[] {
  const globalX = platformPosition.x + cutout.x;
  const globalZ = platformPosition.z + cutout.y;

  if (cutout.shape === "rect") {
    return [
      { x: globalX, z: globalZ },
      { x: globalX + cutout.width, z: globalZ },
      { x: globalX + cutout.width, z: globalZ + cutout.depth },
      { x: globalX, z: globalZ + cutout.depth },
    ];
  }

  if (cutout.shape === "rounded-rect") {
    const r = cutout.radius ?? Math.min(cutout.width, cutout.depth) * 0.1;
    return generateRoundedRectPolygon(
      globalX,
      globalZ,
      cutout.width,
      cutout.depth,
      r
    );
  }

  if (cutout.shape === "circle") {
    const radius = cutout.width / 2;
    const cx = globalX + cutout.width / 2;
    const cz = globalZ + cutout.depth / 2;
    return generateCirclePolygon(cx, cz, radius, 24);
  }

  if (cutout.shape === "polygon" && cutout.points && cutout.points.length >= 3) {
    return cutout.points.map((p) => ({
      x: platformPosition.x + p.x,
      z: platformPosition.z + p.z,
    }));
  }

  // Fallback: return rectangle
  return [
    { x: globalX, z: globalZ },
    { x: globalX + cutout.width, z: globalZ },
    { x: globalX + cutout.width, z: globalZ + cutout.depth },
    { x: globalX, z: globalZ + cutout.depth },
  ];
}

/**
 * Generate a rounded rectangle polygon with smooth corners.
 */
function generateRoundedRectPolygon(
  x: number,
  z: number,
  width: number,
  depth: number,
  radius: number,
  segmentsPerCorner: number = 6
): Point2D[] {
  const r = Math.min(radius, width / 2, depth / 2);
  const pts: Point2D[] = [];

  // Bottom-left corner
  for (let i = 0; i <= segmentsPerCorner; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / segmentsPerCorner);
    pts.push({
      x: x + r + r * Math.cos(angle),
      z: z + r + r * Math.sin(angle),
    });
  }

  // Bottom-right corner
  for (let i = 0; i <= segmentsPerCorner; i++) {
    const angle = (3 * Math.PI) / 2 + (Math.PI / 2) * (i / segmentsPerCorner);
    pts.push({
      x: x + width - r + r * Math.cos(angle),
      z: z + r + r * Math.sin(angle),
    });
  }

  // Top-right corner
  for (let i = 0; i <= segmentsPerCorner; i++) {
    const angle = 0 + (Math.PI / 2) * (i / segmentsPerCorner);
    pts.push({
      x: x + width - r + r * Math.cos(angle),
      z: z + depth - r + r * Math.sin(angle),
    });
  }

  // Top-left corner
  for (let i = 0; i <= segmentsPerCorner; i++) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (i / segmentsPerCorner);
    pts.push({
      x: x + r + r * Math.cos(angle),
      z: z + depth - r + r * Math.sin(angle),
    });
  }

  return pts;
}

/**
 * Generate a circle polygon with N segments.
 */
function generateCirclePolygon(
  cx: number,
  cz: number,
  radius: number,
  segments: number
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    pts.push({
      x: cx + radius * Math.cos(angle),
      z: cz + radius * Math.sin(angle),
    });
  }
  return pts;
}

/**
 * Compute the area of a 2D polygon using the shoelace formula.
 * Returns the absolute area in sq mm.
 */
export function polygonArea(polygon: Point2D[]): number {
  const n = polygon.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].z;
    area -= polygon[j].x * polygon[i].z;
  }
  return Math.abs(area) / 2;
}

/**
 * Check if a point is inside a convex or concave polygon (ray casting).
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    if ((zi > point.z) !== (zj > point.z) &&
        point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if a rectangular cutout is fully inside the platform footprint.
 * Uses bounding box corners as a fast check.
 */
export function isCutoutInsidePlatform(
  cutout: Cutout,
  platform: CountertopPlatform
): boolean {
  const footprint = computePlatformFootprint(platform);
  const polygon = computeCutoutPolygon(cutout, platform.position);

  // Check every vertex of the cutout is inside the platform footprint
  return polygon.every((pt) => pointInPolygon(pt, footprint));
}

/**
 * Check if a cutout has minimum clearance from the platform edges.
 * Returns the minimum distance from any cutout vertex to the nearest platform edge.
 */
export function computeEdgeClearance(
  cutout: Cutout,
  platform: CountertopPlatform
): number {
  const footprint = computePlatformFootprint(platform);
  const cutoutPoly = computeCutoutPolygon(cutout, platform.position);
  let minDist = Infinity;

  for (const pt of cutoutPoly) {
    for (let i = 0; i < footprint.length; i++) {
      const a = footprint[i];
      const b = footprint[(i + 1) % footprint.length];
      const dist = pointToSegmentDistance(pt, a, b);
      minDist = Math.min(minDist, dist);
    }
  }

  return minDist;
}

/**
 * Distance from a point to a line segment.
 */
function pointToSegmentDistance(
  p: Point2D,
  a: Point2D,
  b: Point2D
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;

  if (lenSq === 0) {
    // Segment is a single point
    return Math.sqrt((p.x - a.x) ** 2 + (p.z - a.z) ** 2);
  }

  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projZ = a.z + t * dz;

  return Math.sqrt((p.x - projX) ** 2 + (p.z - projZ) ** 2);
}

/**
 * Validate cutout placement. Returns a list of issues.
 */
export interface CutoutValidationIssue {
  type: "outside-platform" | "insufficient-clearance" | "overlaps-seam";
  message: string;
}

export function validateCutoutPlacement(
  cutout: Cutout,
  platform: CountertopPlatform,
  requiredClearance: number = 50
): CutoutValidationIssue[] {
  const issues: CutoutValidationIssue[] = [];

  if (!isCutoutInsidePlatform(cutout, platform)) {
    issues.push({
      type: "outside-platform",
      message: "Cutout extends outside the platform boundary.",
    });
  }

  const clearance = computeEdgeClearance(cutout, platform);
  if (clearance < requiredClearance) {
    issues.push({
      type: "insufficient-clearance",
      message: `Cutout is ${Math.round(clearance)}mm from edge, minimum is ${requiredClearance}mm.`,
    });
  }

  return issues;
}

/**
 * Compute the area of a cutout in sq mm.
 */
export function computeCutoutArea(
  cutout: Cutout,
  platformPosition: Point2D
): number {
  const polygon = computeCutoutPolygon(cutout, platformPosition);
  return polygonArea(polygon);
}
