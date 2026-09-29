import { z } from "zod";

// ── Sink Catalog Schema ──
export const SinkCatalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["single", "double", "undermount", "farmhouse"]),
  mountingType: z.enum(["undermount", "topmount", "flushmount", "farmhouse"]),
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  cutoutWidth: z.number().positive(),
  cutoutDepth: z.number().positive(),
  requiredClearance: z.number().nonnegative(),
  comment: z.string().optional(),
});

export type SinkCatalogEntry = z.infer<typeof SinkCatalogEntrySchema>;

// ── Hob Catalog Schema ──
export const HobCatalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  hobType: z.enum(["gas", "induction", "hybrid"]),
  burners: z.number().int().min(1).max(8),
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  cutoutWidth: z.number().positive(),
  cutoutDepth: z.number().positive(),
  requiredClearance: z.number().nonnegative(),
  comment: z.string().optional(),
});

export type HobCatalogEntry = z.infer<typeof HobCatalogEntrySchema>;

// ── Cabinet Catalog Schema ──
export const CabinetCatalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["base", "wall", "tall"]),
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  doors: z.number().int().nonnegative(),
  drawers: z.number().int().nonnegative(),
  plinthHeight: z.number().nonnegative(),
  comment: z.string().optional(),
});

export type CabinetCatalogEntry = z.infer<typeof CabinetCatalogEntrySchema>;

// ── Appliance Catalog Schema ──
export const ApplianceCatalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
    "refrigerator",
    "dishwasher",
    "microwave",
    "oven",
    "chimney",
    "washing-machine",
    "water-purifier",
    "other",
  ]),
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  clearance: z.object({
    left: z.number().nonnegative(),
    right: z.number().nonnegative(),
    top: z.number().nonnegative(),
    back: z.number().nonnegative(),
  }),
  powerPointRequired: z.boolean(),
  waterPointRequired: z.boolean(),
  drainPointRequired: z.boolean(),
  comment: z.string().optional(),
});

export type ApplianceCatalogEntry = z.infer<typeof ApplianceCatalogEntrySchema>;

// ── Catalog Loader ──
import sinksCatalogJson from "./catalog/sinks.json";
import hobsCatalogJson from "./catalog/hobs.json";
import cabinetsCatalogJson from "./catalog/cabinets.json";
import appliancesCatalogJson from "./catalog/appliances.json";

function loadAndValidate<T>(
  data: unknown[],
  schema: z.ZodType<T>,
  label: string
): T[] {
  const results: T[] = [];
  for (const item of data) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
    } else {
      console.warn(
        `[CatalogLoader] Invalid ${label} entry:`,
        parsed.error.flatten()
      );
    }
  }
  return results;
}

export const SINK_CATALOG: SinkCatalogEntry[] = loadAndValidate(
  sinksCatalogJson,
  SinkCatalogEntrySchema,
  "sink"
);

export const HOB_CATALOG: HobCatalogEntry[] = loadAndValidate(
  hobsCatalogJson,
  HobCatalogEntrySchema,
  "hob"
);

export const CABINET_CATALOG: CabinetCatalogEntry[] = loadAndValidate(
  cabinetsCatalogJson,
  CabinetCatalogEntrySchema,
  "cabinet"
);

export const APPLIANCE_CATALOG: ApplianceCatalogEntry[] = loadAndValidate(
  appliancesCatalogJson,
  ApplianceCatalogEntrySchema,
  "appliance"
);

/**
 * Find a catalog entry by its ID.
 */
export function findSink(id: string): SinkCatalogEntry | undefined {
  return SINK_CATALOG.find((s) => s.id === id);
}

export function findHob(id: string): HobCatalogEntry | undefined {
  return HOB_CATALOG.find((h) => h.id === id);
}

export function findCabinet(id: string): CabinetCatalogEntry | undefined {
  return CABINET_CATALOG.find((c) => c.id === id);
}

export function findAppliance(id: string): ApplianceCatalogEntry | undefined {
  return APPLIANCE_CATALOG.find((a) => a.id === id);
}
