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
import { toSceneLength } from "./coordinates";
import { GridManager } from "./GridManager";
import { WallRenderer } from "./WallRenderer";
import { PlatformRenderer } from "./PlatformRenderer";
import { ObjectRenderer } from "./ObjectRenderer";
import { MeasurementRenderer } from "./MeasurementRenderer";
import { TransformGizmoController, type TransformGizmoCommit, type TransformGizmoMode, type TransformSnapOptions } from "./TransformGizmoController";
import { SelectionManager, type SelectionCallback, type CursorPositionCallback } from "./SelectionManager";
import type { Room, Wall } from "@/types/project";
import type { CountertopPlatform, SinkInstance, HobInstance, Cabinet, ApplianceInstance, UtilityPoint } from "@/types/kitchen";
import type { MeasurementItem } from "@/core/geometry/measurement";
import type { Point3D } from "@/types/geometry";
import type { CameraPresetMode } from "@/store/cameraSlice";
import type { SelectableObjectType } from "@/store/selectionSlice";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

function boxSnapAnchors(center: Vector3, size: Vector3): { anchors: Vector3[]; corners: Vector3[] } {
  const anchors: Vector3[] = [];
  const corners: Vector3[] = [];
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (x === 0 && y === 0 && z === 0) continue;
        const point = new Vector3(
          center.x + x * size.x / 2,
          center.y + y * size.y / 2,
          center.z + z * size.z / 2
        );
        anchors.push(point);
        if (Math.abs(x) === 1 && Math.abs(y) === 1 && Math.abs(z) === 1) corners.push(point.clone());
      }
    }
  }
  return { anchors, corners };
}

export class BabylonEngine {
  public engine: Engine;
  public scene: Scene;
  public cameraManager: CameraManager;
  public gridManager: GridManager;
  public wallRenderer: WallRenderer;
  public platformRenderer: PlatformRenderer;
  public objectRenderer: ObjectRenderer;
  public measurementRenderer: MeasurementRenderer;
  public selectionManager: SelectionManager;
  public transformGizmoController: TransformGizmoController;

  private canvas: HTMLCanvasElement;
  private resizeObserver: ResizeObserver | null = null;
  private dirtyFramesRemaining: number = 0;
  private isRendering: boolean = false;
  private cameraMatrixObserver: Nullable<Observer<Camera>> = null;

