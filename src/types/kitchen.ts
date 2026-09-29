import type { Point2D, Point3D } from "./geometry";

export type PlatformShape = "straight" | "l-shaped" | "u-shaped" | "island" | "custom";
export type CornerStyle = "square" | "miter" | "custom";

export interface PlatformOverhang {
  front: number; // mm (e.g. 25)
  side: number;  // mm (e.g. 0)
  back: number;  // mm (e.g. 0)
}

export interface PlatformBacksplash {
  enabled: boolean;
  height: number;     // mm (e.g. 600)
  thickness: number;  // mm (e.g. 20)
  materialId?: string;
}

export interface Cutout {
  id: string;
  type: "sink" | "hob" | "custom";
  shape: "rect" | "rounded-rect" | "circle" | "polygon";
  x: number;     // mm relative to platform
  y: number;     // mm
  width: number; // mm
  depth: number; // mm
  radius?: number;
  points?: Point2D[];
  sourceObjectId?: string;
}

export interface EditableObjectProperties {
  rotation?: Point3D; // Euler angles in degrees
  materialId?: string;
  color?: string;
  opacity?: number; // 0 to 1
  visible?: boolean;
  locked?: boolean;
  textureId?: string;
}

export interface CountertopPlatform extends EditableObjectProperties {
  id: string;
  name: string;
  shape: PlatformShape;
  position: Point2D; // in mm on floor plane

  // Dimensions for straight platform
  length: number; // mm (default 2400)
  depth: number;  // mm (default 600)

  // Additional dimensions for L-shape platform
  lengthA: number; // mm run along X (default 2400)
  depthA: number;  // mm depth of run along X (default 600)
  lengthB: number; // mm run along Z (default 1800)
  depthB: number;  // mm depth of run along Z (default 600)

  workingHeight: number; // mm floor to top of slab (default 850)
  slabThickness: number; // mm (default 20)
  materialId: string;
  edgeProfileId: string;
  cornerStyle: CornerStyle;
  overhang: PlatformOverhang;
  backsplash: PlatformBacksplash;
  cutouts: Cutout[];
}

export interface CountertopPiece {
  id: string;
  platformId: string;
  label: string;
  polygon: Point2D[]; // in global mm
  lengthMm: number;
  depthMm: number;
  thicknessMm: number;
  areaSqMm: number;
  edgeProfileId: string;
}

export interface SeamLine {
  id: string;
  platformId: string;
  start: Point2D; // in mm
  end: Point2D;   // in mm
  reason: "corner-joint" | "max-length";
  isValid: boolean;
  warning?: string;
}

export interface Cabinet extends EditableObjectProperties {
  id: string;
  name?: string;
  type: "base" | "wall" | "tall";
  position: Point3D;
  width: number;
  height: number;
  depth: number;
  doors: number;
  drawers: number;
  materialId?: string;
  plinthHeight?: number;
}

export interface ApplianceInstance extends EditableObjectProperties {
  id: string;
  catalogId: string;
  name: string;
  category: "refrigerator" | "dishwasher" | "microwave" | "oven" | "chimney" | "washing-machine" | "water-purifier" | "other";
  position: Point3D;
  dimensions: { width: number; height: number; depth: number };
  clearance?: { left: number; right: number; top: number; back: number };
  powerPointRequired?: boolean;
  waterPointRequired?: boolean;
  drainPointRequired?: boolean;
}

export interface SinkInstance extends EditableObjectProperties {
  id: string;
  catalogId: string;
  name: string;
  position: Point3D;
  width: number;
  depth: number;
  height: number;
  cutoutWidth: number;
  cutoutDepth: number;
  mountingType: "undermount" | "topmount" | "flushmount" | "farmhouse";
  requiredClearance: number;
  platformId?: string;
}

export interface HobInstance extends EditableObjectProperties {
  id: string;
  catalogId: string;
  name: string;
  position: Point3D;
  width: number;
  depth: number;
  height: number;
  cutoutWidth: number;
  cutoutDepth: number;
  burners: number;
  hobType: "gas" | "induction" | "hybrid";
  requiredClearance: number;
  platformId?: string;
}

export interface UtilityPoint {
  id: string;
  type: "electric" | "water" | "gas" | "drain" | "chimney";
  x: number;
  y: number;
  z: number;
  notes?: string;
  rotation?: Point3D;
  scale?: Point3D;
  locked?: boolean;
}
