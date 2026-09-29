import "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import type { PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Nullable } from "@babylonjs/core/types";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { fromScene } from "./coordinates";
import type { SelectableObjectType, SelectedObjectRef } from "@/store/selectionSlice";

export interface SelectionRectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SelectionCallback {
  (id: string | null, type: SelectableObjectType | null, subId?: string | null, additive?: boolean): void;
}

export interface MultiSelectionCallback {
  (objects: SelectedObjectRef[]): void;
}

export interface SelectionRectangleCallback {
  (rectangle: SelectionRectangle | null): void;
}

export interface CursorPositionCallback {
  (posMm: { x: number; y: number; z: number }): void;
}

export function getWallContextActions(): string[] {
  return ["Inspect wall", "Add opening", "Deselect"];
}

export class SelectionManager {
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private pointerDownPos: { x: number; y: number } | null = null;
  private onSelect: SelectionCallback;
  private onCursorMove?: CursorPositionCallback;
  private onSelectMany?: MultiSelectionCallback;
  private onSelectionRectangle?: SelectionRectangleCallback;
  private pointerObserver: Nullable<Observer<PointerInfo>> = null;
  private marqueeStart: { x: number; y: number } | null = null;
  private marqueeMoved = false;

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    onSelect: SelectionCallback,
    onCursorMove?: CursorPositionCallback,
    onSelectMany?: MultiSelectionCallback,
    onSelectionRectangle?: SelectionRectangleCallback
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.onCursorMove = onCursorMove;
    this.onSelectMany = onSelectMany;
    this.onSelectionRectangle = onSelectionRectangle;

    this.setupPointerEvents();
  }

  private setupPointerEvents(): void {
    this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          const evt = pointerInfo.event as PointerEvent;
          if (evt.button === 0) {
            if (evt.shiftKey) {
              const bounds = this.canvas.getBoundingClientRect();
              this.marqueeStart = { x: evt.clientX - bounds.left, y: evt.clientY - bounds.top };
              this.marqueeMoved = false;
              this.pointerDownPos = null;
            } else {
              this.pointerDownPos = { x: evt.clientX, y: evt.clientY };
            }
          }

          if (evt.button === 2) {
            evt.preventDefault();
            this.performPick();
          }
          break;
        }

        case PointerEventTypes.POINTERUP: {
          const evt = pointerInfo.event as PointerEvent;
          if (evt.button === 0 && this.marqueeStart) {
            const bounds = this.canvas.getBoundingClientRect();
            const end = { x: evt.clientX - bounds.left, y: evt.clientY - bounds.top };
            if (this.marqueeMoved) this.performMarqueePick(this.marqueeStart, end);
            this.marqueeStart = null;
            this.marqueeMoved = false;
            this.onSelectionRectangle?.(null);
            break;
          }
          if (evt.button === 0 && this.pointerDownPos) {
            const dx = Math.abs(evt.clientX - this.pointerDownPos.x);
            const dy = Math.abs(evt.clientY - this.pointerDownPos.y);

            // If pointer didn't move significantly (< 5px), treat as a click selection
            if (dx < 5 && dy < 5) {
              this.performPick(evt.ctrlKey || evt.metaKey);
            }
            this.pointerDownPos = null;
          }
          break;
        }

        case PointerEventTypes.POINTERMOVE: {
          if (this.marqueeStart) {
            const evt = pointerInfo.event as PointerEvent;
            const bounds = this.canvas.getBoundingClientRect();
            const end = { x: evt.clientX - bounds.left, y: evt.clientY - bounds.top };
            const left = Math.min(this.marqueeStart.x, end.x);
            const top = Math.min(this.marqueeStart.y, end.y);
            const width = Math.abs(end.x - this.marqueeStart.x);
            const height = Math.abs(end.y - this.marqueeStart.y);
            this.marqueeMoved = width > 5 || height > 5;
            if (this.marqueeMoved) this.onSelectionRectangle?.({ left, top, width, height });
          }
          if (this.onCursorMove) {
            const pickResult = this.scene.pick(
              this.scene.pointerX,
              this.scene.pointerY,
              (mesh) =>
                mesh.name === "roomFloor" ||
                mesh.name.startsWith("mesh-") ||
                mesh.name.startsWith("slab-")
            );

            if (pickResult && pickResult.hit && pickResult.pickedPoint) {
              const posMm = fromScene(pickResult.pickedPoint);
              this.onCursorMove(posMm);
            }
          }
          break;
        }
      }
    });
  }

  private performPick(additive = false): void {
    const pickResult = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (mesh) => mesh.isPickable && mesh.metadata
    );

    if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.metadata) {
      const meta = pickResult.pickedMesh.metadata;
      this.onSelect(
        meta.objectId,
        meta.type === "opening" ? "wall" : meta.type,
        meta.subId,
        additive
      );
    } else {
      // Picked empty ground or sky -> deselect
      this.onSelect(null, null);
    }
  }

  private performMarqueePick(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const camera = this.scene.activeCamera;
    if (!camera || !this.onSelectMany) return;

    const engine = this.scene.getEngine();
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = bounds.width / engine.getRenderWidth();
    const scaleY = bounds.height / engine.getRenderHeight();
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    const selected = new Map<string, SelectedObjectRef>();

    for (const mesh of this.scene.meshes) {
      const metadata = mesh.metadata as { objectId?: string; subId?: string; type?: string } | null;
      if (!mesh.isPickable || !metadata?.objectId || !metadata.type || metadata.type === "room") continue;
      if (!["wall", "opening", "platform", "cabinet", "appliance", "sink", "hob", "utility"].includes(metadata.type)) continue;

      mesh.computeWorldMatrix(true);
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const projected = Vector3.Project(center, Matrix.Identity(), this.scene.getTransformMatrix(), viewport);
      const localX = projected.x * scaleX;
      const localY = projected.y * scaleY;
      if (localX < left || localX > right || localY < top || localY > bottom) continue;

      const objectType = metadata.type as SelectableObjectType;
      selected.set(metadata.objectId, {
        id: metadata.objectId,
        type: objectType === "opening" ? "wall" : objectType,
        subId: metadata.subId,
      });
    }

    this.onSelectMany([...selected.values()]);
  }

  public dispose(): void {
    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
  }
}
