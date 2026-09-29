/**
 * ObjectRenderer — renders sinks, hobs, cabinets, appliances, and utility points
 * as procedural 3D meshes in the Babylon scene.
 *
 * No business logic — only visual representation of store data.
 */

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { SinkInstance, HobInstance, Cabinet, ApplianceInstance, UtilityPoint } from "@/types/kitchen";
import { toSceneLength } from "./coordinates";

export class ObjectRenderer {
  private scene: Scene;
  private sinkMeshes: Mesh[] = [];
  private hobMeshes: Mesh[] = [];
  private cabinetMeshes: Mesh[] = [];
  private applianceMeshes: Mesh[] = [];
  private utilityMeshes: Mesh[] = [];

  // Materials
  private sinkMaterial: StandardMaterial;
  private hobMaterial: StandardMaterial;
  private cabinetBaseMaterial: StandardMaterial;
  private cabinetWallMaterial: StandardMaterial;
  private applianceMaterial: StandardMaterial;
  private utilityMaterial: StandardMaterial;
  private utilityElectricMaterial: StandardMaterial;
  private utilityWaterMaterial: StandardMaterial;
  private utilityDrainMaterial: StandardMaterial;
  private utilityGasMaterial: StandardMaterial;
  private utilityChimneyMaterial: StandardMaterial;
  private selectedMaterial: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;

    // Sink: stainless steel look
    this.sinkMaterial = new StandardMaterial("sinkMat", scene);
    this.sinkMaterial.diffuseColor = new Color3(0.75, 0.78, 0.8);
    this.sinkMaterial.specularColor = new Color3(0.9, 0.9, 0.9);
    this.sinkMaterial.specularPower = 64;

    // Hob: dark glass/ceramic look
    this.hobMaterial = new StandardMaterial("hobMat", scene);
    this.hobMaterial.diffuseColor = new Color3(0.08, 0.08, 0.1);
    this.hobMaterial.specularColor = new Color3(0.6, 0.6, 0.6);
    this.hobMaterial.specularPower = 48;

    // Base cabinet: warm wood tone
    this.cabinetBaseMaterial = new StandardMaterial("cabBaseMat", scene);
    this.cabinetBaseMaterial.diffuseColor = new Color3(0.82, 0.72, 0.58);
    this.cabinetBaseMaterial.specularColor = new Color3(0.15, 0.15, 0.15);

    // Wall cabinet: lighter wood
    this.cabinetWallMaterial = new StandardMaterial("cabWallMat", scene);
    this.cabinetWallMaterial.diffuseColor = new Color3(0.88, 0.82, 0.72);
    this.cabinetWallMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

    // Appliance: white/metallic
    this.applianceMaterial = new StandardMaterial("applianceMat", scene);
    this.applianceMaterial.diffuseColor = new Color3(0.92, 0.92, 0.94);
    this.applianceMaterial.specularColor = new Color3(0.3, 0.3, 0.3);

    // Utility materials by type
    this.utilityMaterial = new StandardMaterial("utilityMat", scene);
    this.utilityMaterial.diffuseColor = new Color3(1.0, 0.8, 0.0);
    this.utilityMaterial.emissiveColor = new Color3(0.3, 0.25, 0.0);

    this.utilityElectricMaterial = new StandardMaterial("utilElectricMat", scene);
    this.utilityElectricMaterial.diffuseColor = new Color3(0.95, 0.75, 0.1);
    this.utilityElectricMaterial.emissiveColor = new Color3(0.35, 0.25, 0.0);

    this.utilityWaterMaterial = new StandardMaterial("utilWaterMat", scene);
    this.utilityWaterMaterial.diffuseColor = new Color3(0.15, 0.55, 0.95);
    this.utilityWaterMaterial.emissiveColor = new Color3(0.05, 0.2, 0.35);

    this.utilityDrainMaterial = new StandardMaterial("utilDrainMat", scene);
    this.utilityDrainMaterial.diffuseColor = new Color3(0.1, 0.75, 0.7);
    this.utilityDrainMaterial.emissiveColor = new Color3(0.05, 0.25, 0.25);

    this.utilityGasMaterial = new StandardMaterial("utilGasMat", scene);
    this.utilityGasMaterial.diffuseColor = new Color3(0.95, 0.35, 0.1);
    this.utilityGasMaterial.emissiveColor = new Color3(0.35, 0.1, 0.02);

    this.utilityChimneyMaterial = new StandardMaterial("utilChimneyMat", scene);
    this.utilityChimneyMaterial.diffuseColor = new Color3(0.65, 0.25, 0.85);
    this.utilityChimneyMaterial.emissiveColor = new Color3(0.25, 0.1, 0.35);

