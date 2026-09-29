import { PolygonMeshBuilder } from "@babylonjs/core/Meshes/polygonMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { CountertopPlatform } from "@/types/kitchen";
import { computePlatformFootprint, computePlatformSeams } from "@/core/geometry/platform";
import { computeCutoutPolygon } from "@/core/geometry/cutout";
import { toSceneLength, toScene2D } from "./coordinates";
import earcut from "earcut";
import { SAMPLE_MATERIALS } from "@/data/presets";

export class PlatformRenderer {
  private scene: Scene;
  private slabMeshes: Mesh[] = [];
  private carcassMeshes: Mesh[] = [];
  private backsplashMeshes: Mesh[] = [];
  private seamLineMeshes: LinesMesh[] = [];
  private dimensionLineMeshes: LinesMesh[] = [];
  private handleMeshes: Mesh[] = [];

  // Materials
  private slabMaterial: StandardMaterial;
  private slabSelectedMaterial: StandardMaterial;
  private carcassMaterial: StandardMaterial;
  private backsplashMaterial: StandardMaterial;
  private handleMaterial: StandardMaterial;
  private slabDefaultColor: Color3;
  private slabSelectedDefaultColor: Color3;
  private platformRoots = new Map<string, TransformNode>();
  private customMaterials: StandardMaterial[] = [];
  private textures = new Map<string, Texture>();

  constructor(scene: Scene) {
    this.scene = scene;

    this.slabDefaultColor = new Color3(0.12, 0.12, 0.14);
    this.slabSelectedDefaultColor = new Color3(0.18, 0.22, 0.3);

    // Countertop Stone Slab Material (Polished Granite / Quartz look)
    this.slabMaterial = new StandardMaterial("slabMatDefault", this.scene);
    this.slabMaterial.diffuseColor = this.slabDefaultColor;
    this.slabMaterial.specularColor = new Color3(0.4, 0.4, 0.4);
    this.slabMaterial.specularPower = 32;

    this.slabSelectedMaterial = new StandardMaterial("slabMatSelected", this.scene);
    this.slabSelectedMaterial.diffuseColor = this.slabSelectedDefaultColor;
    this.slabSelectedMaterial.emissiveColor = new Color3(0.08, 0.12, 0.2);
    this.slabSelectedMaterial.specularColor = new Color3(0.5, 0.6, 0.8);

    // Base Cabinet Support Carcass (Warm light neutral / wood base)
    this.carcassMaterial = new StandardMaterial("carcassMat", this.scene);
    this.carcassMaterial.diffuseColor = new Color3(0.82, 0.8, 0.76);
    this.carcassMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

    // Backsplash Material
    this.backsplashMaterial = new StandardMaterial("backsplashMat", this.scene);
    this.backsplashMaterial.diffuseColor = new Color3(0.15, 0.15, 0.17);
    this.backsplashMaterial.specularColor = new Color3(0.3, 0.3, 0.3);

    // Interactive Resize Handles
    this.handleMaterial = new StandardMaterial("handleMat", this.scene);
    this.handleMaterial.diffuseColor = new Color3(0.2, 0.6, 1.0);
    this.handleMaterial.emissiveColor = new Color3(0.1, 0.3, 0.6);
  }

