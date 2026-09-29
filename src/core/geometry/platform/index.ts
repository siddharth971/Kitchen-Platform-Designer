import type { Point2D } from "@/types/geometry";
import type {
  CountertopPlatform,
  CountertopPiece,
  SeamLine,
} from "@/types/kitchen";
import earcut from "earcut";

/**
 * Computes the unified 2D boundary footprint polygon for a countertop platform in global mm.
 * Vertices are returned in counter-clockwise order.
 */
export function computePlatformFootprint(platform: CountertopPlatform): Point2D[] {
  const { shape, position, overhang } = platform;
  const ox = overhang?.front ?? 0;
  const posX = position?.x ?? 0;
  const posZ = position?.z ?? 0;

  if (shape === "straight") {
    const len = platform.length;
    const depth = platform.depth + ox;

    return [
      { x: posX, z: posZ },
      { x: posX + len, z: posZ },
      { x: posX + len, z: posZ + depth },
      { x: posX, z: posZ + depth },
    ];
  }

  if (shape === "l-shaped") {
    const lenA = platform.lengthA;
    const depthA = platform.depthA + ox;
    const lenB = platform.lengthB;
    const depthB = platform.depthB + ox;

    return [
      { x: posX, z: posZ },
      { x: posX + lenA, z: posZ },
      { x: posX + lenA, z: posZ + depthA },
      { x: posX + depthB, z: posZ + depthA },
      { x: posX + depthB, z: posZ + lenB },
      { x: posX, z: posZ + lenB },
    ];
  }

  if (shape === "u-shaped") {
    const lenA = platform.lengthA;
    const depthA = platform.depthA + ox;
    const lenB = platform.lengthB;
    const depthB = platform.depthB + ox;
    const leftInset = Math.min(depthB, lenA / 2);
    const rightInset = Math.min(depthB, lenA / 2);

    return [
      { x: posX, z: posZ },
      { x: posX + lenA, z: posZ },
      { x: posX + lenA, z: posZ + depthA },
      { x: posX + lenA - rightInset, z: posZ + depthA },
      { x: posX + lenA - rightInset, z: posZ + lenB },
      { x: posX + leftInset, z: posZ + lenB },
      { x: posX + leftInset, z: posZ + depthA },
      { x: posX, z: posZ + depthA },
    ];
  }

  // Fallback for custom or rectangle
  return [
    { x: posX, z: posZ },
    { x: posX + platform.length, z: posZ },
    { x: posX + platform.length, z: posZ + platform.depth },
    { x: posX, z: posZ + platform.depth },
  ];
}

/**
 * Calculates 2D polygon area using the Shoelace formula in sq mm.
 */
export function calculatePolygonArea(polygon: Point2D[]): number {
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
 * Triangulates a polygon (with optional cutout holes) using earcut.
 * Returns vertices flat array and triangle indices.
 */
export function triangulateFootprint(
  polygon: Point2D[],
  holes: Point2D[][] = []
): { vertices: number[]; indices: number[]; triangulatedArea: number } {
  const flatCoords: number[] = [];
  const holeIndices: number[] = [];

  // Add outer boundary
  for (const p of polygon) {
    flatCoords.push(p.x, p.z);
  }

  // Add hole boundaries
  for (const hole of holes) {
    holeIndices.push(flatCoords.length / 2);
    for (const p of hole) {
      flatCoords.push(p.x, p.z);
    }
  }

  const indices = earcut(flatCoords, holeIndices, 2);

  // Calculate sum of triangle areas to verify triangulation accuracy
  let triangulatedArea = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 2;
    const i1 = indices[i + 1] * 2;
    const i2 = indices[i + 2] * 2;

    const x0 = flatCoords[i0];
    const z0 = flatCoords[i0 + 1];
    const x1 = flatCoords[i1];
    const z1 = flatCoords[i1 + 1];
    const x2 = flatCoords[i2];
    const z2 = flatCoords[i2 + 1];

    const triArea = Math.abs((x0 * (z1 - z2) + x1 * (z2 - z0) + x2 * (z0 - z1)) / 2);
    triangulatedArea += triArea;
  }

  return { vertices: flatCoords, indices, triangulatedArea };
}

/**
 * Computes seam lines for fabrication.
 * - Corner join for L-shape ('square' or 'miter').
 * - Expansion seams if any piece exceeds maxPieceLengthMm.
 * - Avoids crossing cutouts (enforces min clearance, e.g. 150 mm).
 */
