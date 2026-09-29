import { GizmoManager } from "@babylonjs/core/Gizmos/gizmoManager";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { SelectableObjectType } from "@/store/selectionSlice";

export type TransformGizmoMode = "translate" | "rotate" | "scale";

export interface TransformGizmoCommit {
  objectId: string;
  objectType: SelectableObjectType;
  positionDeltaMm: { x: number; y: number; z: number };
  rotationDegrees: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
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
  private target: TransformNode | null = null;
  private targetId: string | null = null;
  private targetType: SelectableObjectType | null = null;
  private dragStart: {
    node: TransformNode;
    position: Vector3;
    scale: Vector3;
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
  private onCommit: ((change: TransformGizmoCommit) => void) | null = null;
  private onDragStateChange: ((dragging: boolean) => void) | null = null;

  constructor(scene: Scene, onRender: () => void) {
    this.manager = new GizmoManager(scene);
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
    positionGizmo?.onDragObservable.add(onRender);
    rotationGizmo?.onDragObservable.add(onRender);
    scaleGizmo?.onDragObservable.add(onRender);
    positionGizmo?.onDragEndObservable.add(() => this.finishDrag(onRender));
    rotationGizmo?.onDragEndObservable.add(() => this.finishDrag(onRender));
    scaleGizmo?.onDragEndObservable.add(() => this.finishDrag(onRender));

    this.setMode("translate");
  }

  public setCallbacks(
    onCommit: (change: TransformGizmoCommit) => void,
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
    this.target = target && !locked ? target : null;
    this.targetId = this.target ? objectId : null;
    this.targetType = this.target ? objectType : null;
    this.manager.attachToNode(this.target);

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
    const node = this.target;
    if (!node) return;
    this.dragStart = {
      node,
      position: node.position.clone(),
      scale: node.scaling.clone(),
    };
    this.onDragStateChange?.(true);
  }

  private finishDrag(onRender: () => void): void {
    const start = this.dragStart;
    this.dragStart = null;
    this.onDragStateChange?.(false);
    if (!start || this.target !== start.node || !this.targetId || !this.targetType) return;

    if (this.snapOptions.corners) this.snapToNearest(start.node, this.cornerSnapPoints, true);
    if (this.snapOptions.walls) this.snapToNearest(start.node, this.wallSnapPoints, true);
    if (this.snapOptions.objects) this.snapToNearest(start.node, this.objectSnapPoints);

    const finalPosition = start.node.position;
    const finalRotation = start.node.rotation;
    const finalScale = start.node.scaling;
    const scaleRatio = (value: number, initial: number) => initial === 0 ? 1 : value / initial;

    this.onCommit?.({
      objectId: this.targetId,
      objectType: this.targetType,
      positionDeltaMm: {
        x: (finalPosition.x - start.position.x) * 1000,
        y: (finalPosition.y - start.position.y) * 1000,
        z: (finalPosition.z - start.position.z) * 1000,
      },
      rotationDegrees: {
        x: finalRotation.x * 180 / Math.PI,
        y: finalRotation.y * 180 / Math.PI,
        z: finalRotation.z * 180 / Math.PI,
      },
      scale: {
        x: scaleRatio(finalScale.x, start.scale.x),
        y: scaleRatio(finalScale.y, start.scale.y),
        z: scaleRatio(finalScale.z, start.scale.z),
      },
    });
    onRender();
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
    this.target = null;
    this.targetId = null;
    this.targetType = null;
  }
}