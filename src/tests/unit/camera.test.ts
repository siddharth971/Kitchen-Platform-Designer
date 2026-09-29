import { describe, expect, it } from "vitest";
import { createStore } from "zustand";
import { createCameraSlice } from "@/store/cameraSlice";
import { clampCameraBeta, computeOrbitDelta, getCameraPreset } from "@/engine/CameraManager";
import { getWallContextActions } from "@/engine/SelectionManager";

describe("camera orbit smoothing", () => {
  it("keeps the vertical orbit angle within safe bounds", () => {
    expect(clampCameraBeta(-1, 0.1, Math.PI - 0.1)).toBeCloseTo(0.1, 6);
    expect(clampCameraBeta(Math.PI * 1.5, 0.1, Math.PI - 0.1)).toBeCloseTo(Math.PI - 0.1, 6);
  });

  it("applies the reversed horizontal drag direction requested by the user", () => {
    const orbit = computeOrbitDelta(-Math.PI / 2, Math.PI / 2.4, 10, -6);
    expect(orbit.alpha).toBeCloseTo(-Math.PI / 2 + 10 * 0.005, 6);
    expect(orbit.beta).toBeCloseTo(Math.PI / 2.4 + 6 * 0.003, 6);
  });

  it("uses an inside-view preset by default", () => {
    const store = createStore(createCameraSlice);

    expect(store.getState().cameraMode).toBe("inside");
  });

  it("keeps the perspective and inside presets framed for the kitchen interior", () => {
    expect(getCameraPreset("perspective")).toMatchObject({
      alpha: -Math.PI / 3,
      beta: Math.PI / 2.8,
      radius: 7.2,
    });

    expect(getCameraPreset("inside")).toMatchObject({
      alpha: 0,
      beta: Math.PI / 2.5,
      radius: 5.4,
    });
  });

  it("exposes wall right-click actions", () => {
    expect(getWallContextActions()).toEqual([
      "Inspect wall",
      "Add opening",
      "Deselect",
    ]);
  });
});
