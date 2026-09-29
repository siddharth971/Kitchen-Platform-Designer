import { create } from "zustand";
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import { createSelectionSlice, type SelectionSlice } from "./selectionSlice";
import { createCameraSlice, type CameraSlice } from "./cameraSlice";
import { createUiSlice, type UiSlice } from "./uiSlice";
import { createHistorySlice, type HistorySlice } from "./historySlice";

export type AppStore = ProjectSlice & SelectionSlice & CameraSlice & UiSlice & HistorySlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createSelectionSlice(...a),
  ...createCameraSlice(...a),
  ...createUiSlice(...a),
  ...createHistorySlice(...a),
}));
