import type { PricingConfig } from "@/types/pricing";
import type { Material, EdgeProfile } from "@/types/catalog";
import type { Room } from "@/types/project";

export const DEFAULT_ROOM_PRESET: Room = {
  length: 3600, // mm (X axis)
  width: 3000,  // mm (Z axis)
  height: 3000, // mm (Y axis)
  wallThickness: 150, // mm
  floorColor: "#e5e7eb",
  wallColor: "#f9fafb",
  ceilingVisible: false,
};

export const PLATFORM_DEFAULTS = {
  depthMm: 600,
  workingHeightMm: 850,
  slabThicknessMm: 20,
  baseCabinetDepthMm: 560,
  backsplashHeightMm: 600,
  plinthHeightMm: 100,
  snapStepMm: 10,
  overhangFrontMm: 25,
  overhangSideMm: 0,
  overhangBackMm: 0,
  maxPieceLengthGraniteMm: 2400,
  minCutoutEdgeDistanceMm: 75,
  minSeamCutoutDistanceMm: 150,
} as const;

/**
 * PLACEHOLDER: Obviously fake sample pricing values for demonstration only.
 * The user must configure and confirm their own rates before quoting.
 */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  basis: "sq-ft",
  billOn: "gross",
  wastePercent: 8, // PLACEHOLDER: sample 8% waste
  materialRates: {
    "granite-black-galaxy": 120, // PLACEHOLDER: sample rate per sq ft
    "quartz-calacatta": 250,     // PLACEHOLDER: sample rate per sq ft
    "granite-tan-brown": 90,     // PLACEHOLDER: sample rate per sq ft
  },
  edgePerRunningFt: 35,       // PLACEHOLDER: sample rate per running ft
  backsplashPerSqFt: 110,     // PLACEHOLDER: sample rate per sq ft
  cabinetPerRunningFt: 1400,  // PLACEHOLDER: sample rate per running ft
  cutoutRates: {
    sink: 350,   // PLACEHOLDER: sample sink cutout fabrication charge
    hob: 450,    // PLACEHOLDER: sample hob cutout fabrication charge
    custom: 200, // PLACEHOLDER: sample custom cutout charge
  },
  polishPerRunningFt: 25,     // PLACEHOLDER: sample rate
  installation: 1500,         // PLACEHOLDER: sample fixed installation charge
  labour: 1000,               // PLACEHOLDER: sample labour charge
  taxPercent: 18,             // PLACEHOLDER: sample GST rate (18%)
  discount: {
    type: "percent",
    value: 0,
  },
  roundTo: 1,
};

export const SAMPLE_MATERIALS: Material[] = [
  {
    id: "granite-black-galaxy",
    name: "Black Galaxy Granite (Sample)",
    category: "granite",
    baseColor: "#18181b",
    roughness: 0.25,
    metalness: 0.1,
    pricePerSqFt: 120, // PLACEHOLDER
    pricePerSqM: 1290, // PLACEHOLDER
    pricePerRunningFt: 240, // PLACEHOLDER
    maxPieceLengthMm: 2400,
    veined: false,
    slab: {
      widthMm: 1800,
      lengthMm: 3000,
      costPerSlab: 7000, // PLACEHOLDER
    },
  },
  {
    id: "quartz-calacatta",
    name: "Calacatta Quartz (Sample)",
    category: "quartz",
    baseColor: "#f8fafc",
    roughness: 0.3,
    metalness: 0.05,
    pricePerSqFt: 250, // PLACEHOLDER
    pricePerSqM: 2690, // PLACEHOLDER
    pricePerRunningFt: 500, // PLACEHOLDER
    maxPieceLengthMm: 3000,
    veined: true, // Veined material must not be rotated in slab nesting
    slab: {
      widthMm: 1600,
      lengthMm: 3200,
      costPerSlab: 14000, // PLACEHOLDER
    },
  },
  {
    id: "granite-tan-brown",
    name: "Tan Brown Granite (Sample)",
    category: "granite",
    baseColor: "#3e2723",
    roughness: 0.3,
    metalness: 0.05,
    pricePerSqFt: 90, // PLACEHOLDER
    pricePerSqM: 968, // PLACEHOLDER
    pricePerRunningFt: 180, // PLACEHOLDER
    maxPieceLengthMm: 2400,
    veined: false,
    slab: {
      widthMm: 1800,
      lengthMm: 2800,
      costPerSlab: 5000, // PLACEHOLDER
    },
  },
];

export const SAMPLE_EDGE_PROFILES: EdgeProfile[] = [
  { id: "square", name: "Standard Square Edge", geometryType: "square", extraCostPerFt: 0 },
  { id: "pencil", name: "Pencil Round Edge", geometryType: "pencil", extraCostPerFt: 25 }, // PLACEHOLDER
  { id: "half-bullnose", name: "Half Bullnose", geometryType: "half-bullnose", extraCostPerFt: 40 }, // PLACEHOLDER
  { id: "full-bullnose", name: "Full Bullnose", geometryType: "full-bullnose", extraCostPerFt: 60 }, // PLACEHOLDER
  { id: "bevel", name: "Chamfer / Bevel Edge", geometryType: "bevel", extraCostPerFt: 35 }, // PLACEHOLDER
];
