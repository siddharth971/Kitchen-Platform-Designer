import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { Wall, Room } from "@/types/project";
import { generateWallSegments } from "@/core/geometry/wall";
import { toScene, toSceneLength } from "./coordinates";

export class WallRenderer {
  private scene: Scene;
  private wallMeshes: Mesh[] = [];
  private floorMesh: Mesh | null = null;
  private ceilingMesh: Mesh | null = null;
  private openingFrameMeshes: Mesh[] = [];
  private wallRoots = new Map<string, TransformNode>();

  private defaultWallMaterial: StandardMaterial;
  private selectedWallMaterial: StandardMaterial;
  private floorMaterial: StandardMaterial;
  private frameMaterial: StandardMaterial;
  private hiddenWallIds: Set<string> = new Set();
  private interiorViewEnabled = false;

  constructor(scene: Scene) {
    this.scene = scene;

    // Initialize reusable materials
    this.defaultWallMaterial = new StandardMaterial("wallMatDefault", this.scene);
    this.defaultWallMaterial.diffuseColor = new Color3(0.95, 0.95, 0.97);
    this.defaultWallMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

    this.selectedWallMaterial = new StandardMaterial("wallMatSelected", this.scene);
    this.selectedWallMaterial.diffuseColor = new Color3(0.85, 0.92, 1.0);
    this.selectedWallMaterial.emissiveColor = new Color3(0.08, 0.15, 0.25);
    this.selectedWallMaterial.specularColor = new Color3(0.2, 0.2, 0.2);

    this.floorMaterial = new StandardMaterial("floorMat", this.scene);
    this.floorMaterial.diffuseColor = new Color3(0.92, 0.92, 0.94);
    this.floorMaterial.specularColor = new Color3(0.05, 0.05, 0.05);

    this.frameMaterial = new StandardMaterial("frameMat", this.scene);
    this.frameMaterial.diffuseColor = new Color3(0.5, 0.55, 0.6);
    this.frameMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
  }

  public updateRoomAndWalls(room: Room, walls: Wall[], selectedId: string | null): void {
    this.clearMeshes();

    // 1. Build Floor
    const floorWidthScene = toSceneLength(room.length);
    const floorDepthScene = toSceneLength(room.width);

    this.floorMesh = MeshBuilder.CreateGround(
      "roomFloor",
      {
        width: floorWidthScene,
        height: floorDepthScene,
        subdivisions: 1,
      },
      this.scene
    );

    // Floor center in scene units
    this.floorMesh.position.x = floorWidthScene / 2;
    this.floorMesh.position.y = 0;
    this.floorMesh.position.z = floorDepthScene / 2;
    this.floorMesh.material = this.floorMaterial;
    this.floorMesh.metadata = { objectId: "room", type: "room" };
    this.floorMesh.isPickable = true;

    // Optional ceiling
    if (room.ceilingVisible) {
      this.ceilingMesh = MeshBuilder.CreatePlane(
        "roomCeiling",
        {
          width: floorWidthScene,
          height: floorDepthScene,
        },
        this.scene
      );
      this.ceilingMesh.rotation.x = Math.PI / 2;
      this.ceilingMesh.position.x = floorWidthScene / 2;
      this.ceilingMesh.position.y = toSceneLength(room.height);
      this.ceilingMesh.position.z = floorDepthScene / 2;
      this.ceilingMesh.material = this.defaultWallMaterial;
      this.ceilingMesh.isPickable = false;
    }

    // 2. Build Walls
    for (const wall of walls) {
      const wallMeshStart = this.wallMeshes.length;
      const frameMeshStart = this.openingFrameMeshes.length;
      const isSelected = selectedId === wall.id;
      const wallMat = isSelected ? this.selectedWallMaterial : this.defaultWallMaterial;

      const blocks = generateWallSegments(wall);

      blocks.forEach((block) => {
        const mesh = MeshBuilder.CreateBox(
          `mesh-${block.id}`,
          {
            width: toSceneLength(block.dimensions.width),
            height: toSceneLength(block.dimensions.height),
            depth: toSceneLength(block.dimensions.depth),
          },
          this.scene
        );

        const posScene = toScene(block.center);
        mesh.position = posScene;
        mesh.rotation.y = -block.rotationY; // Match right-handed rotation around +Y

        mesh.material = wallMat;
        mesh.metadata = {
          objectId: wall.id,
          type: "wall",
          blockId: block.id,
          partType: block.partType,
        };
        mesh.isPickable = true;

        this.wallMeshes.push(mesh);
        this.applyWallVisibility(mesh, wall.id);
      });

      // 3. Render opening frame trims (doors / windows)
      if (wall.openings && wall.openings.length > 0) {
        const angle = -Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
        const dirX = Math.cos(-angle);
        const dirZ = Math.sin(-angle);

        for (const op of wall.openings) {
          const opMidU = op.offset + op.width / 2;
          const opCenterY = op.sillHeight + op.height / 2;

          const frameMesh = MeshBuilder.CreateBox(
            `frame-${op.id}`,
            {
              width: toSceneLength(op.width),
              height: toSceneLength(op.height),
              depth: toSceneLength(wall.thickness + 10), // slightly proud of wall
            },
            this.scene
          );

          frameMesh.position.x = toSceneLength(wall.start.x) + toSceneLength(opMidU) * dirX;
          frameMesh.position.y = toSceneLength(opCenterY);
          frameMesh.position.z = toSceneLength(wall.start.z) + toSceneLength(opMidU) * dirZ;
          frameMesh.rotation.y = angle;

          frameMesh.visibility = 0.35;
          frameMesh.material = this.frameMaterial;
          frameMesh.metadata = {
            objectId: wall.id,
            subId: op.id,
            type: "opening",
          };
          frameMesh.isPickable = true;

          this.openingFrameMeshes.push(frameMesh);
          this.applyWallVisibility(frameMesh, wall.id);
        }
      }

      const center = new Vector3(
        toSceneLength((wall.start.x + wall.end.x) / 2),
        toSceneLength(wall.height / 2),
        toSceneLength((wall.start.z + wall.end.z) / 2)
      );
      const root = new TransformNode(`wall-root-${wall.id}`, this.scene);
      root.position.copyFrom(center);
      root.metadata = { objectId: wall.id, locked: false };
      for (const mesh of [
        ...this.wallMeshes.slice(wallMeshStart),
        ...this.openingFrameMeshes.slice(frameMeshStart),
      ]) {
        mesh.parent = root;
        mesh.position.subtractInPlace(center);
      }
      this.wallRoots.set(wall.id, root);
    }
  }

