import { z } from "zod";

export type UnitSystem = "metric" | "imperial";
export type DisplayUnit = "mm" | "cm" | "inch" | "feet-inch";
export type KitchenType = "straight" | "l-shaped" | "u-shaped" | "peninsula" | "island" | "custom";
export type WallOpeningType = "window" | "door" | "passage";

export const WallOpeningSchema = z.object({
  id: z.string(),
  type: z.enum(["window", "door", "passage"]),
  offset: z.number().nonnegative(), // mm from wall start
  width: z.number().positive(),     // mm
  height: z.number().positive(),    // mm
  sillHeight: z.number().nonnegative().default(0), // mm from floor
  name: z.string().optional(),
});
export type WallOpening = z.infer<typeof WallOpeningSchema>;

export const WallSchema = z.object({
  id: z.string(),
  start: z.object({ x: z.number(), z: z.number() }),
  end: z.object({ x: z.number(), z: z.number() }),
  height: z.number().positive(),     // mm
  thickness: z.number().positive(),  // mm
  materialId: z.string().optional(),
  color: z.string().optional(),
  openings: z.array(WallOpeningSchema).default([]),
});
export type Wall = z.infer<typeof WallSchema>;

export const RoomSchema = z.object({
  length: z.number().positive(),     // mm along X (width)
  width: z.number().positive(),      // mm along Z (depth)
  height: z.number().positive(),     // mm along Y (height)
  wallThickness: z.number().positive().default(150),
  floorMaterialId: z.string().optional(),
  floorColor: z.string().default("#f3f4f6"),
  wallColor: z.string().default("#ffffff"),
  ceilingVisible: z.boolean().default(false),
});
export type Room = z.infer<typeof RoomSchema>;

export const CustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  location: z.string().optional(),
  notes: z.string().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const ProjectSettingsSchema = z.object({
  snapStep: z.number().positive().default(10), // mm
  snapEnabled: z.boolean().default(true),
  gridVisible: z.boolean().default(true),
  gridSize: z.number().positive().default(100), // mm
  showDimensions: z.boolean().default(true),
});
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export const ProjectSchema = z.object({
  schemaVersion: z.number().int().default(1),
  id: z.string(),
  name: z.string().min(1),
  customer: CustomerSchema.optional(),
  units: z.enum(["metric", "imperial"]).default("metric"),
  displayUnit: z.enum(["mm", "cm", "inch", "feet-inch"]).default("mm"),
  currency: z.string().default("INR"),
  locale: z.string().default("en-IN"),
  kitchenType: z.enum(["straight", "l-shaped", "u-shaped", "peninsula", "island", "custom"]).default("straight"),
  room: RoomSchema,
  walls: z.array(WallSchema).default([]),
  platforms: z.array(z.any()).default([]), // CountertopPlatform[]
  cabinets: z.array(z.any()).default([]),  // Cabinet[]
  appliances: z.array(z.any()).default([]), // ApplianceInstance[]
  sinks: z.array(z.any()).default([]),      // SinkInstance[]
  hobs: z.array(z.any()).default([]),       // HobInstance[]
  utilityPoints: z.array(z.any()).default([]),
  materials: z.array(z.any()).default([]),
  measurements: z.array(z.any()).default([]),
  pricing: z.any().optional(),
  settings: ProjectSettingsSchema.default({
    snapStep: 10,
    snapEnabled: true,
    gridVisible: true,
    gridSize: 100,
    showDimensions: true,
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;
