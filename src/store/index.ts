import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import { createSelectionSlice, type SelectionSlice } from "./selectionSlice";
import { createCameraSlice, type CameraSlice } from "./cameraSlice";
import { createUiSlice, type UiSlice } from "./uiSlice";
import { createHistorySlice, type HistorySlice } from "./historySlice";
import { createPricingSlice, type PricingSlice } from "./pricingSlice";
import { createBusinessSlice, type BusinessSlice } from "./businessSlice";

export type AppStore = ProjectSlice &
  SelectionSlice &
  CameraSlice &
  UiSlice &
  HistorySlice &
  PricingSlice &
  BusinessSlice;

type PersistedAppStore = Pick<AppStore, "project">;

export const PROJECT_STORAGE_KEY = "kpd-project";

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const projectStorage = createJSONStorage<PersistedAppStore>(() => {
  if (typeof window === "undefined") return serverStorage;

  try {
    return window.localStorage;
  } catch {
    return serverStorage;
  }
});

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createProjectSlice(...a),
      ...createSelectionSlice(...a),
      ...createCameraSlice(...a),
      ...createUiSlice(...a),
      ...createHistorySlice(...a),
      ...createPricingSlice(...a),
      ...createBusinessSlice(...a),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      storage: projectStorage,
      partialize: (state): PersistedAppStore => ({ project: state.project }),
      skipHydration: true,
      version: 1,
    }
  )
);
