export interface Material {
  id: string;
  name: string;
  category: "granite" | "quartz" | "marble" | "solid-surface" | "tile" | "custom";
  textureUrl?: string;
  textureScaleMm?: number;
  baseColor?: string;
  roughness: number;
  metalness: number;
  pricePerSqFt: number;
  pricePerSqM: number;
  pricePerRunningFt?: number;
  maxPieceLengthMm?: number; // drives seams (e.g. 2400-3000 mm)
  slab?: {
    widthMm: number;
    lengthMm: number;
    costPerSlab?: number;
  };
  veined: boolean; // if true, pieces must not be rotated in slab nesting
}

export interface EdgeProfile {
  id: string;
  name: string;
  geometryType: "square" | "pencil" | "bevel" | "half-bullnose" | "full-bullnose" | "custom";
  extraCostPerFt?: number;
}
