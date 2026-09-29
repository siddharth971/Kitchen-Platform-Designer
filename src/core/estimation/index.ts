/**
 * core/estimation/index.ts
 *
 * Pure estimation engine for Kitchen Platform Designer.
 * Converts platform geometry + pricing config into a full itemized cost breakdown.
 *
 * Pricing basis:
 *   - "sq-ft"       : all area-based rates are per square foot
 *   - "running-foot": edge and linear rates per running foot
 *
 * billOn:
 *   - "gross"  : bill the full slab footprint area (before cutouts)
 *   - "net"    : bill net area (gross − cutouts) + waste %
 *
 * All intermediate quantities are in mm / sq-mm; conversion to sq-ft or
 * running-ft happens only at the final rate-multiply step.
 *
 * No React or Babylon dependencies.
 */

import type { PricingConfig } from "@/types/pricing";
import type { Project } from "@/types/project";
import type { CountertopPlatform, Cabinet } from "@/types/kitchen";
import { calculatePlatformQuantities } from "@/core/geometry/platform";

// ── Unit conversion constants ─────────────────────────────────────────────────
export const MM_TO_FT = 1 / 304.8;                     // 1 mm = 1/304.8 ft
export const SQ_MM_TO_SQ_FT = MM_TO_FT * MM_TO_FT;    // 1 sq-mm = (1/304.8)² sq-ft

// ── Output types ──────────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
  category:
    | "material"
    | "edge"
    | "backsplash"
    | "cutout"
    | "cabinet"
    | "installation"
    | "labour"
    | "polish"
    | "tax"
    | "discount"
    | "subtotal";
  description: string;
  qty: number;
  unit: string;
  unitRate: number;
  amount: number;
  note?: string;
}

export interface PlatformEstimate {
  platformId: string;
  platformName: string;
  materialId: string;
  grossAreaSqFt: number;
  netAreaSqFt: number;
  billableAreaSqFt: number;   // gross or net+waste depending on billOn
  finishedEdgeRunFt: number;
  backsplashSqFt: number;
  backsplashRunFt: number;
  cutoutCount: number;
  lineItems: LineItem[];
  subtotal: number;
}