export function computePlatformSeams(
  platform: CountertopPlatform,
  maxPieceLengthMm: number = 2400,
  minSeamCutoutDistanceMm: number = 150
): SeamLine[] {
  const seams: SeamLine[] = [];
  const posX = platform.position.x;
  const posZ = platform.position.z;

  if (platform.shape === "l-shaped") {
    if (platform.cornerStyle === "miter") {
      seams.push({
        id: `seam-corner-${platform.id}`,
        platformId: platform.id,
        start: { x: posX, z: posZ },
        end: { x: posX + platform.depthB, z: posZ + platform.depthA },
        reason: "corner-joint",
        isValid: true,
      });
    } else {
      seams.push({
        id: `seam-corner-${platform.id}`,
        platformId: platform.id,
        start: { x: posX + platform.depthB, z: posZ },
        end: { x: posX + platform.depthB, z: posZ + platform.depthA },
        reason: "corner-joint",
        isValid: true,
      });
    }

    const legARun = platform.lengthA - platform.depthB;
    if (legARun > maxPieceLengthMm) {
      const seamX = posX + platform.depthB + Math.round(legARun / 2);
      seams.push({
        id: `seam-legA-${platform.id}`,
        platformId: platform.id,
        start: { x: seamX, z: posZ },
        end: { x: seamX, z: posZ + platform.depthA },
        reason: "max-length",
        isValid: true,
      });
    }

    const legBRun = platform.lengthB - platform.depthA;
    if (legBRun > maxPieceLengthMm) {
      const seamZ = posZ + platform.depthA + Math.round(legBRun / 2);
      seams.push({
        id: `seam-legB-${platform.id}`,
        platformId: platform.id,
        start: { x: posX, z: seamZ },
        end: { x: posX + platform.depthB, z: seamZ },
        reason: "max-length",
        isValid: true,
      });
    }
  } else if (platform.shape === "u-shaped") {
    const leftLegX = posX + Math.min(platform.depthB, platform.lengthA / 2);
    const rightLegX = posX + platform.lengthA - Math.min(platform.depthB, platform.lengthA / 2);
    seams.push({
      id: `seam-left-${platform.id}`,
      platformId: platform.id,
      start: { x: leftLegX, z: posZ },
      end: { x: leftLegX, z: posZ + platform.depthA },
      reason: "corner-joint",
      isValid: true,
    });
    seams.push({
      id: `seam-right-${platform.id}`,
      platformId: platform.id,
      start: { x: rightLegX, z: posZ },
      end: { x: rightLegX, z: posZ + platform.depthA },
      reason: "corner-joint",
      isValid: true,
    });
  } else {
    // Straight platform seams
    if (platform.length > maxPieceLengthMm) {
      const piecesCount = Math.ceil(platform.length / maxPieceLengthMm);
      const pieceLen = platform.length / piecesCount;
      for (let i = 1; i < piecesCount; i++) {
        const seamX = posX + Math.round(i * pieceLen);
        seams.push({
          id: `seam-${i}-${platform.id}`,
          platformId: platform.id,
          start: { x: seamX, z: posZ },
          end: { x: seamX, z: posZ + platform.depth },
          reason: "max-length",
          isValid: true,
        });
      }
    }
  }

  // Validate seams against cutouts
  if (platform.cutouts && platform.cutouts.length > 0) {
    for (const seam of seams) {
      for (const cutout of platform.cutouts) {
        // Cutout bounding box in global mm
        const cutoutMinX = posX + cutout.x;
        const cutoutMaxX = cutoutMinX + cutout.width;
        const cutoutMinZ = posZ + cutout.y;
        const cutoutMaxZ = cutoutMinZ + cutout.depth;

        // Check if seam line intersects or violates min clearance
        const isNearX =
          seam.start.x >= cutoutMinX - minSeamCutoutDistanceMm &&
          seam.start.x <= cutoutMaxX + minSeamCutoutDistanceMm;
        const isNearZ =
          seam.start.z >= cutoutMinZ - minSeamCutoutDistanceMm &&
          seam.start.z <= cutoutMaxZ + minSeamCutoutDistanceMm;

        if (isNearX && isNearZ) {
          seam.isValid = false;
          seam.warning = `Seam is closer than ${minSeamCutoutDistanceMm}mm to cutout "${cutout.id}"`;
        }
      }
    }
  }

  return seams;
}

/**
 * Decomposes a platform into fabrication pieces (slabs) for nesting and cut lists.
 */