  private clearMeshes(): void {
    for (const m of this.wallMeshes) {
      m.dispose();
    }
    this.wallMeshes = [];

    for (const m of this.openingFrameMeshes) {
      m.dispose();
    }
    this.openingFrameMeshes = [];

    for (const root of this.wallRoots.values()) root.dispose(false, false);
    this.wallRoots.clear();

    if (this.floorMesh) {
      this.floorMesh.dispose();
      this.floorMesh = null;
    }

    if (this.ceilingMesh) {
      this.ceilingMesh.dispose();
      this.ceilingMesh = null;
    }
  }

  public setInteriorView(enabled: boolean): void {
    this.interiorViewEnabled = enabled;
    const wallAlpha = enabled ? 0.22 : 1;
    const floorAlpha = enabled ? 0.8 : 1;
    const frameAlpha = enabled ? 0.55 : 1;

    this.defaultWallMaterial.alpha = wallAlpha;
    this.selectedWallMaterial.alpha = wallAlpha;
    this.floorMaterial.alpha = floorAlpha;
    this.frameMaterial.alpha = frameAlpha;

    for (const mesh of this.wallMeshes) {
      mesh.material = mesh.metadata?.type === "wall" ? this.defaultWallMaterial : mesh.material;
      this.applyWallVisibility(mesh, mesh.metadata?.objectId ?? "");
      if (mesh.material) {
        mesh.material.alpha = wallAlpha;
      }
    }

    if (this.floorMesh) {
      this.floorMesh.material = this.floorMaterial;
      this.floorMesh.visibility = enabled ? 0.9 : 1;
      if (this.floorMesh.material) {
        this.floorMesh.material.alpha = floorAlpha;
      }
    }

    for (const mesh of this.openingFrameMeshes) {
      this.applyWallVisibility(mesh, mesh.metadata?.objectId ?? "");
      if (mesh.material) {
        mesh.material.alpha = frameAlpha;
      }
    }
  }

  public setWallVisible(wallId: string, visible: boolean): void {
    if (visible) {
      this.hiddenWallIds.delete(wallId);
    } else {
      this.hiddenWallIds.add(wallId);
    }

    [...this.wallMeshes, ...this.openingFrameMeshes]
      .filter((mesh) => mesh.metadata?.objectId === wallId)
      .forEach((mesh) => this.applyWallVisibility(mesh, wallId));
  }

  public showAllWalls(): void {
    this.hiddenWallIds.clear();
    [...this.wallMeshes, ...this.openingFrameMeshes].forEach((mesh) => {
      this.applyWallVisibility(mesh, mesh.metadata?.objectId ?? "");
    });
  }

  private applyWallVisibility(mesh: Mesh, wallId: string): void {
    const isHidden = this.hiddenWallIds.has(wallId);
    mesh.isPickable = !isHidden;
    mesh.visibility = isHidden ? 0.2 : this.interiorViewEnabled ? 0.3 : 1;
  }

  public dispose(): void {
    this.clearMeshes();
    this.defaultWallMaterial.dispose();
    this.selectedWallMaterial.dispose();
    this.floorMaterial.dispose();
    this.frameMaterial.dispose();
  }

  public getTransformNode(wallId: string): TransformNode | null {
    return this.wallRoots.get(wallId) ?? null;
  }
}
