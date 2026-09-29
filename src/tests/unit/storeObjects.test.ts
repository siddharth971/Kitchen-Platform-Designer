import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/store";
import type {
  SinkInstance,
  HobInstance,
  Cabinet,
  ApplianceInstance,
  UtilityPoint,
  Cutout,
  CountertopPlatform,
} from "@/types/kitchen";
import { PLATFORM_DEFAULTS } from "@/data/presets";

describe("Store Project Slice: Phase 3 Objects and Cutouts", () => {
  beforeEach(() => {
    useAppStore.getState().resetProject("Test Kitchen", "Test Customer");
  });

  const samplePlatform: CountertopPlatform = {
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
    backsplash: {
      enabled: true,
      height: 600,
      thickness: 20,
    },
    cutouts: [],
  };

  it("can add a platform and add cutouts to it", () => {
    const { addPlatform, addCutout } = useAppStore.getState();
    addPlatform(samplePlatform);

    const cutout: Cutout = {
      id: "cutout-1",
      type: "custom",
      shape: "rect",
      x: 100,
      y: 100,
      width: 300,
      depth: 300,
    };
    addCutout("plat-1", cutout);

    const plat = useAppStore.getState().project.platforms.find((p) => p.id === "plat-1");
    expect(plat?.cutouts.length).toBe(1);
    expect(plat?.cutouts[0].id).toBe("cutout-1");
    expect(plat?.cutouts[0].width).toBe(300);
  });

  it("adds a sink and removes it cleanly, removing associated cutout", () => {
    const { addPlatform, addSink, addCutout, removeSink } = useAppStore.getState();
    addPlatform(samplePlatform);

    const sink: SinkInstance = {
      id: "sink-1",
      catalogId: "sink-single-600",
      name: "Single Bowl Sink",
      position: { x: 400, y: 850, z: 270 },
      width: 600,
      depth: 500,
      height: 200,
      cutoutWidth: 560,
      cutoutDepth: 460,
      mountingType: "topmount",
      requiredClearance: 50,
      platformId: "plat-1",
    };

    const cutout: Cutout = {
      id: "cutout-sink-1",
      type: "sink",
      shape: "rect",
      x: 200,
      y: 70,
      width: 560,
      depth: 460,
      sourceObjectId: "sink-1",
    };

    addSink(sink);
    addCutout("plat-1", cutout);

    expect(useAppStore.getState().project.sinks.length).toBe(1);
    const plat1 = useAppStore.getState().project.platforms.find((p) => p.id === "plat-1");
    expect(plat1?.cutouts.length).toBe(1);

    // Remove the sink
    removeSink("sink-1");

    expect(useAppStore.getState().project.sinks.length).toBe(0);
    // Associated cutout must also be removed automatically
    const plat1After = useAppStore.getState().project.platforms.find((p) => p.id === "plat-1");
    expect(plat1After?.cutouts.length).toBe(0);
  });

  it("adds a hob and updates its burners and dimensions", () => {
    const { addHob, updateHob } = useAppStore.getState();

    const hob: HobInstance = {
      id: "hob-1",
      catalogId: "hob-gas-4b-600",
      name: "4 Burner Gas Hob",
      position: { x: 1400, y: 850, z: 270 },
      width: 600,
      depth: 520,
      height: 50,
      cutoutWidth: 560,
      cutoutDepth: 480,
      burners: 4,
      hobType: "gas",
      requiredClearance: 50,
    };

    addHob(hob);
    expect(useAppStore.getState().project.hobs.length).toBe(1);

    updateHob("hob-1", { burners: 5, hobType: "hybrid" });
    const updated = useAppStore.getState().project.hobs.find((h) => h.id === "hob-1");
    expect(updated?.burners).toBe(5);
    expect(updated?.hobType).toBe("hybrid");
  });

  it("manages cabinets with CRUD actions", () => {
    const { addCabinet, updateCabinet, removeCabinet } = useAppStore.getState();

    const cab: Cabinet = {
      id: "cab-1",
      type: "base",
      position: { x: 200, y: 0, z: 200 },
      width: 600,
      depth: 560,
      height: 830,
      doors: 2,
      drawers: 0,
      plinthHeight: 100,
    };

    addCabinet(cab);
    expect(useAppStore.getState().project.cabinets.length).toBe(1);

    updateCabinet("cab-1", { doors: 1, drawers: 3 });
    const updated = useAppStore.getState().project.cabinets[0];
    expect(updated.drawers).toBe(3);
    expect(updated.doors).toBe(1);

    removeCabinet("cab-1");
    expect(useAppStore.getState().project.cabinets.length).toBe(0);
  });

  it("manages appliances and utility points", () => {
    const { addAppliance, removeAppliance, addUtilityPoint, updateUtilityPoint, removeUtilityPoint } =
      useAppStore.getState();

    const appl: ApplianceInstance = {
      id: "appl-1",
      catalogId: "appl-fridge-600",
      name: "Refrigerator",
      category: "refrigerator",
      position: { x: 100, y: 0, z: 2400 },
      dimensions: { width: 600, height: 1800, depth: 650 },
      powerPointRequired: true,
    };
    addAppliance(appl);
    expect(useAppStore.getState().project.appliances.length).toBe(1);

    const util: UtilityPoint = {
      id: "util-1",
      type: "electric",
      x: 100,
      y: 1100,
      z: 200,
      notes: "Fridge 16A point",
    };
    addUtilityPoint(util);
    expect(useAppStore.getState().project.utilityPoints.length).toBe(1);

    updateUtilityPoint("util-1", { notes: "Dedicated 16A" });
    expect(useAppStore.getState().project.utilityPoints[0].notes).toBe("Dedicated 16A");

    removeAppliance("appl-1");
    removeUtilityPoint("util-1");
    expect(useAppStore.getState().project.appliances.length).toBe(0);
    expect(useAppStore.getState().project.utilityPoints.length).toBe(0);
  });
});
