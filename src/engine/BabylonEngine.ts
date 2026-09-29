import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color4, Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Nullable } from "@babylonjs/core/types";

import { CameraManager } from "./CameraManager";
import { GridManager } from "./GridManager";
import { WallRenderer } from "./WallRenderer";
import { PlatformRenderer } from "./PlatformRenderer";
import { ObjectRenderer } from "./ObjectRenderer";
import { SelectionManager, type SelectionCallback, type CursorPositionCallback } from "./SelectionManager";
import type { Room, Wall } from "@/types/project";
import type { CountertopPlatform, SinkInstance, HobInstance, Cabinet, ApplianceInstance, UtilityPoint } from "@/types/kitchen";
import type { CameraPresetMode } from "@/store/cameraSlice";

export class BabylonEngine {
  public engine: Engine;
  public scene: Scene;
  public cameraManager: CameraManager;
  public gridManager: GridManager;
  public wallRenderer: WallRenderer;
  public platformRenderer: PlatformRenderer;
  public objectRenderer: ObjectRenderer;
  public selectionManager: SelectionManager;

  private canvas: HTMLCanvasElement;
  private resizeObserver: ResizeObserver | null = null;
  private dirtyFramesRemaining: number = 0;
  private isRendering: boolean = false;
  private cameraMatrixObserver: Nullable<Observer<Camera>> = null;

  constructor(
    canvas: HTMLCanvasElement,
    onSelect: SelectionCallback,
    onCursorMove?: CursorPositionCallback
  ) {
    this.canvas = canvas;

    // Initialize Babylon WebGL Engine with antialiasing and power preference
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      powerPreference: "high-performance",
      antialias: true,
    });

    this.scene = new Scene(this.engine);
    // As decided in DECISIONS.md and Section 3: Right-handed system
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = new Color4(0.96, 0.97, 0.98, 1.0); // Neutral CAD canvas background

    // Setup Lighting
    this.setupLighting();

    // Subsystems
    this.cameraManager = new CameraManager(this.scene, canvas);
    this.gridManager = new GridManager(this.scene);
    this.wallRenderer = new WallRenderer(this.scene);
    this.platformRenderer = new PlatformRenderer(this.scene);
    this.objectRenderer = new ObjectRenderer(this.scene);
    this.selectionManager = new SelectionManager(this.scene, canvas, onSelect, onCursorMove);

    // Render-On-Demand setup
    this.setupRenderOnDemand();

    // Auto-resize on canvas container resize
    this.setupResizeObserver();
  }

  private setupLighting(): void {
    // Hemispheric Ambient Light (Soft sky/ground balance)
    const hemiLight = new HemisphericLight(
      "hemiLight",
      new Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.intensity = 0.85;
    hemiLight.diffuse = new Color3(1, 1, 1);
    hemiLight.groundColor = new Color3(0.7, 0.72, 0.75);

    // Directional Key Light from top-front-right for clear depth perception
    const dirLight = new DirectionalLight(
      "dirLight",
      new Vector3(-0.6, -1.0, -0.5),
      this.scene
    );
    dirLight.intensity = 0.6;
    dirLight.diffuse = new Color3(0.98, 0.98, 0.95);
  }

  private setupRenderOnDemand(): void {
    // Mark dirty whenever camera moves, rotates, or zooms
    this.cameraMatrixObserver = this.cameraManager.camera.onViewMatrixChangedObservable.add(() => {
      this.markDirty(5);
    });

    // Initial render burst to display initial scene
    this.markDirty(10);
  }

  /**
   * Request render for a number of frames.
   * Ensures the engine renders smoothly during transitions and idles when still.
   */
  public markDirty(frames = 3): void {
    this.dirtyFramesRemaining = Math.max(this.dirtyFramesRemaining, frames);
    if (!this.isRendering) {
      this.startRenderLoop();
    }
  }

  private startRenderLoop(): void {
    if (this.isRendering) return;
    this.isRendering = true;

    this.engine.runRenderLoop(() => {
      if (this.dirtyFramesRemaining > 0) {
        this.scene.render();
        this.dirtyFramesRemaining--;
      } else {
        this.engine.stopRenderLoop();
        this.isRendering = false;
      }
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.engine.resize();
      this.markDirty(3);
    });
    this.resizeObserver.observe(this.canvas);
  }

  public updateProjectScene(
    room: Room,
    walls: Wall[],
    platforms: CountertopPlatform[],
    sinks: SinkInstance[],
    hobs: HobInstance[],
    cabinets: Cabinet[],
    appliances: ApplianceInstance[],
    utilityPoints: UtilityPoint[],
    selectedId: string | null,
    gridVisible: boolean
  ): void {
    this.wallRenderer.updateRoomAndWalls(room, walls, selectedId);
    this.platformRenderer.updatePlatforms(platforms, selectedId);
    this.objectRenderer.updateAll(sinks, hobs, cabinets, appliances, utilityPoints, selectedId);
    this.gridManager.updateGrid(room, gridVisible);
    this.markDirty(5);
  }

  public setCameraMode(mode: CameraPresetMode): void {
    this.cameraManager.setMode(mode);
    this.markDirty(10);
  }

  public fitToRoom(room: Room): void {
    this.cameraManager.fitToRoom(room);
    this.markDirty(10);
  }

  public dispose(): void {
    if (this.cameraMatrixObserver) {
      this.cameraManager.camera.onViewMatrixChangedObservable.remove(this.cameraMatrixObserver);
      this.cameraMatrixObserver = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.selectionManager.dispose();
    this.objectRenderer.dispose();
    this.platformRenderer.dispose();
    this.wallRenderer.dispose();
    this.gridManager.dispose();
    this.cameraManager.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
