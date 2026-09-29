import { GizmoManager } from "@babylonjs/core/Gizmos/gizmoManager";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { TransformNode as BabylonTransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { SelectableObjectType } from "@/store/selectionSlice";

export type TransformGizmoMode = "translate" | "rotate" | "scale";

export interface TransformGizmoCommit {
  objectId: string;
  objectType: SelectableObjectType;
  positionDeltaMm: { x: number; y: number; z: number };
  rotationDegrees: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface TransformGizmoTarget {
  node: TransformNode;
  objectId: string;
  objectType: SelectableObjectType;
}

export interface TransformSnapOptions {
  grid: boolean;
  walls: boolean;
  objects: boolean;
  corners: boolean;
  stepMm: number;
}

export class TransformGizmoController {
  private readonly manager: GizmoManager;
  private readonly pivot: BabylonTransformNode;
  private targets: TransformGizmoTarget[] = [];
  private dragStart: {
    pivotPosition: Vector3;
    pivotRotation: Vector3;
    pivotScale: Vector3;
    targets: Array<TransformGizmoTarget & { position: Vector3; rotation: Vector3; scale: Vector3 }>;
  } | null = null;
  private wallSnapPoints: Vector3[] = [];
  private objectSnapPoints: Vector3[] = [];
  private cornerSnapPoints: Vector3[] = [];
  private snapOptions: TransformSnapOptions = {
    grid: true,
    walls: false,
    objects: false,
    corners: false,
    stepMm: 10,
  };
  private onCommit: ((changes: TransformGizmoCommit[]) => void) | null = null;
  private onDragStateChange: ((dragging: boolean) => void) | null = null;

  constructor(scene: Scene, onRender: () => void) {
    this.manager = new GizmoManager(scene);
    this.pivot = new BabylonTransformNode("transform-gizmo-pivot", scene);
    this.manager.enableAutoPicking = false;
    this.manager.clearGizmoOnEmptyPointerEvent = false;
    this.manager.usePointerToAttachGizmos = false;
    this.manager.positionGizmoEnabled = true;
    this.manager.rotationGizmoEnabled = true;
    this.manager.scaleGizmoEnabled = true;

    const { positionGizmo, rotationGizmo, scaleGizmo } = this.manager.gizmos;
    positionGizmo?.onDragStartObservable.add(() => this.beginDrag());
    rotationGizmo?.onDragStartObservable.add(() => this.beginDrag());
    scaleGizmo?.onDragStartObservable.add(() => this.beginDrag());
    positionGizmo?.onDragObservable.add(() => { this.applyAutomaticSnapping(); this.updateTargetsFromPivot(); onRender(); });
    rotationGizmo?.onDragObservable.add(() => { this.updateTargetsFromPivot(); onRender(); });
    scaleGizmo?.onDragObservable.add(() => { this.updateTargetsFromPivot(); onRender(); });
    positionGizmo?.onDragEndObservable.add(() => this.finishDrag(onRender));
    rotationGizmo?.onDragEndObservable.add(() => this.finishDrag(onRender));
    scaleGizmo?.onDragEndObservable.add(() => this.finishDrag(onRender));

    this.setMode("translate");
  }

  public setCallbacks(
    onCommit: (changes: TransformGizmoCommit[]) => void,
    onDragStateChange: (dragging: boolean) => void
  ): void {
    this.onCommit = onCommit;
    this.onDragStateChange = onDragStateChange;
  }

  public setTarget(
    target: TransformNode | null,
    objectId: string | null,
    objectType: SelectableObjectType | null,
    locked = false
  ): void {
    this.setTargets(target && objectId && objectType && !locked ? [{ node: target, objectId, objectType }] : []);

    const isWall = objectType === "wall" || objectType === "opening";
    const isPlatform = objectType === "platform";
    const positionGizmo = this.manager.gizmos.positionGizmo;
    const rotationGizmo = this.manager.gizmos.rotationGizmo;
    const scaleGizmo = this.manager.gizmos.scaleGizmo;
    if (positionGizmo) positionGizmo.yGizmo.isEnabled = !isWall;
    if (rotationGizmo) {
      rotationGizmo.xGizmo.isEnabled = !isWall && !isPlatform;
      rotationGizmo.zGizmo.isEnabled = !isWall && !isPlatform;
    }
    if (scaleGizmo) scaleGizmo.yGizmo.isEnabled = !isPlatform;
  }

  public setTargets(targets: TransformGizmoTarget[]): void {
    this.targets = targets.filter((target) => target.node.metadata?.locked !== true);
    if (this.targets.length === 0) {
      this.manager.attachToNode(null);
      return;
    }
    const pivotPosition = this.targets.reduce((sum, target) => sum.addInPlace(target.node.position), Vector3.Zero())
      .scaleInPlace(1 / this.targets.length);
    this.pivot.position.copyFrom(pivotPosition);
    this.pivot.rotation.setAll(0);
    this.pivot.scaling.setAll(1);
    this.manager.attachToNode(this.pivot);

    const isWall = this.targets.some((target) => target.objectType === "wall" || target.objectType === "opening");
    const isPlatform = this.targets.some((target) => target.objectType === "platform");
    const positionGizmo = this.manager.gizmos.positionGizmo;
    const rotationGizmo = this.manager.gizmos.rotationGizmo;
    const scaleGizmo = this.manager.gizmos.scaleGizmo;
    if (positionGizmo) positionGizmo.yGizmo.isEnabled = !isWall;
    if (rotationGizmo) {
      rotationGizmo.xGizmo.isEnabled = !isWall && !isPlatform;
      rotationGizmo.zGizmo.isEnabled = !isWall && !isPlatform;
    }
    if (scaleGizmo) scaleGizmo.yGizmo.isEnabled = !isPlatform;
  }

  public setMode(mode: TransformGizmoMode): void {
    this.manager.positionGizmoEnabled = mode === "translate";
    this.manager.rotationGizmoEnabled = mode === "rotate";
    this.manager.scaleGizmoEnabled = mode === "scale";
  }

  public setSnapping(options: TransformSnapOptions): void {
    this.snapOptions = options;
    const gridStep = options.grid ? options.stepMm / 1000 : 0;
    if (this.manager.gizmos.positionGizmo) {
      this.manager.gizmos.positionGizmo.snapDistance = gridStep;
    }
    if (this.manager.gizmos.rotationGizmo) {
      this.manager.gizmos.rotationGizmo.snapDistance = options.grid ? Math.PI / 12 : 0;
    }
    if (this.manager.gizmos.scaleGizmo) {
      this.manager.gizmos.scaleGizmo.snapDistance = options.grid ? 0.1 : 0;
    }
  }

  public setSnapTargets(walls: Vector3[], objects: Vector3[], corners: Vector3[] = []): void {
    this.wallSnapPoints = walls;
    this.objectSnapPoints = objects;
    this.cornerSnapPoints = corners;
  }

  private beginDrag(): void {
    if (this.targets.length === 0) return;
    this.dragStart = {
      pivotPosition: this.pivot.position.clone(),
      pivotRotation: this.pivot.rotation.clone(),
      pivotScale: this.pivot.scaling.clone(),
      targets: this.targets.map((target) => ({
        ...target,
        position: target.node.position.clone(),
        rotation: target.node.rotation.clone(),
        scale: target.node.scaling.clone(),
      })),
    };
    this.onDragStateChange?.(true);
  }

  private finishDrag(onRender: () => void): void {
    const start = this.dragStart;
    this.dragStart = null;
    this.onDragStateChange?.(false);
    if (!start) return;

    this.applyAutomaticSnapping();
    this.updateTargetsFromPivot();
    const scaleRatio = (value: number, initial: number) => initial === 0 ? 1 : value / initial;
    const scale = {
      x: scaleRatio(this.pivot.scaling.x, start.pivotScale.x),
      y: scaleRatio(this.pivot.scaling.y, start.pivotScale.y),
      z: scaleRatio(this.pivot.scaling.z, start.pivotScale.z),
    };
    const changes = start.targets.map((target) => ({
        objectId: target.objectId,
        objectType: target.objectType,
        positionDeltaMm: {
          x: (target.node.position.x - target.position.x) * 1000,
          y: (target.node.position.y - target.position.y) * 1000,
          z: (target.node.position.z - target.position.z) * 1000,
        },
        rotationDegrees: {
          x: target.node.rotation.x * 180 / Math.PI,
          y: target.node.rotation.y * 180 / Math.PI,
          z: target.node.rotation.z * 180 / Math.PI,
        },
        scale,
      }));
    this.onCommit?.(changes);
    onRender();
  }

  private updateTargetsFromPivot(): void {
    const start = this.dragStart;
    if (!start) return;
    const rotationDelta = this.pivot.rotation.subtract(start.pivotRotation);
    const rotationQuaternion = Quaternion.FromEulerVector(rotationDelta);
    const rotationMatrix = Matrix.Compose(Vector3.One(), rotationQuaternion, Vector3.Zero());
    const scaleRatio = (value: number, initial: number) => initial === 0 ? 1 : value / initial;
    const scale = new Vector3(
      scaleRatio(this.pivot.scaling.x, start.pivotScale.x),
      scaleRatio(this.pivot.scaling.y, start.pivotScale.y),
      scaleRatio(this.pivot.scaling.z, start.pivotScale.z)
    );
    for (const target of start.targets) {
      const relative = target.position.subtract(start.pivotPosition).multiply(scale);
      const rotated = Vector3.TransformCoordinates(relative, rotationMatrix);
      target.node.position.copyFrom(this.pivot.position.add(rotated));
      target.node.rotation.set(
        target.rotation.x + rotationDelta.x,
        target.rotation.y + rotationDelta.y,
        target.rotation.z + rotationDelta.z
      );
      target.node.scaling.copyFrom(target.scale.multiply(scale));
    }
  }

  private applyAutomaticSnapping(): void {
    if (this.snapOptions.corners) this.snapToNearest(this.pivot, this.cornerSnapPoints, true);
    if (this.snapOptions.walls) this.snapToNearest(this.pivot, this.wallSnapPoints, true);
    if (this.snapOptions.objects) this.snapToNearest(this.pivot, this.objectSnapPoints);
  }

  private snapToNearest(node: TransformNode, points: Vector3[], planOnly = false): void {
    const threshold = 0.075;
    let nearest: Vector3 | null = null;
    let nearestDistance = threshold;

    for (const point of points) {
      const distance = planOnly
        ? Math.hypot(node.position.x - point.x, node.position.z - point.z)
        : Vector3.Distance(node.position, point);
      if (distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    }

    if (nearest) {
      if (planOnly) {
        node.position.x = nearest.x;
        node.position.z = nearest.z;
      } else {
        node.position.copyFrom(nearest);
      }
    }
  }

  public dispose(): void {
    this.manager.dispose();
    this.pivot.dispose();
    this.targets = [];
  }
}