  public updatePlatforms(
    platforms: CountertopPlatform[],
    selectedId: string | null
  ): void {
    this.clearMeshes();

    for (const platform of platforms) {
      const meshStarts = {
        slabs: this.slabMeshes.length,
        carcasses: this.carcassMeshes.length,
        backsplashes: this.backsplashMeshes.length,
        seams: this.seamLineMeshes.length,
        dimensions: this.dimensionLineMeshes.length,
        handles: this.handleMeshes.length,
      };
      const isSelected = selectedId === platform.id;
      const slabMat = this.getPlatformMaterial(platform, isSelected ? this.slabSelectedMaterial : this.slabMaterial);

      // 1. Compute 2D Footprint Polygon in Global MM
      const footprint = computePlatformFootprint(platform);
      if (footprint.length < 3) continue;

      // Convert to Vector2 scene units for PolygonMeshBuilder
      const corners = footprint.map(
        (p) => new Vector2(toSceneLength(p.x), toSceneLength(p.z))
      );

      // Create Extruded Slab with cutout holes
      const earcutFn = (((earcut as unknown as Record<string, unknown>).default || earcut) as typeof earcut);
      const builder = new PolygonMeshBuilder(
        `slab-${platform.id}`,
        corners,
        this.scene,
        earcutFn
      );

      // Add cutout holes to the slab polygon
      if (platform.cutouts && platform.cutouts.length > 0) {
        for (const cutout of platform.cutouts) {
          const cutoutPoly = computeCutoutPolygon(cutout, platform.position);
          const holeCorners = cutoutPoly.map(
            (p) => new Vector2(toSceneLength(p.x), toSceneLength(p.z))
          );
          if (holeCorners.length >= 3) {
            builder.addHole(holeCorners);
          }
        }
      }

      const slabThicknessScene = toSceneLength(platform.slabThickness);
      const slabMesh = builder.build(true, slabThicknessScene);

      // PolygonMeshBuilder creates mesh on X-Z plane with depth extending in -Y
      // Position top surface at workingHeight
      slabMesh.position.y = toSceneLength(platform.workingHeight);
      slabMesh.material = slabMat;
      slabMesh.metadata = {
        objectId: platform.id,
        type: "platform",
      };
      slabMesh.isPickable = true;
      this.slabMeshes.push(slabMesh);


      // 2. Base Support Carcass (Cabinets below countertop)
      const workingHeightScene = toSceneLength(platform.workingHeight);
      const carcassHeightScene = workingHeightScene - slabThicknessScene;

      if (platform.shape === "straight") {
        const carcassWidth = toSceneLength(platform.length - 20);
        const carcassDepth = toSceneLength(platform.depth - 40); // 40mm inset for overhang/plinth
        const carcassX = toSceneLength(platform.position.x + platform.length / 2);
        const carcassZ = toSceneLength(platform.position.z + platform.depth / 2 - 10);

        const carcassMesh = MeshBuilder.CreateBox(
          `carcass-${platform.id}`,
          {
            width: carcassWidth,
            height: carcassHeightScene,
            depth: carcassDepth,
          },
          this.scene
        );
        carcassMesh.position = new Vector3(
          carcassX,
          carcassHeightScene / 2,
          carcassZ
        );
        carcassMesh.material = this.carcassMaterial;
        carcassMesh.isPickable = false;
        this.carcassMeshes.push(carcassMesh);
      } else if (platform.shape === "l-shaped") {
        const carcassWidthA = toSceneLength(platform.lengthA - 20);
        const carcassDepthA = toSceneLength(platform.depthA - 40);
        const carcassXA = toSceneLength(platform.position.x + platform.lengthA / 2);
        const carcassZA = toSceneLength(platform.position.z + platform.depthA / 2 - 10);

        const carcassA = MeshBuilder.CreateBox(
          `carcass-A-${platform.id}`,
          {
            width: carcassWidthA,
            height: carcassHeightScene,
            depth: carcassDepthA,
          },
          this.scene
        );
        carcassA.position = new Vector3(carcassXA, carcassHeightScene / 2, carcassZA);
        carcassA.material = this.carcassMaterial;
        carcassA.isPickable = false;
        this.carcassMeshes.push(carcassA);

        const carcassLenB = platform.lengthB - platform.depthA - 20;
        if (carcassLenB > 0) {
          const carcassDepthB = toSceneLength(platform.depthB - 40);
          const carcassXB = toSceneLength(platform.position.x + platform.depthB / 2 - 10);
          const carcassZB = toSceneLength(platform.position.z + platform.depthA + carcassLenB / 2);

          const carcassB = MeshBuilder.CreateBox(
            `carcass-B-${platform.id}`,
            {
              width: carcassDepthB,
              height: carcassHeightScene,
              depth: toSceneLength(carcassLenB),
            },
            this.scene
          );
          carcassB.position = new Vector3(carcassXB, carcassHeightScene / 2, carcassZB);
          carcassB.material = this.carcassMaterial;
          carcassB.isPickable = false;
          this.carcassMeshes.push(carcassB);
        }
      } else if (platform.shape === "u-shaped") {
        const baseWidth = toSceneLength(platform.lengthA - 20);
        const baseDepth = toSceneLength(platform.depthA - 40);
        const baseMesh = MeshBuilder.CreateBox(
          `carcass-base-${platform.id}`,
          { width: baseWidth, height: carcassHeightScene, depth: baseDepth },
          this.scene
        );
        baseMesh.position = new Vector3(
          toSceneLength(platform.position.x + platform.lengthA / 2),
          carcassHeightScene / 2,
          toSceneLength(platform.position.z + platform.depthA / 2 - 10)
        );
        baseMesh.material = this.carcassMaterial;
        baseMesh.isPickable = false;
        this.carcassMeshes.push(baseMesh);

        const leftInset = Math.min(platform.depthB, platform.lengthA / 2);
        const rightInset = Math.min(platform.depthB, platform.lengthA / 2);
        const legLength = Math.max(0, platform.lengthB - platform.depthA - 20);
        if (legLength > 0) {
          const leftMesh = MeshBuilder.CreateBox(
            `carcass-left-${platform.id}`,
            { width: toSceneLength(leftInset - 20), height: carcassHeightScene, depth: toSceneLength(legLength) },
            this.scene
          );
          leftMesh.position = new Vector3(
            toSceneLength(platform.position.x + leftInset / 2 - 10),
            carcassHeightScene / 2,
            toSceneLength(platform.position.z + platform.depthA + legLength / 2)
          );
          leftMesh.material = this.carcassMaterial;
          leftMesh.isPickable = false;
          this.carcassMeshes.push(leftMesh);

          const rightMesh = MeshBuilder.CreateBox(
            `carcass-right-${platform.id}`,
            { width: toSceneLength(rightInset - 20), height: carcassHeightScene, depth: toSceneLength(legLength) },
            this.scene
          );
          rightMesh.position = new Vector3(
            toSceneLength(platform.position.x + platform.lengthA - rightInset / 2 + 10),
            carcassHeightScene / 2,
            toSceneLength(platform.position.z + platform.depthA + legLength / 2)
          );
          rightMesh.material = this.carcassMaterial;
          rightMesh.isPickable = false;
          this.carcassMeshes.push(rightMesh);
        }
      }

      // 3. Backsplash (if enabled)
      if (platform.backsplash?.enabled) {
        const bsHeightScene = toSceneLength(platform.backsplash.height);
        const bsThickScene = toSceneLength(platform.backsplash.thickness);

        if (platform.shape === "straight") {
          const bsMesh = MeshBuilder.CreateBox(
            `bs-${platform.id}`,
            {
              width: toSceneLength(platform.length),
              height: bsHeightScene,
              depth: bsThickScene,
            },
            this.scene
          );
          bsMesh.position = new Vector3(
            toSceneLength(platform.position.x + platform.length / 2),
            workingHeightScene + bsHeightScene / 2,
            toSceneLength(platform.position.z + bsThickScene / 2)
          );
          bsMesh.material = this.getSurfaceMaterial(
            platform.backsplash.materialId ?? platform.materialId,
            this.backsplashMaterial,
            `backsplash-${platform.id}`,
            platform.length,
            platform.backsplash.height
          );
          bsMesh.isPickable = false;
          this.backsplashMeshes.push(bsMesh);
        } else if (platform.shape === "l-shaped") {
          const bsMeshA = MeshBuilder.CreateBox(
            `bs-A-${platform.id}`,
            {
              width: toSceneLength(platform.lengthA),
              height: bsHeightScene,
              depth: bsThickScene,
            },
            this.scene
          );
          bsMeshA.position = new Vector3(
            toSceneLength(platform.position.x + platform.lengthA / 2),
            workingHeightScene + bsHeightScene / 2,
            toSceneLength(platform.position.z + bsThickScene / 2)
          );
          bsMeshA.material = this.getSurfaceMaterial(
            platform.backsplash.materialId ?? platform.materialId,
            this.backsplashMaterial,
            `backsplash-a-${platform.id}`,
            platform.lengthA,
            platform.backsplash.height
          );
          bsMeshA.isPickable = false;
          this.backsplashMeshes.push(bsMeshA);

          const bsMeshB = MeshBuilder.CreateBox(
            `bs-B-${platform.id}`,
            {
              width: bsThickScene,
              height: bsHeightScene,
              depth: toSceneLength(platform.lengthB),
            },
            this.scene
          );
          bsMeshB.position = new Vector3(
            toSceneLength(platform.position.x + bsThickScene / 2),
            workingHeightScene + bsHeightScene / 2,
            toSceneLength(platform.position.z + platform.lengthB / 2)
          );
          bsMeshB.material = this.getSurfaceMaterial(
            platform.backsplash.materialId ?? platform.materialId,
            this.backsplashMaterial,
            `backsplash-b-${platform.id}`,
            platform.lengthB,
            platform.backsplash.height
          );
          bsMeshB.isPickable = false;
          this.backsplashMeshes.push(bsMeshB);
        } else if (platform.shape === "u-shaped") {
          const bsBase = MeshBuilder.CreateBox(
            `bs-base-${platform.id}`,
            {
              width: toSceneLength(platform.lengthA),
              height: bsHeightScene,
              depth: bsThickScene,
            },
            this.scene
          );
          bsBase.position = new Vector3(
            toSceneLength(platform.position.x + platform.lengthA / 2),
            workingHeightScene + bsHeightScene / 2,
            toSceneLength(platform.position.z + bsThickScene / 2)
          );
          bsBase.material = this.getSurfaceMaterial(
            platform.backsplash.materialId ?? platform.materialId,
            this.backsplashMaterial,
            `backsplash-base-${platform.id}`,
            platform.lengthA,
            platform.backsplash.height
          );
          bsBase.isPickable = false;
          this.backsplashMeshes.push(bsBase);

          const leftB = MeshBuilder.CreateBox(
            `bs-left-${platform.id}`,
            { width: bsThickScene, height: bsHeightScene, depth: toSceneLength(platform.lengthB) },
            this.scene
          );
          leftB.position = new Vector3(
            toSceneLength(platform.position.x + bsThickScene / 2),
            workingHeightScene + bsHeightScene / 2,
            toSceneLength(platform.position.z + platform.lengthB / 2)
          );
          leftB.material = this.getSurfaceMaterial(
            platform.backsplash.materialId ?? platform.materialId,
            this.backsplashMaterial,
            `backsplash-left-${platform.id}`,
            platform.lengthB,
            platform.backsplash.height
          );
          leftB.isPickable = false;
          this.backsplashMeshes.push(leftB);

          const rightB = MeshBuilder.CreateBox(
            `bs-right-${platform.id}`,
            { width: bsThickScene, height: bsHeightScene, depth: toSceneLength(platform.lengthB) },
            this.scene
          );
          rightB.position = new Vector3(
            toSceneLength(platform.position.x + platform.lengthA - bsThickScene / 2),
            workingHeightScene + bsHeightScene / 2,
            toSceneLength(platform.position.z + platform.lengthB / 2)
          );
          rightB.material = this.getSurfaceMaterial(
            platform.backsplash.materialId ?? platform.materialId,
            this.backsplashMaterial,
            `backsplash-right-${platform.id}`,
            platform.lengthB,
            platform.backsplash.height
          );
          rightB.isPickable = false;
          this.backsplashMeshes.push(rightB);
        }
      }

      // 4. Seam Lines (subtle line on top surface)
      const seams = computePlatformSeams(platform);
      if (seams.length > 0) {
        // Seam lines are positioned slightly above the slab top via toScene2D
        const seamLines: Vector3[][] = seams.map((s) => [
          toScene2D(s.start, platform.workingHeight + 1),
          toScene2D(s.end, platform.workingHeight + 1),
        ]);

        const seamMesh = MeshBuilder.CreateLineSystem(
          `seams-${platform.id}`,
          { lines: seamLines },
          this.scene
        );
        seamMesh.color = new Color3(0.05, 0.05, 0.05); // Dark subtle join line
        seamMesh.alpha = 0.9;
        seamMesh.isPickable = false;
        this.seamLineMeshes.push(seamMesh);
      }

      // 5. Selected Dimension Lines & Resize Handles
      if (isSelected) {
        const topY = workingHeightScene + 0.002;
        const dimLines: Vector3[][] = [];

        if (platform.shape === "straight") {
          // Length dimension line along front edge
          const p1 = new Vector3(
            toSceneLength(platform.position.x),
            topY,
            toSceneLength(platform.position.z + platform.depth)
          );
          const p2 = new Vector3(
            toSceneLength(platform.position.x + platform.length),
            topY,
            toSceneLength(platform.position.z + platform.depth)
          );
          dimLines.push([p1, p2]);

          // End handle at X end for length resize
          const handle = MeshBuilder.CreateSphere(
            `handle-len-${platform.id}`,
            { diameter: 0.08 }, // 80mm diameter sphere
            this.scene
          );
          handle.position = new Vector3(
            toSceneLength(platform.position.x + platform.length),
            topY,
            toSceneLength(platform.position.z + platform.depth / 2)
          );
          handle.material = this.handleMaterial;
          handle.metadata = {
            objectId: platform.id,
            type: "platform-handle",
            axis: "length",
          };
          this.handleMeshes.push(handle);
        } else if (platform.shape === "l-shaped") {
          // Handle for Run A length
          const handleA = MeshBuilder.CreateSphere(
            `handle-lenA-${platform.id}`,
            { diameter: 0.08 },
            this.scene
          );
          handleA.position = new Vector3(
            toSceneLength(platform.position.x + platform.lengthA),
            topY,
            toSceneLength(platform.position.z + platform.depthA / 2)
          );
          handleA.material = this.handleMaterial;
          handleA.metadata = {
            objectId: platform.id,
            type: "platform-handle",
            axis: "lengthA",
          };
          this.handleMeshes.push(handleA);

          // Handle for Run B length
          const handleB = MeshBuilder.CreateSphere(
            `handle-lenB-${platform.id}`,
            { diameter: 0.08 },
            this.scene
          );
          handleB.position = new Vector3(
            toSceneLength(platform.position.x + platform.depthB / 2),
            topY,
            toSceneLength(platform.position.z + platform.lengthB)
          );
          handleB.material = this.handleMaterial;
          handleB.metadata = {
            objectId: platform.id,
            type: "platform-handle",
            axis: "lengthB",
          };
          this.handleMeshes.push(handleB);
        }

        if (dimLines.length > 0) {
          const dimMesh = MeshBuilder.CreateLineSystem(
            `dim-${platform.id}`,
            { lines: dimLines },
            this.scene
          );
          dimMesh.color = new Color3(0.2, 0.6, 1.0);
          dimMesh.isPickable = false;
          this.dimensionLineMeshes.push(dimMesh);
        }
      }

      this.groupPlatformMeshes(platform, meshStarts);
    }
  }

