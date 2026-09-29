/**
 * Unit tests for core/export/index.ts — Phase 6
 */

import { describe, it, expect } from "vitest";
import {
  serializeProject,
  validateAndMigrateProject,
  CURRENT_SCHEMA_VERSION,
} from "@/core/export";
import type { Project } from "@/types/project";
import { DEFAULT_ROOM_PRESET } from "@/data/presets";

function makeTestProject(): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: "test-proj-export",
    name: "Export Spec Kitchen",
    units: "metric",
    displayUnit: "mm",
    currency: "INR",
    locale: "en-IN",
    kitchenType: "straight",
    room: { ...DEFAULT_ROOM_PRESET },
    walls: [],
    platforms: [],
    cabinets: [],
    appliances: [],
    sinks: [],
    hobs: [],
    utilityPoints: [],
    groups: [],
    materials: [],
    measurements: [],
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
}

describe("Export & Migration Engine (Phase 6)", () => {
  it("serializes project with current schemaVersion and valid JSON structure", () => {
    const project = makeTestProject();
    const jsonStr = serializeProject(project);

    expect(typeof jsonStr).toBe("string");
    const parsed = JSON.parse(jsonStr);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.id).toBe(project.id);
    expect(parsed.room.length).toBe(project.room.length);
  });

  it("validates and parses a valid project successfully", () => {
    const project = makeTestProject();
    const result = validateAndMigrateProject(project);

    expect(result.success).toBe(true);
    expect(result.project?.id).toBe(project.id);
    expect(result.error).toBeUndefined();
  });

  it("rejects non-object or null input", () => {
    expect(validateAndMigrateProject(null).success).toBe(false);
    expect(validateAndMigrateProject("string").success).toBe(false);
    expect(validateAndMigrateProject(123).success).toBe(false);
  });

  it("rejects project with missing or invalid room dimensions", () => {
    const invalid = {
      schemaVersion: 1,
      id: "bad",
      name: "Bad Project",
      room: { length: -500, width: 3000, height: 2800 }, // negative length
    };

    const result = validateAndMigrateProject(invalid);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects future schema version with user-friendly message", () => {
    const futureProj = {
      ...makeTestProject(),
      schemaVersion: 999,
    };

    const result = validateAndMigrateProject(futureProj);
    expect(result.success).toBe(false);
    expect(result.error).toContain("newer schema version (999)");
  });

  it("migrates legacy v0 project by populating default version and arrays", () => {
    const legacyProj = {
      id: "legacy-v0",
      name: "Old Project",
      room: { ...DEFAULT_ROOM_PRESET },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateAndMigrateProject(legacyProj);
    expect(result.success).toBe(true);
    expect(result.project?.schemaVersion).toBe(1);
    expect(result.project?.platforms).toEqual([]);
    expect(result.project?.measurements).toEqual([]);
  });
});