export interface EstimationResult {
  timestamp: string;
  currency: string;
  pricingBasis: "sq-ft" | "running-foot";
  platforms: PlatformEstimate[];
  cabinetLineItems: LineItem[];
  installationLineItems: LineItem[];
  subtotalBeforeDiscountAndTax: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  grandTotalRounded: number;
  lineItems: LineItem[];          // flat combined list
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sqMmToSqFt(sqMm: number): number {
  return sqMm * SQ_MM_TO_SQ_FT;
}

function mmToFt(mm: number): number {
  return mm * MM_TO_FT;
}

function applyRounding(value: number, roundTo: number): number {
  if (roundTo <= 0) return value;
  return Math.round(value / roundTo) * roundTo;
}

// ── Per-platform estimator ────────────────────────────────────────────────────

function estimatePlatform(
  platform: CountertopPlatform,
  pricing: PricingConfig,
  idPrefix: string
): PlatformEstimate {
  const qty = calculatePlatformQuantities(platform, pricing.wastePercent);
  const lineItems: LineItem[] = [];

  const grossSqFt    = sqMmToSqFt(qty.grossAreaSqMm);
  const netSqFt      = sqMmToSqFt(qty.netAreaSqMm);
  const netWasteSqFt = sqMmToSqFt(qty.billableAreaNetWithWasteSqMm);
  const billableSqFt = pricing.billOn === "gross" ? grossSqFt : netWasteSqFt;

  const edgeRunFt      = mmToFt(qty.finishedEdgeLengthMm);
  const backsplashSqFt = sqMmToSqFt(qty.backsplashAreaSqMm);
  const backsplashRunFt = mmToFt(qty.backsplashLengthMm);

  // 1. Material / slab cost
  const materialRate = pricing.materialRates[platform.materialId] ?? 0;
  const materialAmount = billableSqFt * materialRate;

  lineItems.push({
    id: `${idPrefix}-material`,
    category: "material",
    description: `Slab material — ${platform.name} (${pricing.billOn === "gross" ? "gross" : "net+waste"})`,
    qty: Math.round(billableSqFt * 100) / 100,
    unit: "sq ft",
    unitRate: materialRate,
    amount: materialAmount,
    note: pricing.billOn === "gross"
      ? `Gross area ${grossSqFt.toFixed(2)} sq ft`
      : `Net ${netSqFt.toFixed(2)} sq ft + ${pricing.wastePercent}% waste = ${netWasteSqFt.toFixed(2)} sq ft`,
  });

  // 2. Finished edge polishing
  const edgeAmount = edgeRunFt * pricing.edgePerRunningFt;
  if (edgeRunFt > 0) {
    lineItems.push({
      id: `${idPrefix}-edge`,
      category: "edge",
      description: `Finished edge — ${platform.name}`,
      qty: Math.round(edgeRunFt * 100) / 100,
      unit: "run ft",
      unitRate: pricing.edgePerRunningFt,
      amount: edgeAmount,
    });
  }

  // 3. Backsplash
  const backsplashAmount = backsplashSqFt * pricing.backsplashPerSqFt;
  if (platform.backsplash?.enabled && backsplashSqFt > 0) {
    lineItems.push({
      id: `${idPrefix}-backsplash`,
      category: "backsplash",
      description: `Backsplash — ${platform.name} (${backsplashRunFt.toFixed(2)} run ft × ${platform.backsplash.height}mm H)`,
      qty: Math.round(backsplashSqFt * 100) / 100,
      unit: "sq ft",
      unitRate: pricing.backsplashPerSqFt,
      amount: backsplashAmount,
    });
  }

  // 4. Cutout fabrication charges
  let cutoutCount = 0;
  if (platform.cutouts && platform.cutouts.length > 0) {
    for (const cutout of platform.cutouts) {
      const rateKey =
        cutout.type === "sink" ? "sink" : cutout.type === "hob" ? "hob" : "custom";
      const cutoutRate = pricing.cutoutRates[rateKey] ?? pricing.cutoutRates["custom"] ?? 0;
      lineItems.push({
        id: `${idPrefix}-cutout-${cutout.id}`,
        category: "cutout",
        description: `Cutout fabrication — ${cutout.type} (${cutout.width}×${cutout.depth}mm)`,
        qty: 1,
        unit: "nos",
        unitRate: cutoutRate,
        amount: cutoutRate,
      });
      cutoutCount++;
    }
  }

  // 5. Polish / buffing (optional)
  if (pricing.polishPerRunningFt && edgeRunFt > 0) {
    const polishAmount = edgeRunFt * pricing.polishPerRunningFt;
    lineItems.push({
      id: `${idPrefix}-polish`,
      category: "polish",
      description: `Edge polish/buffing — ${platform.name}`,
      qty: Math.round(edgeRunFt * 100) / 100,
      unit: "run ft",
      unitRate: pricing.polishPerRunningFt,
      amount: polishAmount,
    });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);

  return {
    platformId: platform.id,
    platformName: platform.name,
    materialId: platform.materialId,
    grossAreaSqFt: Math.round(grossSqFt * 100) / 100,
    netAreaSqFt: Math.round(netSqFt * 100) / 100,
    billableAreaSqFt: Math.round(billableSqFt * 100) / 100,
    finishedEdgeRunFt: Math.round(edgeRunFt * 100) / 100,
    backsplashSqFt: Math.round(backsplashSqFt * 100) / 100,
    backsplashRunFt: Math.round(backsplashRunFt * 100) / 100,
    cutoutCount,
    lineItems,
    subtotal,
  };
}

// ── Cabinet estimator ─────────────────────────────────────────────────────────

function estimateCabinets(
  cabinets: Cabinet[],
  pricing: PricingConfig
): LineItem[] {
  const items: LineItem[] = [];

  for (const cabinet of cabinets) {
    const widthMm = cabinet.width;
    const widthFt = mmToFt(widthMm);
    const rate = pricing.cabinetPerRunningFt;
    const amount = widthFt * rate;

    items.push({
      id: `cabinet-${cabinet.id}`,
      category: "cabinet",
      description: `${cabinet.type === "base" ? "Base" : "Wall"} Cabinet — ${cabinet.width}mm wide`,
      qty: Math.round(widthFt * 100) / 100,
      unit: "run ft",
      unitRate: rate,
      amount,
    });
  }

  return items;
}

// ── Main estimator ────────────────────────────────────────────────────────────

/**
 * Runs a full project estimation using platform geometry + pricing config.
 * Returns an itemized EstimationResult with a grand total.
 */
export function estimateProject(
  project: Project,
  pricing: PricingConfig
): EstimationResult {
  // 1. Per-platform estimates
  const platformEstimates: PlatformEstimate[] = project.platforms.map(
    (p: CountertopPlatform, i: number) =>
      estimatePlatform(p, pricing, `plat-${i}`)
  );

  // 2. Cabinet line items
  const cabinetLineItems = estimateCabinets(project.cabinets ?? [], pricing);

  // 3. Installation & labour (fixed charges once per project)
  const installationLineItems: LineItem[] = [];

  if (pricing.installation > 0) {
    installationLineItems.push({
      id: "installation",
      category: "installation",
      description: "Installation & handling",
      qty: 1,
      unit: "job",
      unitRate: pricing.installation,
      amount: pricing.installation,
    });
  }

  if (pricing.labour > 0) {
    installationLineItems.push({
      id: "labour",
      category: "labour",
      description: "Labour charges",
      qty: 1,
      unit: "job",
      unitRate: pricing.labour,
      amount: pricing.labour,
    });
  }

  // 4. Aggregate subtotal (before discount + tax)
  const platformSubtotal   = platformEstimates.reduce((s, pe) => s + pe.subtotal, 0);
  const cabinetSubtotal    = cabinetLineItems.reduce((s, li) => s + li.amount, 0);
  const installSubtotal    = installationLineItems.reduce((s, li) => s + li.amount, 0);
  const subtotalBeforeDiscountAndTax = platformSubtotal + cabinetSubtotal + installSubtotal;

  // 5. Discount
  let discountAmount = 0;
  if (pricing.discount.value > 0) {
    if (pricing.discount.type === "percent") {
      discountAmount = subtotalBeforeDiscountAndTax * pricing.discount.value / 100;
    } else {
      discountAmount = pricing.discount.value;
    }
  }

  // 6. Tax (GST)
  const taxableAmount = subtotalBeforeDiscountAndTax - discountAmount;
  const taxAmount = taxableAmount * pricing.taxPercent / 100;

  // 7. Grand total
  const grandTotal = taxableAmount + taxAmount;
  const grandTotalRounded = applyRounding(grandTotal, pricing.roundTo);

  // 8. Build flat line-item list for reporting/printing
  const flatLineItems: LineItem[] = [
    ...platformEstimates.flatMap((pe) => pe.lineItems),
    ...cabinetLineItems,
    ...installationLineItems,
  ];

  if (discountAmount > 0) {
    flatLineItems.push({
      id: "discount",
      category: "discount",
      description: `Discount (${
        pricing.discount.type === "percent"
          ? `${pricing.discount.value}%`
          : "flat"
      })`,
      qty: 1,
      unit: pricing.discount.type === "percent" ? "%" : "flat",
      unitRate: discountAmount,
      amount: -discountAmount,
    });
  }

  flatLineItems.push({
    id: "tax",
    category: "tax",
    description: `GST @ ${pricing.taxPercent}%`,
    qty: pricing.taxPercent,
    unit: "%",
    unitRate: taxableAmount / 100,
    amount: taxAmount,
  });

  return {
    timestamp: new Date().toISOString(),
    currency: project.currency ?? "INR",
    pricingBasis: pricing.basis,
    platforms: platformEstimates,
    cabinetLineItems,
    installationLineItems,
    subtotalBeforeDiscountAndTax,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    grandTotalRounded,
    lineItems: flatLineItems,
  };
}

// ── Formatting helper (no React deps) ────────────────────────────────────────

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-IN")}`;
  }
}