  constructor(
    canvas: HTMLCanvasElement,
    onSelect: SelectionCallback,
    onCursorMove?: CursorPositionCallback,
    onTransformCommit?: (commit: TransformGizmoCommit) => void
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
    this.measurementRenderer = new MeasurementRenderer(this.scene);
    this.selectionManager = new SelectionManager(this.scene, canvas, onSelect, onCursorMove);
    this.transformGizmoController = new TransformGizmoController(
      this.scene,
      () => this.markDirty(2)
    );
    this.transformGizmoController.setCallbacks(
      onTransformCommit ?? (() => undefined),
      (dragging) => this.cameraManager.setPointerControlsEnabled(!dragging)
    );

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
    measurements: MeasurementItem[] = [],
    selectedId: string | null = null,
    gridVisible: boolean = true
  ): void {
    this.wallRenderer.updateRoomAndWalls(room, walls, selectedId);
    this.platformRenderer.updatePlatforms(platforms, selectedId);
    this.objectRenderer.updateAll(sinks, hobs, cabinets, appliances, utilityPoints, selectedId);
    this.measurementRenderer.updateMeasurements(measurements);
    this.gridManager.updateGrid(room, gridVisible);
    const wallSnapPoints = walls
      .filter((wall) => wall.id !== selectedId)
      .flatMap((wall) => {
        const centerX = (wall.start.x + wall.end.x) / 2;
        const centerZ = (wall.start.z + wall.end.z) / 2;
        return [wall.start, { x: centerX, z: centerZ }, wall.end].map((point) => new Vector3(
          toSceneLength(point.x),
          toSceneLength(wall.height / 2),
          toSceneLength(point.z)
        ));
      });
    const objectSnapPoints: Vector3[] = [];
    const cornerSnapPoints = walls
      .filter((wall) => wall.id !== selectedId)
      .flatMap((wall) => [wall.start, wall.end].map((point) => new Vector3(
        toSceneLength(point.x), 0, toSceneLength(point.z)
      )));
    const addObjectAnchors = (id: string, position: Vector3, size: Vector3) => {
      if (id === selectedId) return;
      const points = boxSnapAnchors(position, size);
      objectSnapPoints.push(...points.anchors);
      cornerSnapPoints.push(...points.corners);
    };

    platforms.forEach((item) => {
      const width = item.shape === "straight" ? item.length : item.lengthA;
      const depth = item.shape === "straight" ? item.depth : item.lengthB;
      addObjectAnchors(item.id, new Vector3(
        toSceneLength(item.position.x + width / 2),
        toSceneLength(item.workingHeight / 2),
        toSceneLength(item.position.z + depth / 2)
      ), new Vector3(toSceneLength(width), toSceneLength(item.workingHeight), toSceneLength(depth)));
    });
    sinks.forEach((item) => addObjectAnchors(item.id, new Vector3(
      toSceneLength(item.position.x + item.width / 2),
      toSceneLength(item.position.y),
      toSceneLength(item.position.z + item.depth / 2)
    ), new Vector3(toSceneLength(item.width), toSceneLength(item.height), toSceneLength(item.depth))));
    hobs.forEach((item) => addObjectAnchors(item.id, new Vector3(
      toSceneLength(item.position.x + item.width / 2),
      toSceneLength(item.position.y + item.height / 2),
      toSceneLength(item.position.z + item.depth / 2)
    ), new Vector3(toSceneLength(item.width), toSceneLength(item.height), toSceneLength(item.depth))));
    cabinets.forEach((item) => addObjectAnchors(item.id, new Vector3(
      toSceneLength(item.position.x + item.width / 2),
      toSceneLength(item.position.y + item.height / 2),
      toSceneLength(item.position.z + item.depth / 2)
    ), new Vector3(toSceneLength(item.width), toSceneLength(item.height), toSceneLength(item.depth))));
    appliances.forEach((item) => addObjectAnchors(item.id, new Vector3(
      toSceneLength(item.position.x + item.dimensions.width / 2),
      toSceneLength(item.position.y + item.dimensions.height / 2),
      toSceneLength(item.position.z + item.dimensions.depth / 2)
    ), new Vector3(
      toSceneLength(item.dimensions.width),
      toSceneLength(item.dimensions.height),
      toSceneLength(item.dimensions.depth)
    )));
    utilityPoints.forEach((item) => addObjectAnchors(item.id, new Vector3(
      toSceneLength(item.x), toSceneLength(item.y), toSceneLength(item.z)
    ), new Vector3(toSceneLength(40), toSceneLength(40), toSceneLength(40))));
    this.transformGizmoController.setSnapTargets(wallSnapPoints, objectSnapPoints, cornerSnapPoints);
    this.markDirty(5);
  }

  public setTransformTarget(id: string | null, type: SelectableObjectType | null, enabled = true): void {
    let root: TransformNode | null = null;
    if (enabled && id && (type === "wall" || type === "opening")) root = this.wallRenderer.getTransformNode(id);
    if (enabled && id && type === "platform") root = this.platformRenderer.getTransformNode(id);
    if (enabled && id && (type === "cabinet" || type === "appliance" || type === "sink" || type === "hob" || type === "utility")) {
      root = this.objectRenderer.getTransformNode(id);
    }

    this.transformGizmoController.setTarget(root, id, type, root?.metadata?.locked === true);
    this.markDirty(3);
  }

  public setTransformMode(mode: TransformGizmoMode): void {
    this.transformGizmoController.setMode(mode);
    this.markDirty(3);
  }

  public setTransformSnapping(options: TransformSnapOptions): void {
    this.transformGizmoController.setSnapping(options);
  }

  public updateMeasurementPreview(
    start: Point3D | null,
    current: Point3D | null,
    snappedPoint: Point3D | null
  ): void {
    this.measurementRenderer.updatePreview(start, current, snappedPoint);
    this.markDirty(2);
  }

  public clearMeasurementPreview(): void {
    this.measurementRenderer.clearPreview();
    this.markDirty(2);
  }

  public setCameraMode(mode: CameraPresetMode): void {
    this.cameraManager.setMode(mode);
    this.wallRenderer.setInteriorView(mode === "inside");
    this.platformRenderer.setInteriorView(mode === "inside");
    this.markDirty(10);
  }

  public setWallVisible(wallId: string, visible: boolean): void {
    this.wallRenderer.setWallVisible(wallId, visible);
    this.markDirty(3);
  }

  public showAllWalls(): void {
    this.wallRenderer.showAllWalls();
    this.markDirty(3);
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
    this.transformGizmoController.dispose();
    this.measurementRenderer.dispose();
    this.objectRenderer.dispose();
    this.platformRenderer.dispose();
    this.wallRenderer.dispose();
    this.gridManager.dispose();
    this.cameraManager.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
