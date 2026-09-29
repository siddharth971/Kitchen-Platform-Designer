/**
 * Unit tests for core/fabrication/index.ts — Phase 6
 */

import { describe, it, expect } from "vitest";
import {
  generateCutList,
  computeSlabNesting,
  generateFabricationSvg,
  buildWhatsAppSummary,
  STANDARD_SLAB_WIDTH,
  STANDARD_SLAB_DEPTH,
} from "@/core/fabrication";
import { estimateProject } from "@/core/estimation";
import type { Project } from "@/types/project";
import type { BusinessSettings } from "@/types/business";

function makeMockProject(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    id: "proj-fab-test",
    name: "Modern Kitchen Fab Test",
    units: "metric",
    displayUnit: "mm",
    currency: "INR",
    locale: "en-IN",
    kitchenType: "straight",
    room: {
      length: 3600,
      width: 3000,
      height: 2800,
      wallThickness: 150,
      floorColor: "#fff",
      wallColor: "#fff",
      ceilingVisible: false,
    },
    walls: [],
    platforms: [
      {
        id: "plat-straight",
        name: "Main Straight Platform",
        shape: "straight",
        position: { x: 100, z: 100 },
        length: 2400,
        depth: 600,
        workingHeight: 850,
        slabThickness: 20,
        materialId: "granite-black-galaxy",
        edgeProfile: "bullnose",
        cutouts: [],
      },
    ],
    cabinets: [],
    appliances: [],
    sinks: [
      {
        id: "sink-1",
        platformId: "plat-straight",
        modelName: "Single Bowl Sink",
        position: { x: 400, z: 80 },
        cutoutDimensions: { width: 500, depth: 400 },
      },
    ],
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
    customer: {
      name: "Ramesh Sharma",
      phone: "+91 9876543210",
      email: "ramesh@example.com",
      location: "Bandra, Mumbai",
    },
    ...overrides,
  } as Project;
}

const mockBusiness: BusinessSettings = {
  businessName: "Elite Stone Works",
  tagline: "Fine Kitchens",
  gstNumber: "27ABCDE1234F1Z5",
  address: "Andheri East, Mumbai",
  cityStateZip: "Mumbai, MH 400069",
  phone: "+91 9988776655",
  email: "elite@example.com",
  website: "www.elitestone.example",
  quoteValidityDays: 15,
  paymentTerms: "50% advance",
  termsAndConditions: "Standard terms apply.",
  notes: "Specialized in Granite and Quartz",
};

