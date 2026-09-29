import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { Room } from "@/types/project";
import { toSceneLength } from "./coordinates";

export class GridManager {
  private scene: Scene;
  private majorGridMesh: LinesMesh | null = null;
  private minorGridMesh: LinesMesh | null = null;
  private isVisible: boolean = true;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public updateGrid(room: Room, visible: boolean = true): void {
    this.isVisible = visible;
    this.dispose();

    if (!visible) return;

    // Extend grid slightly past room boundaries
    const marginMm = 1000; // 1m margin
    const minXMm = -marginMm;
    const maxXMm = room.length + marginMm;
    const minZMm = -marginMm;
    const maxZMm = room.width + marginMm;

    const minXScene = toSceneLength(minXMm);
    const maxXScene = toSceneLength(maxXMm);
    const minZScene = toSceneLength(minZMm);
    const maxZScene = toSceneLength(maxZMm);

    const majorLines: Vector3[][] = [];
    const minorLines: Vector3[][] = [];

    // Minor lines every 100 mm (0.1 scene units)
    const minorStepMm = 100;
    const majorStepMm = 1000;

    // Lines along Z (constant X)
    for (let x = Math.floor(minXMm / minorStepMm) * minorStepMm; x <= maxXMm; x += minorStepMm) {
      const isMajor = x % majorStepMm === 0;
      const xScene = toSceneLength(x);
      const line = [new Vector3(xScene, 0.001, minZScene), new Vector3(xScene, 0.001, maxZScene)];
      if (isMajor) {
        majorLines.push(line);
      } else {
        minorLines.push(line);
      }
    }

    // Lines along X (constant Z)
    for (let z = Math.floor(minZMm / minorStepMm) * minorStepMm; z <= maxZMm; z += minorStepMm) {
      const isMajor = z % majorStepMm === 0;
      const zScene = toSceneLength(z);
      const line = [new Vector3(minXScene, 0.001, zScene), new Vector3(maxXScene, 0.001, zScene)];
      if (isMajor) {
        majorLines.push(line);
      } else {
        minorLines.push(line);
      }
    }

    if (minorLines.length > 0) {
      this.minorGridMesh = MeshBuilder.CreateLineSystem(
        "minorGrid",
        { lines: minorLines },
        this.scene
      );
      this.minorGridMesh.color = new Color3(0.85, 0.88, 0.92);
      this.minorGridMesh.alpha = 0.5;
      this.minorGridMesh.isPickable = false;
    }

    if (majorLines.length > 0) {
      this.majorGridMesh = MeshBuilder.CreateLineSystem(
        "majorGrid",
        { lines: majorLines },
        this.scene
      );
      this.majorGridMesh.color = new Color3(0.65, 0.7, 0.78);
      this.majorGridMesh.alpha = 0.8;
      this.majorGridMesh.isPickable = false;
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.majorGridMesh) this.majorGridMesh.isVisible = visible;
    if (this.minorGridMesh) this.minorGridMesh.isVisible = visible;
  }

  public dispose(): void {
    if (this.majorGridMesh) {
      this.majorGridMesh.dispose();
      this.majorGridMesh = null;
    }
    if (this.minorGridMesh) {
      this.minorGridMesh.dispose();
      this.minorGridMesh = null;
    }
  }
}
