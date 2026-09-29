import { describe, it, expect } from "vitest";
import {
  getWallLength,
  getWallAngle,
  generateWallSegments,
  calculateWallAreas,
  generateRoomWalls,
} from "@/core/geometry/wall";
import type { Wall } from "@/types/project";

describe("core/geometry/wall", () => {
  const solidWall: Wall = {
    id: "wall-1",
    start: { x: 0, z: 0 },
    end: { x: 3000, z: 0 },
    height: 2800,
    thickness: 150,
    openings: [],
  };

  it("calculates wall length and angle", () => {
    expect(getWallLength(solidWall)).toBe(3000);
    expect(getWallAngle(solidWall)).toBe(0);

    const verticalWall: Wall = {
      ...solidWall,
      end: { x: 0, z: 4000 },
    };
    expect(getWallLength(verticalWall)).toBe(4000);
    expect(getWallAngle(verticalWall)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("generates a single solid block for walls without openings", () => {
    const blocks = generateWallSegments(solidWall);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].partType).toBe("solid");
    expect(blocks[0].dimensions.width).toBe(3000);
    expect(blocks[0].dimensions.height).toBe(2800);
    expect(blocks[0].dimensions.depth).toBe(150);
    expect(blocks[0].center.x).toBe(1500);
    expect(blocks[0].center.y).toBe(1400);
    expect(blocks[0].center.z).toBe(0);
  });

  it("generates correct blocks for a wall with a door opening", () => {
    const doorWall: Wall = {
      ...solidWall,
      openings: [
        {
          id: "door-1",
          type: "door",
          offset: 1000, // starts at 1000mm
          width: 900,   // 900mm wide
          height: 2100, // 2100mm high
          sillHeight: 0,
        },
      ],
    };

    const blocks = generateWallSegments(doorWall);
    // Should have:
    // 1. Solid left segment: [0, 1000] (width 1000, height 2800)
    // 2. Header above door: [1000, 1900] (width 900, height 700: 2100 to 2800)
    // 3. Solid right segment: [1900, 3000] (width 1100, height 2800)
    expect(blocks).toHaveLength(3);

    const left = blocks.find((b) => b.localStart === 0 && b.localEnd === 1000);
    expect(left).toBeDefined();
    expect(left?.partType).toBe("solid");
    expect(left?.dimensions.width).toBe(1000);
    expect(left?.dimensions.height).toBe(2800);

    const header = blocks.find((b) => b.partType === "header");
    expect(header).toBeDefined();
    expect(header?.dimensions.width).toBe(900);
    expect(header?.dimensions.height).toBe(700);
    expect(header?.center.y).toBe(2100 + 350);

    const right = blocks.find((b) => b.localStart === 1900 && b.localEnd === 3000);
    expect(right).toBeDefined();
    expect(right?.partType).toBe("solid");
    expect(right?.dimensions.width).toBe(1100);
    expect(right?.dimensions.height).toBe(2800);
  });

  it("generates correct blocks for a wall with a window opening (sill + header)", () => {
    const windowWall: Wall = {
      ...solidWall,
      openings: [
        {
          id: "win-1",
          type: "window",
          offset: 800,
          width: 1200,
          height: 1200,
          sillHeight: 900,
        },
      ],
    };

    const blocks = generateWallSegments(windowWall);
    // Expected:
    // 1. Solid left segment: [0, 800]
    // 2. Sill block below window: [800, 2000], height 900
    // 3. Header block above window: [800, 2000], height 2800 - 2100 = 700
    // 4. Solid right segment: [2000, 3000]
    expect(blocks).toHaveLength(4);

    const sill = blocks.find((b) => b.partType === "sill");
    expect(sill).toBeDefined();
    expect(sill?.dimensions.width).toBe(1200);
    expect(sill?.dimensions.height).toBe(900);
    expect(sill?.center.y).toBe(450);

    const header = blocks.find((b) => b.partType === "header");
    expect(header).toBeDefined();
    expect(header?.dimensions.width).toBe(1200);
    expect(header?.dimensions.height).toBe(700);
    expect(header?.center.y).toBe(2100 + 350);
  });

  it("calculates gross, openings, and net area", () => {
    const windowWall: Wall = {
      ...solidWall,
      openings: [
        {
          id: "win-1",
          type: "window",
          offset: 800,
          width: 1200,
          height: 1200,
          sillHeight: 900,
        },
      ],
    };

    const areas = calculateWallAreas(windowWall);
    const gross = 3000 * 2800; // 8,400,000 sq mm
    const opening = 1200 * 1200; // 1,440,000 sq mm
    expect(areas.grossAreaSqMm).toBe(gross);
    expect(areas.openingsAreaSqMm).toBe(opening);
    expect(areas.netAreaSqMm).toBe(gross - opening);
  });

  it("generates 4 room walls matching dimensions", () => {
    const walls = generateRoomWalls({
      length: 3600,
      width: 3000,
      height: 2900,
      wallThickness: 150,
      floorColor: "#f3f4f6",
      wallColor: "#ffffff",
      ceilingVisible: false,
    });

    expect(walls).toHaveLength(4);
    expect(walls[0].id).toBe("wall-front");
    expect(getWallLength(walls[0])).toBe(3600);

    expect(walls[1].id).toBe("wall-right");
    expect(getWallLength(walls[1])).toBe(3000);

    expect(walls[2].id).toBe("wall-back");
    expect(getWallLength(walls[2])).toBe(3600);

    expect(walls[3].id).toBe("wall-left");
    expect(getWallLength(walls[3])).toBe(3000);
  });
});
