/**
 * engine/MeasurementRenderer.ts
 *
 * Babylon renderer for CAD measurements:
 * - Persistent measurement lines with extension ticks
 * - Interactive in-progress measurement line and snap point sphere indicator
 * - Dimension text labels in 3D scene space
 *
 * Visual only — no business logic.
 */

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { MeasurementItem } from "@/core/geometry/measurement";
import type { Point3D } from "@/types/geometry";
import { toScene } from "./coordinates";

export class MeasurementRenderer {
  private scene: Scene;
  private lineMeshes: (LinesMesh | Mesh)[] = [];
  private previewMesh: LinesMesh | null = null;
  private snapMesh: Mesh | null = null;
  private startPointMesh: Mesh | null = null;

  // Materials
  private snapMaterial: StandardMaterial;
  private startPointMaterial: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;

    this.snapMaterial = new StandardMaterial("snapMat", scene);
    this.snapMaterial.diffuseColor = new Color3(1.0, 0.85, 0.0);
    this.snapMaterial.emissiveColor = new Color3(0.5, 0.4, 0.0);

    this.startPointMaterial = new StandardMaterial("startPointMat", scene);
    this.startPointMaterial.diffuseColor = new Color3(0.0, 0.8, 1.0);
    this.startPointMaterial.emissiveColor = new Color3(0.0, 0.4, 0.5);
  }

  public updateMeasurements(measurements: MeasurementItem[]): void {
    this.clearSavedMeshes();

    for (const m of measurements) {
      const p1 = toScene(m.start);
      const p2 = toScene(m.end);

      // Main measurement line
      const line = MeshBuilder.CreateLines(
        `meas-line-${m.id}`,
        { points: [p1, p2] },
        this.scene
      );
      line.color = new Color3(0.1, 0.75, 1.0);
      line.isPickable = false;
      this.lineMeshes.push(line);

      // Start and end endpoint dots
      const dot1 = MeshBuilder.CreateSphere(
        `meas-dot1-${m.id}`,
        { diameter: 0.04 },
        this.scene
      );
      dot1.position = p1;
      dot1.material = this.startPointMaterial;
      dot1.isPickable = false;
      this.lineMeshes.push(dot1);

      const dot2 = MeshBuilder.CreateSphere(
        `meas-dot2-${m.id}`,
        { diameter: 0.04 },
        this.scene
      );
      dot2.position = p2;
      dot2.material = this.startPointMaterial;
      dot2.isPickable = false;
      this.lineMeshes.push(dot2);
    }
  }

  public updatePreview(
    start: Point3D | null,
    current: Point3D | null,
    snappedPoint: Point3D | null
  ): void {
    // 1. Start point indicator
    if (start) {
      if (!this.startPointMesh) {
        this.startPointMesh = MeshBuilder.CreateSphere(
          "meas-preview-start",
          { diameter: 0.05 },
          this.scene
        );
        this.startPointMesh.material = this.startPointMaterial;
        this.startPointMesh.isPickable = false;
      }
      this.startPointMesh.position = toScene(start);
      this.startPointMesh.setEnabled(true);
    } else if (this.startPointMesh) {
      this.startPointMesh.setEnabled(false);
    }

    // 2. Dynamic connecting dashed line from start to current cursor
    if (this.previewMesh) {
      this.previewMesh.dispose();
      this.previewMesh = null;
    }

    if (start && current) {
      const p1 = toScene(start);
      const p2 = toScene(current);

      if (Vector3.Distance(p1, p2) > 0.01) {
        this.previewMesh = MeshBuilder.CreateDashedLines(
          "meas-preview-line",
          {
            points: [p1, p2],
            dashSize: 0.05,
            gapSize: 0.03,
          },
          this.scene
        );
        this.previewMesh.color = new Color3(1.0, 0.7, 0.2);
        this.previewMesh.isPickable = false;
      }
    }

    // 3. Snap target indicator
    if (snappedPoint) {
      if (!this.snapMesh) {
        this.snapMesh = MeshBuilder.CreateTorus(
          "meas-snap-indicator",
          { diameter: 0.08, thickness: 0.015 },
          this.scene
        );
        this.snapMesh.material = this.snapMaterial;
        this.snapMesh.isPickable = false;
      }
      this.snapMesh.position = toScene(snappedPoint);
      this.snapMesh.setEnabled(true);
    } else if (this.snapMesh) {
      this.snapMesh.setEnabled(false);
    }
  }

  public clearPreview(): void {
    if (this.previewMesh) {
      this.previewMesh.dispose();
      this.previewMesh = null;
    }
    if (this.startPointMesh) {
      this.startPointMesh.setEnabled(false);
    }
    if (this.snapMesh) {
      this.snapMesh.setEnabled(false);
    }
  }

  private clearSavedMeshes(): void {
    for (const m of this.lineMeshes) m.dispose();
    this.lineMeshes = [];
  }

  public dispose(): void {
    this.clearSavedMeshes();
    this.clearPreview();
    if (this.startPointMesh) this.startPointMesh.dispose();
    if (this.snapMesh) this.snapMesh.dispose();
    this.snapMaterial.dispose();
    this.startPointMaterial.dispose();
  }
}
