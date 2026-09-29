/**
 * Unit tests for core/estimation/index.ts — Phase 5
 *
 * Tests cover:
 * 1. Unit conversion constants (sq-mm → sq-ft, mm → ft)
 * 2. Empty project produces zero subtotal
 * 3. Single straight platform — material, edge, backsplash line items
 * 4. Gross vs. net billing mode
 * 5. Cutout fabrication charges
 * 6. Cabinet running-foot billing
 * 7. Installation + labour fixed charges
 * 8. Discount: percent type
 * 9. Discount: flat type
 * 10. Tax calculation (GST)
 * 11. Grand total rounding
 * 12. formatCurrency helper
 */

import { describe, it, expect } from "vitest";
import {
  estimateProject,
  formatCurrency,
  SQ_MM_TO_SQ_FT,
  MM_TO_FT,
} from "@/core/estimation";
import type { PricingConfig } from "@/types/pricing";
import type { Project } from "@/types/project";
import { DEFAULT_ROOM_PRESET } from "@/data/presets";
import { generateRoomWalls } from "@/core/geometry/wall";

// ── Helpers ───────────────────────────────────────────────────────────────────

const basePricing: PricingConfig = {
  basis: "sq-ft",
  billOn: "gross",
  wastePercent: 8,
  materialRates: {
    "granite-black-galaxy": 120, // per sq ft
  },
  edgePerRunningFt: 35,
  backsplashPerSqFt: 110,
  cabinetPerRunningFt: 1400,
  cutoutRates: {
    sink: 350,
    hob: 450,
    custom: 200,
  },
  polishPerRunningFt: 25,
  installation: 1500,
  labour: 1000,
  taxPercent: 18,
  discount: { type: "percent", value: 0 },
  roundTo: 1,
};

