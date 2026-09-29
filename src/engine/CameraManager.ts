import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { CameraPresetMode } from "@/store/cameraSlice";
import type { Room } from "@/types/project";
import { toSceneLength } from "./coordinates";

export function clampCameraBeta(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampCameraRadius(value: number, min = 0.5, max = 25): number {
  return Math.min(max, Math.max(min, value));
}

export function computeOrbitDelta(
  alpha: number,
  beta: number,
  dx: number,
  dy: number,
  alphaScale = 0.005,
  betaScale = 0.003
): { alpha: number; beta: number } {
  return {
    alpha: alpha + dx * alphaScale,
    beta: clampCameraBeta(beta - dy * betaScale, 0.1, Math.PI - 0.1),
  };
}

export function getCameraPreset(mode: CameraPresetMode): {
  alpha: number;
  beta: number;
  radius: number;
} {
  switch (mode) {
    case "perspective":
      return { alpha: -Math.PI / 3, beta: Math.PI / 2.8, radius: 7.2 };
    case "inside":
      return { alpha: 0, beta: Math.PI / 2.5, radius: 5.4 };
    case "top":
      return { alpha: -Math.PI / 2, beta: 0.02, radius: 8.5 };
    case "front":
      return { alpha: -Math.PI / 2, beta: Math.PI / 2, radius: 7.2 };
    case "left":
      return { alpha: 0, beta: Math.PI / 2, radius: 7.2 };
    case "right":
      return { alpha: Math.PI, beta: Math.PI / 2, radius: 7.2 };
    case "isometric":
      return { alpha: -Math.PI / 4, beta: Math.atan(Math.SQRT2), radius: 7.5 };
    default:
      return { alpha: -Math.PI / 3, beta: Math.PI / 2.8, radius: 7.2 };
  }
}

export class CameraManager {
  public camera: ArcRotateCamera;
  private scene: Scene;
  private pointerState: { active: boolean; x: number; y: number; button: number } = {
    active: false,
    x: 0,
    y: 0,
    button: -1,
  };
  private pointerControlsEnabled = true;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;

    // Start in perspective view overlooking the center of a typical room
    // Alpha: angle around Y axis
    // Beta: angle from vertical (+Y)
    // Radius: distance from target
    this.camera = new ArcRotateCamera(
      "MainCamera",
      -Math.PI / 2, // look inward from the room side by default
      Math.PI / 2.8,
      5.5,
      new Vector3(1.8, 1.0, 1.5),
      this.scene
    );

    this.camera.minZ = 0.05; // 50 mm near clip
    this.camera.maxZ = 100;  // 100 meters far clip
    this.camera.wheelPrecision = 25; // Smooth zooming
    this.camera.pinchPrecision = 25;
    this.camera.lowerRadiusLimit = 0.5; // 500 mm
    this.camera.upperRadiusLimit = 25;  // 25 meters
    this.camera.angularSensibilityX = 250;
    this.camera.angularSensibilityY = 250;
    this.camera.inertia = 0.85;
    this.camera.panningSensibility = 900;

    this.camera.detachControl();
    this.bindPointerControls(canvas);
  }

  private bindPointerControls(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("pointerdown", (event) => {
      if (!this.pointerControlsEnabled) return;
      if (event.shiftKey && event.button === 0) return;
      if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;

      this.pointerState.active = true;
      this.pointerState.x = event.clientX;
      this.pointerState.y = event.clientY;
      this.pointerState.button = event.button;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!this.pointerControlsEnabled || !this.pointerState.active) return;

      const dx = event.clientX - this.pointerState.x;
      const dy = event.clientY - this.pointerState.y;
      this.pointerState.x = event.clientX;
      this.pointerState.y = event.clientY;

      if (this.pointerState.button === 0) {
        const next = computeOrbitDelta(this.camera.alpha, this.camera.beta, dx, dy);
        this.camera.alpha = next.alpha;
        this.camera.beta = next.beta;
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      if (this.pointerState.active && event.pointerId !== undefined) {
        canvas.releasePointerCapture(event.pointerId);
      }
      this.pointerState.active = false;
      this.pointerState.button = -1;
    });

    canvas.addEventListener("pointerleave", () => {
      this.pointerState.active = false;
      this.pointerState.button = -1;
    });

    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const delta = event.deltaY * 0.0025;
        this.camera.radius = clampCameraRadius(this.camera.radius + delta);
      },
      { passive: false }
    );
  }

  public setPointerControlsEnabled(enabled: boolean): void {
    this.pointerControlsEnabled = enabled;
    if (!enabled) {
      this.pointerState.active = false;
      this.pointerState.button = -1;
    }
  }

  public setMode(mode: CameraPresetMode): void {
    const target = new Vector3(1.8, 0.9, 1.5);
    const preset = getCameraPreset(mode);

    this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
    this.camera.alpha = preset.alpha;
    this.camera.beta = preset.beta;
    this.camera.radius = preset.radius;

    this.camera.setTarget(target);
  }

  public fitToRoom(room: Room): void {
    const centerX = toSceneLength(room.length / 2);
    const centerY = toSceneLength(room.height / 3);
    const centerZ = toSceneLength(room.width / 2);
    const target = new Vector3(centerX, centerY, centerZ);

    const maxDimScene = Math.max(
      toSceneLength(room.length),
      toSceneLength(room.width),
      toSceneLength(room.height)
    );

    // Keep the view focused on the interior working area instead of framing the entire shell.
    this.camera.setTarget(target);
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = Math.PI / 2.8;
    this.camera.radius = Math.max(3.2, Math.min(6.5, maxDimScene * 0.9));
  }

  public dispose(): void {
    this.camera.dispose();
  }
}
