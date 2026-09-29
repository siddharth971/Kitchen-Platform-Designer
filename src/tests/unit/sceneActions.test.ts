import { describe, expect, it } from "vitest";
import { createInitialProject } from "@/store/projectSlice";
import {
  alignSelection,
  deleteSelection,
  distributeSelection,
  groupSelection,
  repeatCabinet,
} from "@/core/geometry/sceneActions";

describe("scene selection actions", () => {
  it("aligns selected cabinet bounds without changing their IDs", () => {
    const project = createInitialProject();
    project.cabinets = [
      { id: "a", type: "base", position: { x: 100, y: 0, z: 0 }, width: 600, height: 720, depth: 560, doors: 2, drawers: 0 },
      { id: "b", type: "base", position: { x: 1200, y: 0, z: 0 }, width: 500, height: 720, depth: 560, doors: 2, drawers: 0 },
    ];

    const aligned = alignSelection(project, [
      { id: "a", type: "cabinet" },
      { id: "b", type: "cabinet" },
    ], "left");

    expect(aligned.cabinets.map((item) => item.id)).toEqual(["a", "b"]);
    expect(aligned.cabinets[0].position.x).toBe(aligned.cabinets[1].position.x);
  });

  it("distributes interior cabinet centers evenly", () => {
    const project = createInitialProject();
    project.cabinets = [100, 550, 1600].map((x, index) => ({
      id: `cab-${index}`,
      type: "base" as const,
      position: { x, y: 0, z: 0 },
      width: 400,
      height: 720,
      depth: 560,
      doors: 1,
      drawers: 0,
    }));

    const result = distributeSelection(project, project.cabinets.map((cabinet) => ({ id: cabinet.id, type: "cabinet" as const })), "horizontal");
    const centers = result.cabinets.map((cabinet) => cabinet.position.x + cabinet.width / 2);
    expect(centers[1] - centers[0]).toBeCloseTo(centers[2] - centers[1]);
  });

  it("repeats a cabinet with stable, unique IDs and requested spacing", () => {
    const project = createInitialProject();
    project.cabinets = [{
      id: "source",
      type: "base",
      position: { x: 200, y: 0, z: 300 },
      width: 600,
      height: 720,
      depth: 560,
      doors: 2,
      drawers: 0,
    }];
    let id = 0;

    const result = repeatCabinet(project, "source", 4, 600, () => `repeat-${++id}`);

    expect(result.project.cabinets.map((cabinet) => cabinet.id)).toEqual(["source", "repeat-1", "repeat-2", "repeat-3"]);
    expect(result.project.cabinets.map((cabinet) => cabinet.position.x)).toEqual([200, 800, 1400, 2000]);
  });

  it("groups IDs as metadata without replacing project objects", () => {
    const project = createInitialProject();
    project.cabinets = [{
      id: "cab-1",
      type: "base",
      position: { x: 100, y: 0, z: 100 },
      width: 600,
      height: 720,
      depth: 560,
      doors: 2,
      drawers: 0,
    }];

    const grouped = groupSelection(project, "Kitchen run", ["cab-1", "plat-main"], "group-1");
    expect(grouped.cabinets[0]).toBe(project.cabinets[0]);
    expect(grouped.groups).toEqual([{ id: "group-1", name: "Kitchen run", objectIds: ["cab-1", "plat-main"] }]);
  });

  it("deletes selected sinks and their linked fabrication cutouts", () => {
    const project = createInitialProject();
    project.sinks = [{
      id: "sink-1",
      catalogId: "sink-model",
      name: "Sink",
      position: { x: 200, y: 850, z: 200 },
      width: 600,
      depth: 500,
      height: 200,
      cutoutWidth: 560,
      cutoutDepth: 460,
      mountingType: "topmount",
      requiredClearance: 50,
    }];
    project.platforms[0].cutouts = [
      { id: "linked", type: "sink", shape: "rect", x: 0, y: 0, width: 560, depth: 460, sourceObjectId: "sink-1" },
      { id: "custom", type: "custom", shape: "rect", x: 1000, y: 0, width: 100, depth: 100 },
    ];

    const updated = deleteSelection(project, [{ id: "sink-1", type: "sink" }]);
    expect(updated.sinks).toHaveLength(0);
    expect(updated.platforms[0].cutouts.map((cutout: { id: string }) => cutout.id)).toEqual(["custom"]);
  });
});