function makePlatform(overrides = {}): Parameters<typeof estimateProject>[0]["platforms"][0] {
  return {
    id: "plat-1",
    name: "Main Platform",
    shape: "straight",
    position: { x: 150, z: 150 },
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
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  const room = DEFAULT_ROOM_PRESET;
  const walls = generateRoomWalls(room);
  return {
    schemaVersion: 1,
    id: "test-project",
    name: "Test Kitchen",
    units: "metric",
    displayUnit: "mm",
    currency: "INR",
    locale: "en-IN",
    kitchenType: "straight",
    room,
    walls,
    platforms: [],
    cabinets: [],
    appliances: [],
    sinks: [],
    hobs: [],
    utilityPoints: [],
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
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Estimation Engine (Phase 5)", () => {
  it("SQ_MM_TO_SQ_FT constant is correct", () => {
    // 1 sq ft = 304.8² sq mm = 92903.04 sq mm
    const sqMmPerSqFt = 304.8 * 304.8;
    expect(Math.abs(1 / sqMmPerSqFt - SQ_MM_TO_SQ_FT)).toBeLessThan(1e-12);
  });

  it("MM_TO_FT constant is correct", () => {
    expect(Math.abs(MM_TO_FT - 1 / 304.8)).toBeLessThan(1e-12);
  });

  it("empty project returns zero grand total", () => {
    const project = makeProject({
      platforms: [],
      cabinets: [],
    });
    const pricing: PricingConfig = {
      ...basePricing,
      installation: 0,
      labour: 0,
      discount: { type: "percent", value: 0 },
    };
    const result = estimateProject(project, pricing);
    expect(result.grandTotal).toBe(0);
    expect(result.grandTotalRounded).toBe(0);
    expect(result.platforms).toHaveLength(0);
  });

  it("single platform produces material, edge, and backsplash line items", () => {
    const platform = makePlatform();
    const project = makeProject({ platforms: [platform] });
    const pricing: PricingConfig = {
      ...basePricing,
      installation: 0,
      labour: 0,
      discount: { type: "percent", value: 0 },
      taxPercent: 0,
    };
    const result = estimateProject(project, pricing);

    expect(result.platforms).toHaveLength(1);
    const pe = result.platforms[0];

    const materialItem = pe.lineItems.find((li) => li.category === "material");
    const edgeItem     = pe.lineItems.find((li) => li.category === "edge");
    const bsItem       = pe.lineItems.find((li) => li.category === "backsplash");
    const polishItem   = pe.lineItems.find((li) => li.category === "polish");

    expect(materialItem).toBeDefined();
    expect(edgeItem).toBeDefined();
    expect(bsItem).toBeDefined();
    expect(polishItem).toBeDefined();
  });

  it("gross billing uses full footprint area", () => {
    const platform = makePlatform();
    // 2400 × 625mm (600 + 25 overhang) = 1,500,000 sq mm
    const expectedSqFt = (2400 * 625) * SQ_MM_TO_SQ_FT;

    const project = makeProject({ platforms: [platform] });
    const pricing: PricingConfig = { ...basePricing, billOn: "gross", installation: 0, labour: 0, taxPercent: 0, discount: { type: "percent", value: 0 } };
    const result = estimateProject(project, pricing);

    expect(result.platforms[0].billableAreaSqFt).toBeCloseTo(expectedSqFt, 1);
  });

  it("net billing uses net area + waste factor", () => {
    const platform = makePlatform({ cutouts: [] }); // no cutouts, so net = gross
    const project = makeProject({ platforms: [platform] });
    const pricing: PricingConfig = { ...basePricing, billOn: "net", wastePercent: 10, installation: 0, labour: 0, taxPercent: 0, discount: { type: "percent", value: 0 } };
    const result = estimateProject(project, pricing);

    const pe = result.platforms[0];
    // net = gross (no cutouts), billable = gross * 1.1
    const expectedBillable = pe.grossAreaSqFt * 1.1;
    expect(pe.billableAreaSqFt).toBeCloseTo(expectedBillable, 0);
  });

  it("cutout fabrication charges appear per cutout", () => {
    const platform = makePlatform({
      cutouts: [
        { id: "c1", type: "sink",   shape: "rectangle", x: 500,  z: 200, width: 450, depth: 340, cornerRadius: 0 },
        { id: "c2", type: "hob",    shape: "rectangle", x: 1200, z: 200, width: 580, depth: 510, cornerRadius: 0 },
        { id: "c3", type: "custom", shape: "rectangle", x: 100,  z: 100, width: 100, depth: 100, cornerRadius: 0 },
      ],
    });
    const project = makeProject({ platforms: [platform] });
    const pricing: PricingConfig = { ...basePricing, installation: 0, labour: 0, taxPercent: 0, discount: { type: "percent", value: 0 } };
    const result = estimateProject(project, pricing);

    const pe = result.platforms[0];
    const cutoutItems = pe.lineItems.filter((li) => li.category === "cutout");
    expect(cutoutItems).toHaveLength(3);
    expect(cutoutItems[0].amount).toBe(350); // sink
    expect(cutoutItems[1].amount).toBe(450); // hob
    expect(cutoutItems[2].amount).toBe(200); // custom
  });

  it("cabinet running-foot charges are correct", () => {
    const cabinet = {
      id: "cab-1",
      type: "base" as const,
      width: 600, // mm → 600/304.8 ft × 1400/ft
      height: 720,
      depth: 560,
      position: { x: 150, y: 0, z: 150 },
      materialId: "ply-18",
      shutterMaterialId: "laminate-white",
      handleId: "none",
      finish: "laminate",
      hingeType: "soft-close",
      drawers: 0,
      doors: 2,
      notes: "",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = makeProject({ cabinets: [cabinet as any] });
    const pricing: PricingConfig = { ...basePricing, installation: 0, labour: 0, taxPercent: 0, discount: { type: "percent", value: 0 } };
    const result = estimateProject(project, pricing);

    const cabinetItem = result.cabinetLineItems[0];
    expect(cabinetItem).toBeDefined();
    const expectedRunFt = 600 * MM_TO_FT;
    expect(cabinetItem.qty).toBeCloseTo(expectedRunFt, 1);
    expect(cabinetItem.amount).toBeCloseTo(expectedRunFt * 1400, 0);
  });

  it("installation and labour are added as fixed charges", () => {
    const project = makeProject({ platforms: [] });
    const pricing: PricingConfig = { ...basePricing, installation: 1500, labour: 1000, taxPercent: 0, discount: { type: "percent", value: 0 } };
    const result = estimateProject(project, pricing);

    expect(result.installationLineItems).toHaveLength(2);
    expect(result.subtotalBeforeDiscountAndTax).toBe(2500);
  });

  it("percent discount reduces taxable amount", () => {
    const project = makeProject({ platforms: [] });
    const pricing: PricingConfig = {
      ...basePricing,
      installation: 10000,
      labour: 0,
      taxPercent: 0,
      discount: { type: "percent", value: 10 },
    };
    const result = estimateProject(project, pricing);

    expect(result.discountAmount).toBeCloseTo(1000, 1);
    expect(result.taxableAmount).toBeCloseTo(9000, 1);
    expect(result.grandTotal).toBeCloseTo(9000, 1);
  });

  it("flat discount reduces taxable amount", () => {
    const project = makeProject({ platforms: [] });
    const pricing: PricingConfig = {
      ...basePricing,
      installation: 10000,
      labour: 0,
      taxPercent: 0,
      discount: { type: "flat", value: 500 },
    };
    const result = estimateProject(project, pricing);

    expect(result.discountAmount).toBe(500);
    expect(result.taxableAmount).toBe(9500);
  });

  it("18% GST is applied on taxable amount", () => {
    const project = makeProject({ platforms: [] });
    const pricing: PricingConfig = {
      ...basePricing,
      installation: 10000,
      labour: 0,
      taxPercent: 18,
      discount: { type: "percent", value: 0 },
    };
    const result = estimateProject(project, pricing);

    expect(result.taxAmount).toBeCloseTo(1800, 1);
    expect(result.grandTotal).toBeCloseTo(11800, 1);
  });

  it("roundTo=100 rounds grand total to nearest hundred", () => {
    const project = makeProject({ platforms: [] });
    const pricing: PricingConfig = {
      ...basePricing,
      installation: 10050,
      labour: 0,
      taxPercent: 0,
      discount: { type: "percent", value: 0 },
      roundTo: 100,
    };
    const result = estimateProject(project, pricing);
    expect(result.grandTotalRounded % 100).toBe(0);
  });

  it("formatCurrency formats INR correctly", () => {
    const formatted = formatCurrency(12500, "INR");
    expect(formatted).toContain("12,500");
  });
});
