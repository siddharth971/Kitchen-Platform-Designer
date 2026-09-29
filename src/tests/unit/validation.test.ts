import { describe, it, expect } from "vitest";
import {
  checkSinkHobSeparation,
  checkCutoutEdgeClearances,
  checkCutoutContainment,
  checkCutoutOverlap,
  checkWindowSillHeight,
  runProjectValidation,
  SINK_HOB_MIN_SEPARATION_MM,
  CUTOUT_MIN_EDGE_CLEARANCE_MM,
} from "@/core/validation";
import type { CountertopPlatform, Cutout, SinkInstance, HobInstance } from "@/types/kitchen";
import type { Wall, Project } from "@/types/project";
import { DEFAULT_ROOM_PRESET, DEFAULT_PRICING_CONFIG } from "@/data/presets";

describe("Core Validation Engine (Phase 4)", () => {
  const basePlatform: CountertopPlatform = {
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
    overhang: { front: 25, side: 0, back: 0 },
    backsplash: { enabled: true, height: 600, thickness: 20 },
    cutouts: [],
  };

  describe("Rule: Sink to Hob Separation", () => {
    it("fails when sink and hob are closer than 600mm", () => {
      const sink: SinkInstance = {
        id: "sink-1",
        catalogId: "sink-600",
        name: "Kitchen Sink",
        position: { x: 300, y: 850, z: 250 },
        width: 600,
        depth: 500,
        height: 200,
        cutoutWidth: 560,
        cutoutDepth: 460,
        mountingType: "topmount",
        requiredClearance: 50,
      };

      // Hob placed immediately next to sink (clearance 100mm < 600mm)
      const hob: HobInstance = {
        id: "hob-1",
        catalogId: "hob-600",
        name: "Gas Hob",
        position: { x: 1000, y: 850, z: 250 }, // dx = 1000 - (300 + 600) = 100mm
        width: 600,
        depth: 520,
        height: 50,
        cutoutWidth: 560,
        cutoutDepth: 480,
        burners: 4,
        hobType: "gas",
        requiredClearance: 50,
      };

      const issues = checkSinkHobSeparation([sink], [hob]);
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe("sink-hob-clearance");
      expect(issues[0].metric?.actual).toBe(100);
      expect(issues[0].metric?.threshold).toBe(SINK_HOB_MIN_SEPARATION_MM);
    });

    it("passes when sink and hob have at least 600mm clearance", () => {
      const sink: SinkInstance = {
        id: "sink-1",
        catalogId: "sink-600",
        name: "Kitchen Sink",
        position: { x: 200, y: 850, z: 250 },
        width: 600,
        depth: 500,
        height: 200,
        cutoutWidth: 560,
        cutoutDepth: 460,
        mountingType: "topmount",
        requiredClearance: 50,
      };

      // Hob placed with 700mm clearance
      const hob: HobInstance = {
        id: "hob-1",
        catalogId: "hob-600",
        name: "Gas Hob",
        position: { x: 1500, y: 850, z: 250 }, // dx = 1500 - (200 + 600) = 700mm
        width: 600,
        depth: 520,
        height: 50,
        cutoutWidth: 560,
        cutoutDepth: 480,
        burners: 4,
        hobType: "gas",
        requiredClearance: 50,
      };

      const issues = checkSinkHobSeparation([sink], [hob]);
      expect(issues.length).toBe(0);
    });
  });

  describe("Rule: Cutout Edge Clearance", () => {
    it("fails when a cutout is too close to slab edge (< 50mm)", () => {
      // Cutout placed at y = 15mm from front edge of 600mm depth platform
      const fragileCutout: Cutout = {
        id: "cutout-fragile",
        type: "sink",
        shape: "rect",
        x: 200,
        y: 15,
        width: 500,
        depth: 450,
      };

      const platWithFragileCutout: CountertopPlatform = {
        ...basePlatform,
        cutouts: [fragileCutout],
      };

      const issues = checkCutoutEdgeClearances([platWithFragileCutout]);
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe("cutout-edge-clearance");
      expect(issues[0].severity).toBe("error");
      expect(issues[0].metric?.actual).toBeLessThan(CUTOUT_MIN_EDGE_CLEARANCE_MM);
    });

    it("passes when a cutout has safe edge clearance (>= 50mm)", () => {
      // Cutout placed at x=200, y=70 on a 2400x600 platform
      // Clearance: min(70, 600-(70+460)=70, 200) = 70mm >= 50mm
      const safeCutout: Cutout = {
        id: "cutout-safe",
        type: "sink",
        shape: "rect",
        x: 200,
        y: 70,
        width: 560,
        depth: 460,
      };

      const platWithSafeCutout: CountertopPlatform = {
        ...basePlatform,
        cutouts: [safeCutout],
      };

      const issues = checkCutoutEdgeClearances([platWithSafeCutout]);
      expect(issues.length).toBe(0);
    });
  });

  describe("Rule: Cutout Boundary Containment", () => {
    it("fails when cutout spills beyond platform edge", () => {
      // Platform length 2400, cutout placed at x=2200 with width 400 (reaches 2600mm)
      const overflowingCutout: Cutout = {
        id: "cutout-overflow",
        type: "hob",
        shape: "rect",
        x: 2200,
        y: 100,
        width: 400,
        depth: 400,
      };

      const plat: CountertopPlatform = {
        ...basePlatform,
        cutouts: [overflowingCutout],
      };

      const issues = checkCutoutContainment([plat]);
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe("cutout-outside-platform");
      expect(issues[0].severity).toBe("error");
    });

    it("passes when cutout is fully enclosed within platform", () => {
      const insideCutout: Cutout = {
        id: "cutout-inside",
        type: "hob",
        shape: "rect",
        x: 1000,
        y: 100,
        width: 500,
        depth: 400,
      };

      const plat: CountertopPlatform = {
        ...basePlatform,
        cutouts: [insideCutout],
      };

      const issues = checkCutoutContainment([plat]);
      expect(issues.length).toBe(0);
    });
  });

  describe("Rule: Cutout Overlap & Web Thickness", () => {
    it("fails with error when two cutouts physically overlap", () => {
      const c1: Cutout = {
        id: "c1",
        type: "sink",
        shape: "rect",
        x: 500,
        y: 100,
        width: 500,
        depth: 400,
      };
      const c2: Cutout = {
        id: "c2",
        type: "hob",
        shape: "rect",
        x: 700, // overlaps c1 (500 to 1000)
        y: 100,
        width: 500,
        depth: 400,
      };

      const plat: CountertopPlatform = {
        ...basePlatform,
        cutouts: [c1, c2],
      };

      const issues = checkCutoutOverlap([plat]);
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe("cutouts-collide");
      expect(issues[0].severity).toBe("error");
    });

    it("warns when stone bridge between cutouts is under 100mm", () => {
      const c1: Cutout = {
        id: "c1",
        type: "sink",
        shape: "rect",
        x: 200,
        y: 100,
        width: 500,
        depth: 400,
      };
      const c2: Cutout = {
        id: "c2",
        type: "hob",
        shape: "rect",
        x: 750, // dx = 750 - 700 = 50mm (< 100mm)
        y: 100,
        width: 500,
        depth: 400,
      };

      const plat: CountertopPlatform = {
        ...basePlatform,
        cutouts: [c1, c2],
      };

      const issues = checkCutoutOverlap([plat]);
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe("cutout-web-thickness");
      expect(issues[0].severity).toBe("warning");
    });

    it("passes when stone bridge between cutouts is >= 100mm", () => {
      const c1: Cutout = {
        id: "c1",
        type: "sink",
        shape: "rect",
        x: 200,
        y: 100,
        width: 500,
        depth: 400,
      };
      const c2: Cutout = {
        id: "c2",
        type: "hob",
        shape: "rect",
        x: 850, // dx = 850 - 700 = 150mm >= 100mm
        y: 100,
        width: 500,
        depth: 400,
      };

      const plat: CountertopPlatform = {
        ...basePlatform,
        cutouts: [c1, c2],
      };

      const issues = checkCutoutOverlap([plat]);
      expect(issues.length).toBe(0);
    });
  });

  describe("Rule: Window Sill Height vs Countertop", () => {
    it("warns when window sill is lower than countertop working height", () => {
      const lowWindowWall: Wall = {
        id: "wall-north",
        start: { x: 0, z: 0 },
        end: { x: 3600, z: 0 },
        thickness: 200,
        height: 3000,
        openings: [
          {
            id: "win-1",
            type: "window",
            offset: 1000,
            width: 1200,
            height: 1200,
            sillHeight: 750, // 750mm < 850mm countertop
          },
        ],
      };

      const issues = checkWindowSillHeight([lowWindowWall], [basePlatform]);
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe("window-sill-height");
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].metric?.actual).toBe(750);
      expect(issues[0].metric?.threshold).toBe(850);
    });

    it("passes when window sill is higher than countertop working height", () => {
      const normalWindowWall: Wall = {
        id: "wall-north",
        start: { x: 0, z: 0 },
        end: { x: 3600, z: 0 },
        thickness: 200,
        height: 3000,
        openings: [
          {
            id: "win-1",
            type: "window",
            offset: 1000,
            width: 1200,
            height: 1200,
            sillHeight: 950, // 950mm > 850mm
          },
        ],
      };

      const issues = checkWindowSillHeight([normalWindowWall], [basePlatform]);
      expect(issues.length).toBe(0);
    });
  });

  describe("Master Validation Runner", () => {
    it("runs project validation and returns aggregated report", () => {
      const dummyProject: Project = {
        schemaVersion: 1,
        id: "test-proj",
        name: "Validation Test Project",
        customer: { name: "Test User", location: "Mumbai" },
        units: "metric",
        displayUnit: "mm",
        currency: "INR",
        locale: "en-IN",
        kitchenType: "straight",
        room: DEFAULT_ROOM_PRESET,
        walls: [],
        platforms: [basePlatform],
        cabinets: [],
        appliances: [],
        sinks: [],
        hobs: [],
        utilityPoints: [],
        materials: [],
        measurements: [],
        pricing: DEFAULT_PRICING_CONFIG,
        settings: {
          snapStep: 10,
          snapEnabled: true,
          gridVisible: true,
          gridSize: 100,
          showDimensions: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const report = runProjectValidation(dummyProject);
      expect(report.isValid).toBe(true);
      expect(report.errorsCount).toBe(0);
      expect(report.issues.length).toBe(0);
    });
  });
});