  private getPlatformMaterial(
    platform: CountertopPlatform,
    baseMaterial: StandardMaterial
  ): StandardMaterial {
    const materialId = platform.textureId ?? platform.materialId;
    return this.getSurfaceMaterial(
      materialId,
      baseMaterial,
      `slab-${platform.id}-material`,
      platform.shape === "straight" ? platform.length : platform.lengthA,
      platform.shape === "straight" ? platform.depth : platform.lengthB,
      platform.color
    );
  }

  private getSurfaceMaterial(
    materialId: string | undefined,
    baseMaterial: StandardMaterial,
    name: string,
    widthMm: number,
    depthMm: number,
    colorOverride?: string
  ): StandardMaterial {
    const catalogMaterial = SAMPLE_MATERIALS.find((material) => material.id === materialId);
    if (!colorOverride && !catalogMaterial?.baseColor && !catalogMaterial?.textureUrl) return baseMaterial;

    const material = baseMaterial.clone(name);
    if (!material) return baseMaterial;
    if (catalogMaterial?.textureUrl) {
      material.diffuseColor = Color3.White();
    } else if (catalogMaterial?.baseColor) {
      material.diffuseColor = Color3.FromHexString(catalogMaterial.baseColor);
    }
    if (colorOverride) material.diffuseColor = Color3.FromHexString(colorOverride);
    if (catalogMaterial?.textureUrl) {
      const textureScale = catalogMaterial.textureScaleMm ?? 2400;
      const uScale = Math.max(1, widthMm / textureScale);
      const vScale = Math.max(1, depthMm / textureScale);
      const textureKey = `${catalogMaterial.textureUrl}:${uScale}:${vScale}`;
      let texture = this.textures.get(textureKey);
      if (!texture) {
        texture = new Texture(catalogMaterial.textureUrl, this.scene, true, false);
        texture.wrapU = Texture.WRAP_ADDRESSMODE;
        texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.uScale = uScale;
        texture.vScale = vScale;
        this.textures.set(textureKey, texture);
      }
      material.diffuseTexture = texture;
    }
    this.customMaterials.push(material);
    return material;
  }