export function decomposePlatformIntoPieces(
  platform: CountertopPlatform,
  maxPieceLengthMm: number = 2400
): CountertopPiece[] {
  const pieces: CountertopPiece[] = [];
  const posX = platform.position.x;
  const posZ = platform.position.z;

  if (platform.shape === "straight") {
    const seams = computePlatformSeams(platform, maxPieceLengthMm);
    if (seams.length === 0) {
      pieces.push({
        id: `${platform.id}-p1`,
        platformId: platform.id,
        label: "Piece 1 (Main)",
        polygon: [
          { x: posX, z: posZ },
          { x: posX + platform.length, z: posZ },
          { x: posX + platform.length, z: posZ + platform.depth },
          { x: posX, z: posZ + platform.depth },
        ],
        lengthMm: platform.length,
        depthMm: platform.depth,
        thicknessMm: platform.slabThickness,
        areaSqMm: platform.length * platform.depth,
        edgeProfileId: platform.edgeProfileId,
      });
    } else {
      let currentX = posX;
      seams.forEach((seam, idx) => {
        const segLen = seam.start.x - currentX;
        pieces.push({
          id: `${platform.id}-p${idx + 1}`,
          platformId: platform.id,
          label: `Piece ${idx + 1}`,
          polygon: [
            { x: currentX, z: posZ },
            { x: seam.start.x, z: posZ },
            { x: seam.start.x, z: posZ + platform.depth },
            { x: currentX, z: posZ + platform.depth },
          ],
          lengthMm: segLen,
          depthMm: platform.depth,
          thicknessMm: platform.slabThickness,
          areaSqMm: segLen * platform.depth,
          edgeProfileId: platform.edgeProfileId,
        });
        currentX = seam.start.x;
      });
      // Final piece
      const lastLen = posX + platform.length - currentX;
      pieces.push({
        id: `${platform.id}-p${seams.length + 1}`,
        platformId: platform.id,
        label: `Piece ${seams.length + 1}`,
        polygon: [
          { x: currentX, z: posZ },
          { x: posX + platform.length, z: posZ },
          { x: posX + platform.length, z: posZ + platform.depth },
          { x: currentX, z: posZ + platform.depth },
        ],
        lengthMm: lastLen,
        depthMm: platform.depth,
        thicknessMm: platform.slabThickness,
        areaSqMm: lastLen * platform.depth,
        edgeProfileId: platform.edgeProfileId,
      });
    }
  } else if (platform.shape === "l-shaped") {
    const cornerRunA = platform.lengthA;
    pieces.push({
      id: `${platform.id}-runA`,
      platformId: platform.id,
      label: "Piece 1 (Run A)",
      polygon: [
        { x: posX, z: posZ },
        { x: posX + cornerRunA, z: posZ },
        { x: posX + cornerRunA, z: posZ + platform.depthA },
        { x: posX, z: posZ + platform.depthA },
      ],
      lengthMm: cornerRunA,
      depthMm: platform.depthA,
      thicknessMm: platform.slabThickness,
      areaSqMm: cornerRunA * platform.depthA,
      edgeProfileId: platform.edgeProfileId,
    });

    const runBLen = platform.lengthB - platform.depthA;
    pieces.push({
      id: `${platform.id}-runB`,
      platformId: platform.id,
      label: "Piece 2 (Run B)",
      polygon: [
        { x: posX, z: posZ + platform.depthA },
        { x: posX + platform.depthB, z: posZ + platform.depthA },
        { x: posX + platform.depthB, z: posZ + platform.lengthB },
        { x: posX, z: posZ + platform.lengthB },
      ],
      lengthMm: runBLen,
      depthMm: platform.depthB,
      thicknessMm: platform.slabThickness,
      areaSqMm: runBLen * platform.depthB,
      edgeProfileId: platform.edgeProfileId,
    });
  } else if (platform.shape === "u-shaped") {
    const leftInset = Math.min(platform.depthB, platform.lengthA / 2);
    const rightInset = Math.min(platform.depthB, platform.lengthA / 2);
    const baseRunLength = platform.lengthA;
    const legRunLength = Math.max(0, platform.lengthB - platform.depthA);

    pieces.push({
      id: `${platform.id}-base`,
      platformId: platform.id,
      label: "Piece 1 (Base)",
      polygon: [
        { x: posX, z: posZ },
        { x: posX + baseRunLength, z: posZ },
        { x: posX + baseRunLength, z: posZ + platform.depthA },
        { x: posX, z: posZ + platform.depthA },
      ],
      lengthMm: baseRunLength,
      depthMm: platform.depthA,
      thicknessMm: platform.slabThickness,
      areaSqMm: baseRunLength * platform.depthA,
      edgeProfileId: platform.edgeProfileId,
    });

    pieces.push({
      id: `${platform.id}-left-leg`,
      platformId: platform.id,
      label: "Piece 2 (Left Leg)",
      polygon: [
        { x: posX, z: posZ + platform.depthA },
        { x: posX + leftInset, z: posZ + platform.depthA },
        { x: posX + leftInset, z: posZ + platform.lengthB },
        { x: posX, z: posZ + platform.lengthB },
      ],
      lengthMm: legRunLength,
      depthMm: leftInset,
      thicknessMm: platform.slabThickness,
      areaSqMm: legRunLength * leftInset,
      edgeProfileId: platform.edgeProfileId,
    });

    pieces.push({
      id: `${platform.id}-right-leg`,
      platformId: platform.id,
      label: "Piece 3 (Right Leg)",
      polygon: [
        { x: posX + platform.lengthA - rightInset, z: posZ + platform.depthA },
        { x: posX + platform.lengthA, z: posZ + platform.depthA },
        { x: posX + platform.lengthA, z: posZ + platform.lengthB },
        { x: posX + platform.lengthA - rightInset, z: posZ + platform.lengthB },
      ],
      lengthMm: legRunLength,
      depthMm: rightInset,
      thicknessMm: platform.slabThickness,
      areaSqMm: legRunLength * rightInset,
      edgeProfileId: platform.edgeProfileId,
    });
  }

  return pieces;
}

