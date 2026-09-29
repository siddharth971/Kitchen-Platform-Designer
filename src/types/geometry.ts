/**
 * Basic geometric primitive types in millimetres (mm).
 */

export interface Point2D {
  x: number; // along width in mm
  z: number; // along depth in mm
}

export interface Point3D {
  x: number; // along width in mm
  y: number; // height up in mm
  z: number; // along depth in mm
}

export interface Dimensions3D {
  width: number;  // mm (x)
  height: number; // mm (y)
  depth: number;  // mm (z)
}

export interface Transform3D {
  position: Point3D;
  rotationY: number; // degrees or radians
}

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