  private groupPlatformMeshes(
    platform: CountertopPlatform,
    starts: { slabs: number; carcasses: number; backsplashes: number; seams: number; dimensions: number; handles: number }
  ): void {
    const root = new TransformNode(`platform-root-${platform.id}`, this.scene);
    const width = platform.shape === "straight" ? platform.length : platform.lengthA;
    const depth = platform.shape === "straight" ? platform.depth : platform.lengthB;
    const center = new Vector3(
      toSceneLength(platform.position.x + width / 2),
      toSceneLength(platform.workingHeight / 2),
      toSceneLength(platform.position.z + depth / 2)
    );
    const rotation = platform.rotation ?? { x: 0, y: 0, z: 0 };
    root.position.copyFrom(center);
    root.metadata = { objectId: platform.id, locked: platform.locked === true };
    root.rotation.set(
      rotation.x * Math.PI / 180,
      rotation.y * Math.PI / 180,
      rotation.z * Math.PI / 180
    );
    root.setEnabled(platform.visible !== false);
    const relatedMeshes = [
      ...this.slabMeshes.slice(starts.slabs),
      ...this.carcassMeshes.slice(starts.carcasses),
      ...this.backsplashMeshes.slice(starts.backsplashes),
      ...this.seamLineMeshes.slice(starts.seams),
      ...this.dimensionLineMeshes.slice(starts.dimensions),
      ...this.handleMeshes.slice(starts.handles),
    ];
    for (const mesh of relatedMeshes) {
      mesh.parent = root;
      mesh.position.subtractInPlace(center);
      mesh.visibility = platform.opacity ?? 1;
    }
    this.platformRoots.set(platform.id, root);
  }

