import type { Wall, Room } from "@/types/project";
import type { Point3D, Dimensions3D } from "@/types/geometry";

export interface WallBlock {
  id: string;
  wallId: string;
  partType: "solid" | "sill" | "header";
  center: Point3D; // in mm
  dimensions: Dimensions3D; // width=length along wall, height=y, depth=thickness (all in mm)
  rotationY: number; // in radians
  localStart: number; // mm along wall
  localEnd: number;   // mm along wall
}

/**
 * Calculates Euclidean distance between two 2D points in mm.
 */
export function getWallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.hypot(dx, dz);
}

/**
 * Calculates rotation angle of the wall around the Y axis in radians.
 */
export function getWallAngle(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.atan2(dz, dx);
}

/**
 * Generates solid sub-blocks representing wall geometry with exact physical openings.
 * Pure domain logic: no Babylon or UI dependencies.
 */
export function generateWallSegments(wall: Wall): WallBlock[] {
  const totalLength = getWallLength(wall);
  if (totalLength <= 0 || wall.height <= 0 || wall.thickness <= 0) {
    return [];
  }

  const angle = getWallAngle(wall);
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);

  // If no openings, return a single solid block
  if (!wall.openings || wall.openings.length === 0) {
    const midU = totalLength / 2;
    return [
      {
        id: `${wall.id}-full`,
        wallId: wall.id,
        partType: "solid",
        center: {
          x: wall.start.x + midU * dirX,
          y: wall.height / 2,
          z: wall.start.z + midU * dirZ,
        },
        dimensions: {
          width: totalLength,
          height: wall.height,
          depth: wall.thickness,
        },
        rotationY: angle,
        localStart: 0,
        localEnd: totalLength,
      },
    ];
  }

  // Filter and sort openings that fall inside the wall length
  const validOpenings = wall.openings
    .filter((op) => op.offset < totalLength && op.offset + op.width > 0)
    .map((op) => ({
      ...op,
      offset: Math.max(0, op.offset),
      width: Math.min(op.width, totalLength - Math.max(0, op.offset)),
      sillHeight: Math.max(0, op.sillHeight ?? 0),
    }))
    .sort((a, b) => a.offset - b.offset);

  const blocks: WallBlock[] = [];
  let currentU = 0;

  validOpenings.forEach((opening, index) => {
    // 1. Solid segment before this opening
    if (opening.offset > currentU) {
      const segLen = opening.offset - currentU;
      const midU = currentU + segLen / 2;
      blocks.push({
        id: `${wall.id}-seg-${index}`,
        wallId: wall.id,
        partType: "solid",
        center: {
          x: wall.start.x + midU * dirX,
          y: wall.height / 2,
          z: wall.start.z + midU * dirZ,
        },
        dimensions: {
          width: segLen,
          height: wall.height,
          depth: wall.thickness,
        },
        rotationY: angle,
        localStart: currentU,
        localEnd: opening.offset,
      });
    }

    const opEnd = opening.offset + opening.width;
    const opMidU = opening.offset + opening.width / 2;

    // 2. Sill block below window (if sillHeight > 0)
    if (opening.sillHeight > 0) {
      const sillH = Math.min(opening.sillHeight, wall.height);
      blocks.push({
        id: `${wall.id}-sill-${opening.id}`,
        wallId: wall.id,
        partType: "sill",
        center: {
          x: wall.start.x + opMidU * dirX,
          y: sillH / 2,
          z: wall.start.z + opMidU * dirZ,
        },
        dimensions: {
          width: opening.width,
          height: sillH,
          depth: wall.thickness,
        },
        rotationY: angle,
        localStart: opening.offset,
        localEnd: opEnd,
      });
    }

    // 3. Header block above opening (if opening.sillHeight + opening.height < wall.height)
    const opTop = opening.sillHeight + opening.height;
    if (opTop < wall.height) {
      const headerH = wall.height - opTop;
      blocks.push({
        id: `${wall.id}-header-${opening.id}`,
        wallId: wall.id,
        partType: "header",
        center: {
          x: wall.start.x + opMidU * dirX,
          y: opTop + headerH / 2,
          z: wall.start.z + opMidU * dirZ,
        },
        dimensions: {
          width: opening.width,
          height: headerH,
          depth: wall.thickness,
        },
        rotationY: angle,
        localStart: opening.offset,
        localEnd: opEnd,
      });
    }

    currentU = Math.max(currentU, opEnd);
  });

  // 4. Solid segment after the last opening
  if (currentU < totalLength) {
    const segLen = totalLength - currentU;
    const midU = currentU + segLen / 2;
    blocks.push({
      id: `${wall.id}-seg-end`,
      wallId: wall.id,
      partType: "solid",
      center: {
        x: wall.start.x + midU * dirX,
        y: wall.height / 2,
        z: wall.start.z + midU * dirZ,
      },
      dimensions: {
        width: segLen,
        height: wall.height,
        depth: wall.thickness,
      },
      rotationY: angle,
      localStart: currentU,
      localEnd: totalLength,
    });
  }

  return blocks;
}

/**
 * Calculates gross wall area, opening area, and net wall area in sq mm.
 */
export function calculateWallAreas(wall: Wall): {
  grossAreaSqMm: number;
  openingsAreaSqMm: number;
  netAreaSqMm: number;
} {
  const length = getWallLength(wall);
  const grossAreaSqMm = length * wall.height;

  let openingsAreaSqMm = 0;
  if (wall.openings && wall.openings.length > 0) {
    for (const op of wall.openings) {
      openingsAreaSqMm += op.width * op.height;
    }
  }

  const netAreaSqMm = Math.max(0, grossAreaSqMm - openingsAreaSqMm);
  return { grossAreaSqMm, openingsAreaSqMm, netAreaSqMm };
}

/**
 * Creates 4 boundary walls for a rectangular room.
 */
export function generateRoomWalls(room: Room): Wall[] {
  const { length, width, height, wallThickness, wallColor } = room;

  return [
    {
      id: "wall-front", // South wall: along X at Z=0
      start: { x: 0, z: 0 },
      end: { x: length, z: 0 },
      height,
      thickness: wallThickness,
      color: wallColor,
      openings: [],
    },
    {
      id: "wall-right", // East wall: along Z at X=length
      start: { x: length, z: 0 },
      end: { x: length, z: width },
      height,
      thickness: wallThickness,
      color: wallColor,
      openings: [],
    },
    {
      id: "wall-back", // North wall: along X at Z=width
      start: { x: length, z: width },
      end: { x: 0, z: width },
      height,
      thickness: wallThickness,
      color: wallColor,
      openings: [],
    },
    {
      id: "wall-left", // West wall: along Z at X=0
      start: { x: 0, z: width },
      end: { x: 0, z: 0 },
      height,
      thickness: wallThickness,
      color: wallColor,
      openings: [],
    },
  ];
}
