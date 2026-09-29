/**
 * core/validation/index.ts
 *
 * Pure validation engine for Kitchen Platform Designer.
 * Evaluates Indian & International kitchen safety, ergonomic, and stone fabrication rules:
 * - Sink-to-hob separation (fire/water hazard, min 600mm)
 * - Cutout stone edge clearances (min 50mm stone bridge)
 * - Cutout overlap and stone web thickness
 * - Window sill vs countertop working height
 * - Refrigerator / appliance ventilation clearances
 * - Platform boundary containment
 *
 * No React or Babylon dependencies.
 */

import type { Project, Wall } from "@/types/project";
import type {
  CountertopPlatform,
  SinkInstance,
  HobInstance,
  ApplianceInstance,
} from "@/types/kitchen";
import {
  computeEdgeClearance,
  isCutoutInsidePlatform,
} from "@/core/geometry/cutout";
import { getWallLength } from "@/core/geometry/wall";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  id: string;
  ruleId: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  suggestion?: string;
  targetObjectId?: string;
  targetObjectType?:
    | "platform"
    | "sink"
    | "hob"
    | "cabinet"
    | "appliance"
    | "opening"
    | "wall"
    | "room";
  metric?: {
    name: string;
    actual: number;
    threshold: number;
    unit: string;
  };
}