  private clearMeshes(): void {
    for (const m of this.slabMeshes) m.dispose();
    this.slabMeshes = [];

    for (const m of this.carcassMeshes) m.dispose();
    this.carcassMeshes = [];

    for (const m of this.backsplashMeshes) m.dispose();
    this.backsplashMeshes = [];

    for (const m of this.seamLineMeshes) m.dispose();
    this.seamLineMeshes = [];

    for (const m of this.dimensionLineMeshes) m.dispose();
    this.dimensionLineMeshes = [];

    for (const m of this.handleMeshes) m.dispose();
    this.handleMeshes = [];

    for (const root of this.platformRoots.values()) root.dispose(false, false);
    this.platformRoots.clear();
    for (const material of this.customMaterials) material.dispose(false, false);
    this.customMaterials = [];
  }

  public setInteriorView(enabled: boolean): void {
    const interiorColor = new Color3(0.78, 0.82, 0.88);
    const interiorSelectedColor = new Color3(0.7, 0.78, 0.95);

    this.slabMaterial.diffuseColor = enabled ? interiorColor : this.slabDefaultColor;
    this.slabSelectedMaterial.diffuseColor = enabled ? interiorSelectedColor : this.slabSelectedDefaultColor;
    this.slabMaterial.alpha = enabled ? 0.98 : 1;
    this.slabSelectedMaterial.alpha = enabled ? 0.98 : 1;

    for (const mesh of this.slabMeshes) {
      if (mesh.material) {
        mesh.material.alpha = enabled ? 0.98 : 1;
      }
    }
  }

  public dispose(): void {
    this.clearMeshes();
    this.slabMaterial.dispose();
    this.slabSelectedMaterial.dispose();
    this.carcassMaterial.dispose();
    this.backsplashMaterial.dispose();
    this.handleMaterial.dispose();
    for (const texture of this.textures.values()) texture.dispose();
    this.textures.clear();
  }

  public getTransformNode(platformId: string): TransformNode | null {
    return this.platformRoots.get(platformId) ?? null;
  }
}