    // Selected highlight
    this.selectedMaterial = new StandardMaterial("objSelectedMat", scene);
    this.selectedMaterial.diffuseColor = new Color3(0.2, 0.5, 1.0);
    this.selectedMaterial.emissiveColor = new Color3(0.1, 0.25, 0.5);
    this.selectedMaterial.specularColor = new Color3(0.5, 0.6, 0.8);
  }

  public updateAll(
    sinks: SinkInstance[],
    hobs: HobInstance[],
    cabinets: Cabinet[],
    appliances: ApplianceInstance[],
    utilityPoints: UtilityPoint[],
    selectedId: string | null
  ): void {
    this.clearAll();
    this.renderSinks(sinks, selectedId);
    this.renderHobs(hobs, selectedId);
    this.renderCabinets(cabinets, selectedId);
    this.renderAppliances(appliances, selectedId);
    this.renderUtilityPoints(utilityPoints, selectedId);
  }

  private renderSinks(sinks: SinkInstance[], selectedId: string | null): void {
    for (const sink of sinks) {
      const isSelected = sink.id === selectedId;
      const w = toSceneLength(sink.width);
      const d = toSceneLength(sink.depth);
      const h = toSceneLength(sink.height);

      // Sink body (basin shape = box with a depression)
      const body = MeshBuilder.CreateBox(`sink-${sink.id}`, { width: w, height: h, depth: d }, this.scene);
      body.position = new Vector3(
        toSceneLength(sink.position.x + sink.width / 2),
        toSceneLength(sink.position.y) - h / 2,
        toSceneLength(sink.position.z + sink.depth / 2)
      );
      body.material = isSelected ? this.selectedMaterial : this.sinkMaterial;
      body.metadata = { objectId: sink.id, type: "sink" };
      body.isPickable = true;
      this.sinkMeshes.push(body);

      // Faucet indicator (small cylinder)
      const faucetH = toSceneLength(120);
      const faucet = MeshBuilder.CreateCylinder(
        `faucet-${sink.id}`,
        { height: faucetH, diameter: toSceneLength(30) },
        this.scene
      );
      faucet.position = new Vector3(
        toSceneLength(sink.position.x + sink.width / 2),
        toSceneLength(sink.position.y) + faucetH / 2,
        toSceneLength(sink.position.z + 40)
      );
      faucet.material = this.sinkMaterial;
      faucet.isPickable = false;
      this.sinkMeshes.push(faucet);
    }
  }

  private renderHobs(hobs: HobInstance[], selectedId: string | null): void {
    for (const hob of hobs) {
      const isSelected = hob.id === selectedId;
      const w = toSceneLength(hob.width);
      const d = toSceneLength(hob.depth);
      const h = toSceneLength(hob.height);

      // Hob surface (flat box)
      const body = MeshBuilder.CreateBox(`hob-${hob.id}`, { width: w, height: h, depth: d }, this.scene);
      body.position = new Vector3(
        toSceneLength(hob.position.x + hob.width / 2),
        toSceneLength(hob.position.y) + h / 2,
        toSceneLength(hob.position.z + hob.depth / 2)
      );
      body.material = isSelected ? this.selectedMaterial : this.hobMaterial;
      body.metadata = { objectId: hob.id, type: "hob" };
      body.isPickable = true;
      this.hobMeshes.push(body);

      // Burner indicators (small cylinders on top)
      const burnerCount = hob.burners;
      const cols = burnerCount <= 2 ? burnerCount : Math.ceil(burnerCount / 2);
      const rows = burnerCount <= 2 ? 1 : 2;
      const spacing = Math.min(w / (cols + 1), d / (rows + 1));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r * cols + c >= burnerCount) break;
          const burner = MeshBuilder.CreateTorus(
            `burner-${hob.id}-${r}-${c}`,
            { diameter: spacing * 0.5, thickness: spacing * 0.06 },
            this.scene
          );
          burner.position = new Vector3(
            toSceneLength(hob.position.x) + spacing * (c + 1),
            toSceneLength(hob.position.y) + h + 0.001,
            toSceneLength(hob.position.z) + (d / (rows + 1)) * (r + 1)
          );
          const burnerMat = new StandardMaterial(`burnerMat-${hob.id}-${r}-${c}`, this.scene);
          burnerMat.diffuseColor = hob.hobType === "gas" ? new Color3(0.3, 0.3, 0.35) : new Color3(0.8, 0.15, 0.1);
          burnerMat.emissiveColor = hob.hobType === "gas" ? new Color3(0, 0, 0) : new Color3(0.3, 0.05, 0.02);
          burner.material = burnerMat;
          burner.isPickable = false;
          this.hobMeshes.push(burner);
        }
      }
    }
  }

  private renderCabinets(cabinets: Cabinet[], selectedId: string | null): void {
    for (const cab of cabinets) {
      const isSelected = cab.id === selectedId;
      const w = toSceneLength(cab.width);
      const h = toSceneLength(cab.height);
      const d = toSceneLength(cab.depth);
      const plinthH = toSceneLength(cab.plinthHeight ?? 0);

      // Main cabinet body
      const body = MeshBuilder.CreateBox(`cab-${cab.id}`, { width: w, height: h - plinthH, depth: d }, this.scene);

      let posY: number;
      if (cab.type === "wall") {
        // Wall cabinets mount at typical height (~1400mm from floor)
        posY = toSceneLength(cab.position.y) + (h - plinthH) / 2;
      } else {
        posY = plinthH + (h - plinthH) / 2;
      }

      body.position = new Vector3(
        toSceneLength(cab.position.x + cab.width / 2),
        posY,
        toSceneLength(cab.position.z + cab.depth / 2)
      );

      const mat = cab.type === "wall" ? this.cabinetWallMaterial : this.cabinetBaseMaterial;
      body.material = isSelected ? this.selectedMaterial : mat;
      body.metadata = { objectId: cab.id, type: "cabinet" };
      body.isPickable = true;
      this.cabinetMeshes.push(body);

      // Plinth (base only)
      if (plinthH > 0 && cab.type !== "wall") {
        const plinth = MeshBuilder.CreateBox(
          `plinth-${cab.id}`,
          { width: w - toSceneLength(20), height: plinthH, depth: d - toSceneLength(30) },
          this.scene
        );
        plinth.position = new Vector3(
          toSceneLength(cab.position.x + cab.width / 2),
          plinthH / 2,
          toSceneLength(cab.position.z + cab.depth / 2 - 5)
        );
        const plinthMat = new StandardMaterial(`plinthMat-${cab.id}`, this.scene);
        plinthMat.diffuseColor = new Color3(0.15, 0.15, 0.17);
        plinth.material = plinthMat;
        plinth.isPickable = false;
        this.cabinetMeshes.push(plinth);
      }

      // Door lines (simple visual cues)
      if (cab.doors > 0) {
        const doorW = w / cab.doors;
        for (let i = 1; i < cab.doors; i++) {
          const line = MeshBuilder.CreateBox(
            `door-line-${cab.id}-${i}`,
            { width: toSceneLength(2), height: h - plinthH - toSceneLength(20), depth: d + 0.001 },
            this.scene
          );
          line.position = new Vector3(
            toSceneLength(cab.position.x) + doorW * i,
            posY,
            toSceneLength(cab.position.z + cab.depth / 2)
          );
          const lineMat = new StandardMaterial(`lineMat-${cab.id}-${i}`, this.scene);
          lineMat.diffuseColor = new Color3(0.3, 0.28, 0.24);
          line.material = lineMat;
          line.isPickable = false;
          this.cabinetMeshes.push(line);
        }
      }
    }
  }

  private renderAppliances(appliances: ApplianceInstance[], selectedId: string | null): void {
    for (const appl of appliances) {
      const isSelected = appl.id === selectedId;
      const w = toSceneLength(appl.dimensions.width);
      const h = toSceneLength(appl.dimensions.height);
      const d = toSceneLength(appl.dimensions.depth);

      const body = MeshBuilder.CreateBox(`appl-${appl.id}`, { width: w, height: h, depth: d }, this.scene);
      body.position = new Vector3(
        toSceneLength(appl.position.x + appl.dimensions.width / 2),
        toSceneLength(appl.position.y) + h / 2,
        toSceneLength(appl.position.z + appl.dimensions.depth / 2)
      );
      body.material = isSelected ? this.selectedMaterial : this.applianceMaterial;
      body.metadata = { objectId: appl.id, type: "appliance" };
      body.isPickable = true;
      this.applianceMeshes.push(body);
    }
  }

  private getUtilityMaterial(type: UtilityPoint["type"]): StandardMaterial {
    switch (type) {
      case "electric":
        return this.utilityElectricMaterial;
      case "water":
        return this.utilityWaterMaterial;
      case "drain":
        return this.utilityDrainMaterial;
      case "gas":
        return this.utilityGasMaterial;
      case "chimney":
        return this.utilityChimneyMaterial;
      default:
        return this.utilityMaterial;
    }
  }

  private renderUtilityPoints(points: UtilityPoint[], selectedId: string | null): void {
    for (const pt of points) {
      const isSelected = pt.id === selectedId;
      const indicator = MeshBuilder.CreateSphere(
        `util-${pt.id}`,
        { diameter: toSceneLength(40) },
        this.scene
      );
      indicator.position = new Vector3(
        toSceneLength(pt.x),
        toSceneLength(pt.y),
        toSceneLength(pt.z)
      );
      indicator.material = isSelected ? this.selectedMaterial : this.getUtilityMaterial(pt.type);
      indicator.metadata = { objectId: pt.id, type: "utility" };
      indicator.isPickable = true;
      this.utilityMeshes.push(indicator);
    }
  }

  private clearAll(): void {
    const allArrays = [
      this.sinkMeshes,
      this.hobMeshes,
      this.cabinetMeshes,
      this.applianceMeshes,
      this.utilityMeshes,
    ];
    for (const arr of allArrays) {
      for (const m of arr) m.dispose();
      arr.length = 0;
    }
  }

  public dispose(): void {
    this.clearAll();
    this.sinkMaterial.dispose();
    this.hobMaterial.dispose();
    this.cabinetBaseMaterial.dispose();
    this.cabinetWallMaterial.dispose();
    this.applianceMaterial.dispose();
    this.utilityMaterial.dispose();
    this.utilityElectricMaterial.dispose();
    this.utilityWaterMaterial.dispose();
    this.utilityDrainMaterial.dispose();
    this.utilityGasMaterial.dispose();
    this.utilityChimneyMaterial.dispose();
    this.selectedMaterial.dispose();
  }
}