export interface ValidationReport {
  timestamp: string;
  isValid: boolean; // false if any severity === "error"
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

// ── RULE 1: SINK TO HOB SEPARATION ──
export const SINK_HOB_MIN_SEPARATION_MM = 600;

export function checkSinkHobSeparation(
  sinks: SinkInstance[],
  hobs: HobInstance[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const sink of sinks) {
    for (const hob of hobs) {
      // Calculate clearance between bounding boxes on horizontal X-Z plane
      const dx = Math.max(
        0,
        Math.max(hob.position.x, sink.position.x) -
          Math.min(hob.position.x + hob.width, sink.position.x + sink.width)
      );
      const dz = Math.max(
        0,
        Math.max(hob.position.z, sink.position.z) -
          Math.min(hob.position.z + hob.depth, sink.position.z + sink.depth)
      );

      const edgeDist = Math.round(Math.sqrt(dx * dx + dz * dz));

      if (edgeDist < SINK_HOB_MIN_SEPARATION_MM) {
        issues.push({
          id: `val-sink-hob-${sink.id}-${hob.id}`,
          ruleId: "sink-hob-clearance",
          severity: edgeDist < 300 ? "error" : "warning",
          title: "Hob & Sink Too Close",
          message: `Distance between '${sink.name}' and '${hob.name}' is ${edgeDist}mm (minimum recommended is ${SINK_HOB_MIN_SEPARATION_MM}mm).`,
          suggestion:
            "Provide at least 600mm of dry prep counter between water tap and cooking flames for fire safety and food prep ergonomics.",
          targetObjectId: hob.id,
          targetObjectType: "hob",
          metric: {
            name: "Separation",
            actual: edgeDist,
            threshold: SINK_HOB_MIN_SEPARATION_MM,
            unit: "mm",
          },
        });
      }
    }
  }

  return issues;
}

// ── RULE 2: CUTOUT EDGE CLEARANCES ──
export const CUTOUT_MIN_EDGE_CLEARANCE_MM = 50;

export function checkCutoutEdgeClearances(
  platforms: CountertopPlatform[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const platform of platforms) {
    if (!platform.cutouts || platform.cutouts.length === 0) continue;

    for (const cutout of platform.cutouts) {
      const clearance = Math.round(computeEdgeClearance(cutout, platform));

      if (clearance < CUTOUT_MIN_EDGE_CLEARANCE_MM) {
        issues.push({
          id: `val-cutout-edge-${platform.id}-${cutout.id}`,
          ruleId: "cutout-edge-clearance",
          severity: "error",
          title: "Fragile Stone Edge",
          message: `Cutout '${cutout.type}' is only ${clearance}mm from the platform slab edge (minimum ${CUTOUT_MIN_EDGE_CLEARANCE_MM}mm required).`,
          suggestion:
            "Move the cutout inward to leave at least 50mm of stone bridge, preventing cracks during fabrication, transit, and installation.",
          targetObjectId: cutout.sourceObjectId || platform.id,
          targetObjectType: cutout.type === "sink" ? "sink" : cutout.type === "hob" ? "hob" : "platform",
          metric: {
            name: "Edge Clearance",
            actual: clearance,
            threshold: CUTOUT_MIN_EDGE_CLEARANCE_MM,
            unit: "mm",
          },
        });
      }
    }
  }

  return issues;
}

// ── RULE 3: CUTOUT CONTAINMENT ──
export function checkCutoutContainment(
  platforms: CountertopPlatform[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const platform of platforms) {
    if (!platform.cutouts || platform.cutouts.length === 0) continue;

    for (const cutout of platform.cutouts) {
      const isInside = isCutoutInsidePlatform(cutout, platform);

      if (!isInside) {
        issues.push({
          id: `val-cutout-outside-${platform.id}-${cutout.id}`,
          ruleId: "cutout-outside-platform",
          severity: "error",
          title: "Cutout Extends Outside Slab",
          message: `Cutout '${cutout.type}' extends outside the boundary of platform '${platform.name}'.`,
          suggestion:
            "Reposition the cutout or adjust platform dimensions so the hole is completely enclosed within the stone slab.",
          targetObjectId: cutout.sourceObjectId || platform.id,
          targetObjectType: "platform",
        });
      }
    }
  }

  return issues;
}

// ── RULE 4: MULTIPLE CUTOUT PROXIMITY / WEB THICKNESS ──
export const MIN_STONE_WEB_BETWEEN_CUTOUTS_MM = 100;

export function checkCutoutOverlap(
  platforms: CountertopPlatform[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const platform of platforms) {
    const cutouts = platform.cutouts || [];
    if (cutouts.length < 2) continue;

    for (let i = 0; i < cutouts.length; i++) {
      for (let j = i + 1; j < cutouts.length; j++) {
        const c1 = cutouts[i];
        const c2 = cutouts[j];

        const dx = Math.max(
          0,
          Math.max(c1.x, c2.x) - Math.min(c1.x + c1.width, c2.x + c2.width)
        );
        const dy = Math.max(
          0,
          Math.max(c1.y, c2.y) - Math.min(c1.y + c1.depth, c2.y + c2.depth)
        );

        const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

        if (distance === 0) {
          // Direct collision
          issues.push({
            id: `val-cutout-collide-${c1.id}-${c2.id}`,
            ruleId: "cutouts-collide",
            severity: "error",
            title: "Cutouts Overlap",
            message: `Cutout '${c1.type}' and cutout '${c2.type}' overlap on platform '${platform.name}'.`,
            suggestion: "Separate the cutouts so each fixture has its own hole.",
            targetObjectId: platform.id,
            targetObjectType: "platform",
          });
        } else if (distance < MIN_STONE_WEB_BETWEEN_CUTOUTS_MM) {
          issues.push({
            id: `val-cutout-web-${c1.id}-${c2.id}`,
            ruleId: "cutout-web-thickness",
            severity: "warning",
            title: "Narrow Stone Web",
            message: `Stone bridge between '${c1.type}' and '${c2.type}' is only ${distance}mm (recommended minimum is ${MIN_STONE_WEB_BETWEEN_CUTOUTS_MM}mm).`,
            suggestion:
              "Increase spacing between holes to avoid stone breakage during sink/hob cutout cutting.",
            targetObjectId: platform.id,
            targetObjectType: "platform",
            metric: {
              name: "Stone Web",
              actual: distance,
              threshold: MIN_STONE_WEB_BETWEEN_CUTOUTS_MM,
              unit: "mm",
            },
          });
        }
      }
    }
  }

  return issues;
}

// ── RULE 5: WINDOW SILL VS COUNTERTOP WORKING HEIGHT ──
export function checkWindowSillHeight(
  walls: Wall[],
  platforms: CountertopPlatform[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (platforms.length === 0) return issues;

  const maxHeight = Math.max(...platforms.map((p) => p.workingHeight));

  for (const wall of walls) {
    const windows = wall.openings.filter((o) => o.type === "window");
    for (const win of windows) {
      if (win.sillHeight < maxHeight) {
        issues.push({
          id: `val-win-sill-${wall.id}-${win.id}`,
          ruleId: "window-sill-height",
          severity: "warning",
          title: "Low Window Sill",
          message: `Window sill (${win.sillHeight}mm) is lower than countertop height (${maxHeight}mm) on ${wall.id.replace("wall-", "")} wall.`,
          suggestion:
            "Countertop or backsplash may block the window sash. Raise sill to >= 950mm or design a dropped counter/window sill ledge.",
          targetObjectId: wall.id,
          targetObjectType: "opening",
          metric: {
            name: "Sill Height",
            actual: win.sillHeight,
            threshold: maxHeight,
            unit: "mm",
          },
        });
      }
    }
  }

  return issues;
}

// ── RULE 6: APPLIANCE REAR VENTILATION ──
export const MIN_REFRIGERATOR_REAR_CLEARANCE_MM = 50;

export function checkApplianceVentilation(
  appliances: ApplianceInstance[],
  walls: Wall[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const appl of appliances) {
    if (appl.category === "refrigerator") {
      const requiredBack = appl.clearance?.back ?? MIN_REFRIGERATOR_REAR_CLEARANCE_MM;

      // Check distance to back wall (assuming z along south or north wall)
      const nearBackWall = walls.some((w) => {
        const wallLen = getWallLength(w);
        return wallLen > 0;
      });

      if (nearBackWall && requiredBack < 25) {
        issues.push({
          id: `val-app-vent-${appl.id}`,
          ruleId: "refrigerator-ventilation",
          severity: "warning",
          title: "Insufficient Ventilation",
          message: `'${appl.name}' requires at least ${requiredBack}mm rear ventilation clearance.`,
          suggestion: "Leave adequate space behind compressor coils to prevent overheating.",
          targetObjectId: appl.id,
          targetObjectType: "appliance",
        });
      }
    }
  }

  return issues;
}

// ── MASTER VALIDATION RUNNER ──
export function runProjectValidation(project: Project): ValidationReport {
  const issues: ValidationIssue[] = [
    ...checkSinkHobSeparation(project.sinks, project.hobs),
    ...checkCutoutEdgeClearances(project.platforms),
    ...checkCutoutContainment(project.platforms),
    ...checkCutoutOverlap(project.platforms),
    ...checkWindowSillHeight(project.walls, project.platforms),
    ...checkApplianceVentilation(project.appliances, project.walls),
  ];

  const errorsCount = issues.filter((i) => i.severity === "error").length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    timestamp: new Date().toISOString(),
    isValid: errorsCount === 0,
    errorsCount,
    warningsCount,
    infoCount,
    issues,
  };
}
