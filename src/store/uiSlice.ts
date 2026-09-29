import type { StateCreator } from "zustand";
import type { DisplayUnit } from "@/types/project";
import type { Point3D } from "@/types/geometry";

export type ActiveTool =
  | "select"
  | "room"
  | "wall"
  | "platform"
  | "cabinet"
  | "appliance"
  | "measure";

export interface UiSlice {
  displayUnit: DisplayUnit;
  activeTool: ActiveTool;
  viewMode: "3d" | "2d";
  gridVisible: boolean;
  snapEnabled: boolean;
  snapStep: number; // in mm (e.g. 10)
  sampleBannerDismissed: boolean;
  showDimensions: boolean;
  showWallLabels: boolean;
  ceilingVisible: boolean;
  catalogOpen: boolean;
  catalogTab: "sinks" | "hobs" | "cabinets" | "appliances" | "utilities";
  validationDrawerOpen: boolean;
  activeMeasurementStart: Point3D | null;
  estimationOpen: boolean;

  setDisplayUnit: (unit: DisplayUnit) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setViewMode: (mode: "3d" | "2d") => void;
  setGridVisible: (visible: boolean) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapStep: (step: number) => void;
  dismissSampleBanner: () => void;
  setShowDimensions: (show: boolean) => void;
  setShowWallLabels: (show: boolean) => void;
  setCeilingVisible: (visible: boolean) => void;
  openCatalog: (tab?: "sinks" | "hobs" | "cabinets" | "appliances" | "utilities") => void;
  closeCatalog: () => void;
  setValidationDrawerOpen: (open: boolean) => void;
  setActiveMeasurementStart: (point: Point3D | null) => void;
  setEstimationOpen: (open: boolean) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  displayUnit: "mm",
  activeTool: "select",
  viewMode: "3d",
  gridVisible: true,
  snapEnabled: true,
  snapStep: 10,
  sampleBannerDismissed: false,
  showDimensions: true,
  showWallLabels: true,
  ceilingVisible: false,
  catalogOpen: false,
  catalogTab: "sinks",
  validationDrawerOpen: false,
  activeMeasurementStart: null,
  estimationOpen: false,

  setDisplayUnit: (displayUnit) => set({ displayUnit }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setViewMode: (viewMode) => set({ viewMode }),
  setGridVisible: (gridVisible) => set({ gridVisible }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSnapStep: (snapStep) => set({ snapStep }),
  dismissSampleBanner: () => set({ sampleBannerDismissed: true }),
  setShowDimensions: (showDimensions) => set({ showDimensions }),
  setShowWallLabels: (showWallLabels) => set({ showWallLabels }),
  setCeilingVisible: (ceilingVisible) => set({ ceilingVisible }),
  openCatalog: (tab = "sinks") => set({ catalogOpen: true, catalogTab: tab }),
  closeCatalog: () => set({ catalogOpen: false }),
  setValidationDrawerOpen: (validationDrawerOpen) => set({ validationDrawerOpen }),
  setActiveMeasurementStart: (activeMeasurementStart) => set({ activeMeasurementStart }),
  setEstimationOpen: (estimationOpen) => set({ estimationOpen }),
});
