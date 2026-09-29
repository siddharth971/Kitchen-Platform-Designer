import type { StateCreator } from "zustand";

export type CameraPresetMode =
  | "perspective"
  | "top"
  | "front"
  | "left"
  | "right"
  | "isometric";

export interface CameraSlice {
  cameraMode: CameraPresetMode;
  fitTrigger: number;
  setCameraMode: (mode: CameraPresetMode) => void;
  triggerFit: () => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [], [], CameraSlice> = (set) => ({
  cameraMode: "perspective",
  fitTrigger: 0,

  setCameraMode: (cameraMode) => set({ cameraMode }),
  triggerFit: () => set((state) => ({ fitTrigger: state.fitTrigger + 1 })),
});