/**
 * Calculates complete quantities for a countertop platform.
 */
export function calculatePlatformQuantities(
  platform: CountertopPlatform,
  wastePercent: number = 8
): {
  grossAreaSqMm: number;
  cutoutAreaSqMm: number;
  netAreaSqMm: number;
  billableAreaGrossSqMm: number;
  billableAreaNetWithWasteSqMm: number;
  backsplashLengthMm: number;
  backsplashAreaSqMm: number;
  finishedEdgeLengthMm: number;
  piecesCount: number;
  seamsCount: number;
} {
  const footprint = computePlatformFootprint(platform);
  const grossAreaSqMm = calculatePolygonArea(footprint);

  let cutoutAreaSqMm = 0;
  if (platform.cutouts && platform.cutouts.length > 0) {
    for (const c of platform.cutouts) {
      cutoutAreaSqMm += c.width * c.depth;
    }
  }

  const netAreaSqMm = Math.max(0, grossAreaSqMm - cutoutAreaSqMm);
  const wasteMultiplier = 1 + wastePercent / 100;
  const billableAreaGrossSqMm = grossAreaSqMm;
  const billableAreaNetWithWasteSqMm = netAreaSqMm * wasteMultiplier;

  // Backsplash calculations
  let backsplashLengthMm = 0;
  if (platform.backsplash?.enabled) {
    if (platform.shape === "straight") {
      backsplashLengthMm = platform.length;
    } else if (platform.shape === "l-shaped") {
      backsplashLengthMm = platform.lengthA + platform.lengthB;
    } else if (platform.shape === "u-shaped") {
      backsplashLengthMm = platform.lengthA + 2 * platform.lengthB;
    }
  }
  const backsplashAreaSqMm =
    backsplashLengthMm * (platform.backsplash?.height ?? 600);

  // Finished edge length (front edges and exposed returns)
  let finishedEdgeLengthMm = 0;
  if (platform.shape === "straight") {
    finishedEdgeLengthMm = platform.length + platform.depth * 2;
  } else if (platform.shape === "l-shaped") {
    finishedEdgeLengthMm =
      platform.lengthA - platform.depthB + (platform.lengthB - platform.depthA) +
      platform.depthA + platform.depthB;
  } else if (platform.shape === "u-shaped") {
    finishedEdgeLengthMm =
      platform.lengthA + platform.lengthB * 2;
  }

  const seams = computePlatformSeams(platform);
  const pieces = decomposePlatformIntoPieces(platform);

  return {
    grossAreaSqMm,
    cutoutAreaSqMm,
    netAreaSqMm,
    billableAreaGrossSqMm,
    billableAreaNetWithWasteSqMm,
    backsplashLengthMm,
    backsplashAreaSqMm,
    finishedEdgeLengthMm,
    piecesCount: pieces.length,
    seamsCount: seams.length,
  };
}
