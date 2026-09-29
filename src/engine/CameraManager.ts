import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { CameraPresetMode } from "@/store/cameraSlice";
import type { Room } from "@/types/project";
import { toSceneLength } from "./coordinates";

export class CameraManager {
  public camera: ArcRotateCamera;
  private scene: Scene;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;

    // Start in perspective view overlooking the center of a typical room
    // Alpha: angle around Y axis
    // Beta: angle from vertical (+Y)
    // Radius: distance from target
    this.camera = new ArcRotateCamera(
      "MainCamera",
      -Math.PI / 4, // 45 degrees
      Math.PI / 3,  // 60 degrees from top
      5.5,          // 5.5 scene units (~5.5 meters)
      new Vector3(1.8, 1.0, 1.5), // center of 3.6m x 3.0m x 3.0m room
      this.scene
    );

    this.camera.minZ = 0.05; // 50 mm near clip
    this.camera.maxZ = 100;  // 100 meters far clip
    this.camera.wheelPrecision = 20; // Smooth zooming
    this.camera.pinchPrecision = 20;
    this.camera.lowerRadiusLimit = 0.5; // 500 mm
    this.camera.upperRadiusLimit = 25;  // 25 meters
    this.camera.angularSensibilityX = 1000;
    this.camera.angularSensibilityY = 1000;

    // Attach control with CAD/standard controls:
    // Right click = orbit, Middle click = pan, Wheel = zoom
    this.camera.attachControl(canvas, true);
    // Customise button mappings:
    // Babylon default: 0=rotate, 1=pan, 2=zoom.
    // Configure button 0 (left) for selection in InputManager, button 2 (right) for orbit, button 1 (middle) for pan.
    const pointers = this.camera.inputs.attached.pointers;
    if (pointers && "buttons" in pointers) {
      (pointers as unknown as { buttons: number[] }).buttons = [2, 1];
    }
  }

  public setMode(mode: CameraPresetMode): void {
    const target = this.camera.target.clone();

    switch (mode) {
      case "perspective":
        this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
        this.camera.alpha = -Math.PI / 4;
        this.camera.beta = Math.PI / 3;
        break;

      case "top":
        this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
        this.camera.alpha = -Math.PI / 2; // Looking along +Z
        this.camera.beta = 0.001;          // Directly from above
        break;

      case "front":
        this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
        this.camera.alpha = -Math.PI / 2; // Facing north (looking towards positive Z)
        this.camera.beta = Math.PI / 2;  // Level with horizon
        break;

      case "left":
        this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
        this.camera.alpha = 0;           // Facing east (looking towards positive X)
        this.camera.beta = Math.PI / 2;
        break;

      case "right":
        this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
        this.camera.alpha = Math.PI;     // Facing west (looking towards negative X)
        this.camera.beta = Math.PI / 2;
        break;

      case "isometric":
        this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
        this.camera.alpha = -Math.PI / 4;
        this.camera.beta = Math.atan(Math.SQRT2); // 54.74 degrees isometric angle
        break;
    }

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

    // Set target and radius so the entire room is well within FOV
    this.camera.setTarget(target);
    this.camera.radius = Math.max(3.5, maxDimScene * 1.6);
  }

  public dispose(): void {
    this.camera.dispose();
  }
}
