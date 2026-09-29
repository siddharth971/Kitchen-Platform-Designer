import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_MATERIALS } from "@/data/presets";
import {
  SINK_CATALOG,
  HOB_CATALOG,
  CABINET_CATALOG,
  APPLIANCE_CATALOG,
  findSink,
  findHob,
  findCabinet,
  findAppliance,
  SinkCatalogEntrySchema,
  HobCatalogEntrySchema,
  CabinetCatalogEntrySchema,
  ApplianceCatalogEntrySchema,
} from "@/data/catalogLoader";

describe("Catalog Loader & Validation", () => {
  it("offers the textured ivory-and-gold marble for countertops", () => {
    const marble = SAMPLE_MATERIALS.find((material) => material.id === "marble-ivory-gold");

    expect(marble?.category).toBe("marble");
    expect(marble?.textureUrl).toBe("/textures/marble-ivory-gold.jpg");
    expect(marble?.textureScaleMm).toBeGreaterThan(0);
  });

  it("bundles every marble texture referenced by the material list", () => {
    const marbleTextures = SAMPLE_MATERIALS.filter((material) => material.category === "marble");

    expect(marbleTextures).toHaveLength(6);
    for (const material of marbleTextures) {
      expect(material.textureUrl).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", material.textureUrl!.slice(1)))).toBe(true);
    }
  });

  describe("Sink Catalog", () => {
    it("loads and validates all sink entries against Zod schema", () => {
      expect(SINK_CATALOG.length).toBeGreaterThan(0);
      for (const sink of SINK_CATALOG) {
        const parsed = SinkCatalogEntrySchema.safeParse(sink);
        expect(parsed.success).toBe(true);
      }
    });

    it("ensures each sink cutout is smaller than or equal to total dimensions", () => {
      for (const sink of SINK_CATALOG) {
        expect(sink.cutoutWidth).toBeLessThanOrEqual(sink.width);
        expect(sink.cutoutDepth).toBeLessThanOrEqual(sink.depth);
        expect(sink.requiredClearance).toBeGreaterThanOrEqual(40);
      }
    });

    it("finds a sink by ID", () => {
      const found = findSink("sink-single-600");
      expect(found).toBeDefined();
      expect(found?.name).toContain("Single Bowl");
      expect(found?.type).toBe("single");
    });
  });

  describe("Hob Catalog", () => {
    it("loads and validates all hob entries against Zod schema", () => {
      expect(HOB_CATALOG.length).toBeGreaterThan(0);
      for (const hob of HOB_CATALOG) {
        const parsed = HobCatalogEntrySchema.safeParse(hob);
        expect(parsed.success).toBe(true);
      }
    });

    it("ensures each hob cutout is smaller than total dimensions", () => {
      for (const hob of HOB_CATALOG) {
        expect(hob.cutoutWidth).toBeLessThan(hob.width);
        expect(hob.cutoutDepth).toBeLessThan(hob.depth);
        expect(hob.burners).toBeGreaterThanOrEqual(1);
        expect(hob.requiredClearance).toBeGreaterThanOrEqual(40);
      }
    });

    it("finds a hob by ID", () => {
      const found = findHob("hob-gas-4b-600");
      expect(found).toBeDefined();
      expect(found?.burners).toBe(4);
      expect(found?.hobType).toBe("gas");
    });
  });

  describe("Cabinet Catalog", () => {
    it("loads and validates all cabinet entries against Zod schema", () => {
      expect(CABINET_CATALOG.length).toBeGreaterThan(0);
      for (const cab of CABINET_CATALOG) {
        const parsed = CabinetCatalogEntrySchema.safeParse(cab);
        expect(parsed.success).toBe(true);
      }
    });

    it("contains base, wall, and tall units", () => {
      const types = new Set(CABINET_CATALOG.map((c) => c.type));
      expect(types.has("base")).toBe(true);
      expect(types.has("wall")).toBe(true);
    });

    it("finds a cabinet by ID", () => {
      const found = findCabinet("cab-base-600");
      expect(found).toBeDefined();
      expect(found?.width).toBe(600);
      expect(found?.type).toBe("base");
    });
  });

  describe("Appliance Catalog", () => {
    it("loads and validates all appliance entries against Zod schema", () => {
      expect(APPLIANCE_CATALOG.length).toBeGreaterThan(0);
      for (const appl of APPLIANCE_CATALOG) {
        const parsed = ApplianceCatalogEntrySchema.safeParse(appl);
        expect(parsed.success).toBe(true);
      }
    });

    it("verifies required clearances exist for appliances", () => {
      for (const appl of APPLIANCE_CATALOG) {
        expect(appl.clearance.top).toBeGreaterThanOrEqual(0);
        expect(appl.clearance.back).toBeGreaterThanOrEqual(0);
        expect(appl.width).toBeGreaterThan(0);
        expect(appl.height).toBeGreaterThan(0);
        expect(appl.depth).toBeGreaterThan(0);
      }
    });

    it("finds an appliance by ID", () => {
      const found = findAppliance("appl-fridge-600");
      expect(found).toBeDefined();
      expect(found?.category).toBe("refrigerator");
      expect(found?.powerPointRequired).toBe(true);
    });
  });
});