describe("Fabrication Engine (Phase 6)", () => {
  it("generates a single cut piece for a straight platform under standard slab width", () => {
    const project = makeMockProject();
    const cutList = generateCutList(project);

    expect(cutList).toHaveLength(1);
    const p1 = cutList[0];
    expect(p1.length).toBe(2400);
    expect(p1.depth).toBe(600);
    expect(p1.thickness).toBe(20);
    expect(p1.areaSqMm).toBe(2400 * 600);
    expect(p1.finishedEdges).toContain("front");
    expect(p1.cutouts).toHaveLength(1);
    expect(p1.cutouts[0].width).toBe(500);
    expect(p1.cutouts[0].depth).toBe(400);
  });

  it("splits a long straight platform (> 3200mm) into 2 pieces at a seam", () => {
    const project = makeMockProject({
      platforms: [
        {
          id: "plat-long",
          name: "Extra Long Platform",
          shape: "straight",
          position: { x: 0, z: 0 },
          length: 3800,
          depth: 600,
          workingHeight: 850,
          slabThickness: 20,
          materialId: "granite-black-galaxy",
          edgeProfile: "bullnose",
          cutouts: [],
        },
      ],
    });

    const cutList = generateCutList(project);
    expect(cutList).toHaveLength(2);
    expect(cutList[0].length + cutList[1].length).toBe(3800);
    expect(cutList[0].seamNotes).toBeDefined();
    expect(cutList[1].seamNotes).toBeDefined();
  });

  it("decomposes an L-shaped platform into Arm A and Arm B pieces", () => {
    const project = makeMockProject({
      platforms: [
        {
          id: "plat-l",
          name: "L-Countertop",
          shape: "l-shaped",
          position: { x: 100, z: 100 },
          lengthA: 2400,
          depthA: 600,
          lengthB: 1800,
          depthB: 600,
          workingHeight: 850,
          slabThickness: 20,
          materialId: "granite-tan-brown",
          edgeProfile: "bevel",
          cutouts: [],
        },
      ],
      sinks: [],
      hobs: [],
    });

    const cutList = generateCutList(project);
    expect(cutList).toHaveLength(2);

    const armA = cutList[0];
    const armB = cutList[1];

    expect(armA.length).toBe(2400);
    expect(armA.depth).toBe(600);
    // Arm B length subtracts the corner intersection depth (1800 - 600 = 1200)
    expect(armB.length).toBe(1200);
    expect(armB.depth).toBe(600);
    expect(armA.areaSqMm + armB.areaSqMm).toBe(2400 * 600 + 1200 * 600);
  });

  it("computes 2D slab nesting with utilization and waste percentage", () => {
    const project = makeMockProject();
    const cutList = generateCutList(project);
    const nesting = computeSlabNesting(cutList);

    expect(nesting.slabsRequired).toBe(1);
    expect(nesting.placedPieces).toHaveLength(1);
    expect(nesting.hasOverlargePiece).toBe(false);
    expect(nesting.utilizationPercent).toBeGreaterThan(0);
    expect(nesting.utilizationPercent).toBeLessThanOrEqual(100);
    expect(nesting.wastePercent).toBe(Math.round((100 - nesting.utilizationPercent) * 10) / 10);
  });

  it("detects overlarge pieces that exceed standard slab dimensions", () => {
    const giantPiece = [
      {
        id: "giant",
        label: "Giant Slab",
        platformId: "p1",
        platformName: "Huge",
        length: 4000,
        depth: 2000,
        thickness: 30,
        areaSqMm: 8000000,
        areaSqFt: 86.1,
        materialId: "granite",
        materialName: "Granite",
        edgeProfile: "square",
        finishedEdges: ["front" as const],
        cutouts: [],
      },
    ];

    const nesting = computeSlabNesting(giantPiece, STANDARD_SLAB_WIDTH, STANDARD_SLAB_DEPTH);
    expect(nesting.hasOverlargePiece).toBe(true);
    expect(nesting.overlargePieces).toHaveLength(1);
  });

  it("generates valid SVG technical fabrication drawing", () => {
    const project = makeMockProject();
    const cutList = generateCutList(project);
    const svg = generateFabricationSvg(project, cutList, {
      customerName: "Ramesh Sharma",
      projectName: "Kitchen Project",
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("FABRICATION DRAWING");
    expect(svg).toContain("2400 mm");
    expect(svg).toContain("600 mm");
    expect(svg).toContain("CUTOUT: 500 × 400 mm");
    expect(svg).toContain("Estimate only. Final measurement and price are confirmed on site.");
  });

  it("builds WhatsApp quotation summary with disclaimer and customer info", () => {
    const project = makeMockProject();
    const quote = estimateProject(project, {
      basis: "sq-ft",
      billOn: "gross",
      wastePercent: 8,
      materialRates: { "granite-black-galaxy": 120 },
      edgePerRunningFt: 30,
      backsplashPerSqFt: 80,
      cabinetPerRunningFt: 1200,
      cutoutRates: { sink: 300, hob: 400, custom: 150 },
      polishPerRunningFt: 20,
      installation: 1000,
      labour: 800,
      taxPercent: 18,
      discount: { type: "percent", value: 5 },
      roundTo: 1,
    });

    const summary = buildWhatsAppSummary(project, quote, mockBusiness);
    expect(summary).toContain("QUOTATION SUMMARY");
    expect(summary).toContain("Ramesh Sharma");
    expect(summary).toContain("Elite Stone Works");
    expect(summary).toContain("GRAND TOTAL:");
    expect(summary).toContain("Estimate only. Final measurement and price are confirmed on site.");
  });
});
