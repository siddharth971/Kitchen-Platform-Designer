import "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import type { PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Nullable } from "@babylonjs/core/types";
import { fromScene } from "./coordinates";
import type { SelectableObjectType } from "@/store/selectionSlice";

export interface SelectionCallback {
  (id: string | null, type: SelectableObjectType | null, subId?: string | null): void;
}

export interface CursorPositionCallback {
  (posMm: { x: number; y: number; z: number }): void;
}

export class SelectionManager {
  private scene: Scene;
  private pointerDownPos: { x: number; y: number } | null = null;
  private onSelect: SelectionCallback;
  private onCursorMove?: CursorPositionCallback;
  private pointerObserver: Nullable<Observer<PointerInfo>> = null;

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    onSelect: SelectionCallback,
    onCursorMove?: CursorPositionCallback
  ) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.onCursorMove = onCursorMove;

    this.setupPointerEvents();
  }

  private setupPointerEvents(): void {
    this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          const evt = pointerInfo.event as PointerEvent;
          if (evt.button === 0) {
            // Left click down
            this.pointerDownPos = { x: evt.clientX, y: evt.clientY };
          }
          break;
        }

        case PointerEventTypes.POINTERUP: {
          const evt = pointerInfo.event as PointerEvent;
          if (evt.button === 0 && this.pointerDownPos) {
            const dx = Math.abs(evt.clientX - this.pointerDownPos.x);
            const dy = Math.abs(evt.clientY - this.pointerDownPos.y);

            // If pointer didn't move significantly (< 5px), treat as a click selection
            if (dx < 5 && dy < 5) {
              this.performPick();
            }
            this.pointerDownPos = null;
          }
          break;
        }

        case PointerEventTypes.POINTERMOVE: {
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

  private performPick(): void {
    const pickResult = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (mesh) => mesh.isPickable && mesh.metadata
    );

    if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.metadata) {
      const meta = pickResult.pickedMesh.metadata;
      this.onSelect(meta.objectId, meta.type, meta.subId);
    } else {
      // Picked empty ground or sky -> deselect
      this.onSelect(null, null);
    }
  }

  public dispose(): void {
    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
  }
}
