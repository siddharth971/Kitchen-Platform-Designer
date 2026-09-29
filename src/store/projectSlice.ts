import type { StateCreator } from "zustand";
import type { Project, Room, Wall, WallOpening, Customer } from "@/types/project";
import type {
  CountertopPlatform,
  Cutout,
  SinkInstance,
  HobInstance,
  Cabinet,
  ApplianceInstance,
  UtilityPoint,
} from "@/types/kitchen";
import type { MeasurementItem } from "@/core/geometry/measurement";
import { DEFAULT_ROOM_PRESET, DEFAULT_PRICING_CONFIG, PLATFORM_DEFAULTS } from "@/data/presets";
import { generateRoomWalls } from "@/core/geometry/wall";

export interface ProjectSlice {
  project: Project;
  setProject: (project: Project) => void;
  updateRoom: (patch: Partial<Room>) => void;
  updateWall: (wallId: string, patch: Partial<Wall>) => void;
  addWallOpening: (wallId: string, opening: WallOpening) => void;
  updateWallOpening: (wallId: string, openingId: string, patch: Partial<WallOpening>) => void;
  removeWallOpening: (wallId: string, openingId: string) => void;
  addPlatform: (platform: CountertopPlatform) => void;
  updatePlatform: (platformId: string, patch: Partial<CountertopPlatform>) => void;
  removePlatform: (platformId: string) => void;
  addCutout: (platformId: string, cutout: Cutout) => void;
  updateCutout: (platformId: string, cutoutId: string, patch: Partial<Cutout>) => void;
  removeCutout: (platformId: string, cutoutId: string) => void;
  addSink: (sink: SinkInstance) => void;
  updateSink: (sinkId: string, patch: Partial<SinkInstance>) => void;
  removeSink: (sinkId: string) => void;
  addHob: (hob: HobInstance) => void;
  updateHob: (hobId: string, patch: Partial<HobInstance>) => void;
  removeHob: (hobId: string) => void;
  addCabinet: (cabinet: Cabinet) => void;
  updateCabinet: (cabinetId: string, patch: Partial<Cabinet>) => void;
  removeCabinet: (cabinetId: string) => void;
  addAppliance: (appliance: ApplianceInstance) => void;
  updateAppliance: (applianceId: string, patch: Partial<ApplianceInstance>) => void;
  removeAppliance: (applianceId: string) => void;
  addUtilityPoint: (point: UtilityPoint) => void;
  updateUtilityPoint: (pointId: string, patch: Partial<UtilityPoint>) => void;
  removeUtilityPoint: (pointId: string) => void;
  addMeasurement: (measurement: MeasurementItem) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  updateCustomer: (patch: Partial<Customer>) => void;
  updateProjectName: (name: string) => void;
  resetProject: (name?: string, customerName?: string) => void;
}

export function createInitialProject(name: string = "Patel Residence Kitchen", customerName?: string): Project {
  const room = { ...DEFAULT_ROOM_PRESET };
  const walls = generateRoomWalls(room);

  const initialPlatform: CountertopPlatform = {
    id: "plat-main",
    name: "Main Countertop",
    shape: "straight",
    position: { x: room.wallThickness, z: room.wallThickness },
    length: 2400,
    depth: PLATFORM_DEFAULTS.depthMm,
    lengthA: 2400,
    depthA: PLATFORM_DEFAULTS.depthMm,
    lengthB: 1800,
    depthB: PLATFORM_DEFAULTS.depthMm,
    workingHeight: PLATFORM_DEFAULTS.workingHeightMm,
    slabThickness: PLATFORM_DEFAULTS.slabThicknessMm,
    materialId: "granite-black-galaxy",
    edgeProfileId: "square",
    cornerStyle: "square",
    overhang: {
      front: PLATFORM_DEFAULTS.overhangFrontMm,
      side: PLATFORM_DEFAULTS.overhangSideMm,
      back: PLATFORM_DEFAULTS.overhangBackMm,
    },
    backsplash: {
      enabled: true,
      height: PLATFORM_DEFAULTS.backsplashHeightMm,
      thickness: PLATFORM_DEFAULTS.slabThicknessMm,
    },
    cutouts: [],
  };

  return {
    schemaVersion: 1,
    id: "proj-" + Date.now(),
    name,
    customer: customerName ? { name: customerName, location: "Ahmedabad" } : { name: "Rahul Patel", location: "Ahmedabad" },
    units: "metric",
    displayUnit: "mm",
    currency: "INR",
    locale: "en-IN",
    kitchenType: "straight",
    room,
    walls,
    platforms: [initialPlatform],
    cabinets: [],
    appliances: [],
    sinks: [],
    hobs: [],
    utilityPoints: [],
    groups: [],
    materials: [],
    measurements: [],
    pricing: DEFAULT_PRICING_CONFIG,
    settings: {
      snapStep: 10,
      snapEnabled: true,
      gridVisible: true,
      gridSize: 100,
      showDimensions: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function withTimestamp<T extends { project: Project }>(state: T): { project: Project } {
  return {
    project: { ...state.project, updatedAt: new Date().toISOString() },
  };
}

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (set) => ({
  project: createInitialProject(),

  setProject: (project) =>
    set({ project: { ...project, updatedAt: new Date().toISOString() } }),

  updateRoom: (patch) =>
    set((state) => {
      const updatedRoom: Room = { ...state.project.room, ...patch };
      let updatedWalls = state.project.walls;

      if (
        (patch.length !== undefined && patch.length !== state.project.room.length) ||
        (patch.width !== undefined && patch.width !== state.project.room.width) ||
        (patch.height !== undefined && patch.height !== state.project.room.height) ||
        (patch.wallThickness !== undefined && patch.wallThickness !== state.project.room.wallThickness)
      ) {
        const standardWallIds = new Set(["wall-front", "wall-right", "wall-back", "wall-left"]);
        const existingOpeningsMap = new Map<string, WallOpening[]>();
        for (const w of state.project.walls) {
          if (standardWallIds.has(w.id)) {
            existingOpeningsMap.set(w.id, w.openings);
          }
        }
        const freshWalls = generateRoomWalls(updatedRoom);
        updatedWalls = freshWalls.map((fw) => ({
          ...fw,
          openings: existingOpeningsMap.get(fw.id) ?? [],
        }));
      }

      return {
        project: { ...state.project, room: updatedRoom, walls: updatedWalls, updatedAt: new Date().toISOString() },
      };
    }),

  updateWall: (wallId, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        walls: state.project.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)),
        updatedAt: new Date().toISOString(),
      },
    })),

  addWallOpening: (wallId, opening) =>
    set((state) => ({
      project: {
        ...state.project,
        walls: state.project.walls.map((w) =>
          w.id !== wallId ? w : { ...w, openings: [...w.openings, opening] }
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  updateWallOpening: (wallId, openingId, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        walls: state.project.walls.map((w) =>
          w.id !== wallId
            ? w
            : { ...w, openings: w.openings.map((op) => (op.id === openingId ? { ...op, ...patch } : op)) }
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  removeWallOpening: (wallId, openingId) =>
    set((state) => ({
      project: {
        ...state.project,
        walls: state.project.walls.map((w) =>
          w.id !== wallId ? w : { ...w, openings: w.openings.filter((op) => op.id !== openingId) }
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  addPlatform: (platform) =>
    set((state) => ({
      project: { ...state.project, platforms: [...state.project.platforms, platform], updatedAt: new Date().toISOString() },
    })),

  updatePlatform: (platformId, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        platforms: state.project.platforms.map((p) => (p.id === platformId ? { ...p, ...patch } : p)),
        updatedAt: new Date().toISOString(),
      },
    })),

  removePlatform: (platformId) =>
    set((state) => ({
      project: {
        ...state.project,
        platforms: state.project.platforms.filter((p) => p.id !== platformId),
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Cutout Actions ──
  addCutout: (platformId, cutout) =>
    set((state) => ({
      project: {
        ...state.project,
        platforms: state.project.platforms.map((p) =>
          p.id === platformId ? { ...p, cutouts: [...p.cutouts, cutout] } : p
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  updateCutout: (platformId, cutoutId, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        platforms: state.project.platforms.map((p) =>
          p.id === platformId
            ? { ...p, cutouts: p.cutouts.map((c: Cutout) => (c.id === cutoutId ? { ...c, ...patch } : c)) }
            : p
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  removeCutout: (platformId, cutoutId) =>
    set((state) => {
      const platform = state.project.platforms.find((p) => p.id === platformId);
      const cutout = platform?.cutouts.find((c: Cutout) => c.id === cutoutId);
      const sourceId = cutout?.sourceObjectId;
      return {
        project: {
          ...state.project,
          platforms: state.project.platforms.map((p) =>
            p.id === platformId ? { ...p, cutouts: p.cutouts.filter((c: Cutout) => c.id !== cutoutId) } : p
          ),
          sinks: sourceId ? state.project.sinks.filter((s) => s.id !== sourceId) : state.project.sinks,
          hobs: sourceId ? state.project.hobs.filter((h) => h.id !== sourceId) : state.project.hobs,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // ── Sink Actions ──
  addSink: (sink) =>
    set((state) => withTimestamp({ project: { ...state.project, sinks: [...state.project.sinks, sink] } })),

  updateSink: (sinkId, patch) =>
    set((state) => withTimestamp({
      project: { ...state.project, sinks: state.project.sinks.map((s) => (s.id === sinkId ? { ...s, ...patch } : s)) },
    })),

  removeSink: (sinkId) =>
    set((state) => {
      const updatedPlatforms = state.project.platforms.map((p) => ({
        ...p, cutouts: p.cutouts.filter((c: Cutout) => c.sourceObjectId !== sinkId),
      }));
      return withTimestamp({
        project: { ...state.project, sinks: state.project.sinks.filter((s) => s.id !== sinkId), platforms: updatedPlatforms },
      });
    }),

  // ── Hob Actions ──
  addHob: (hob) =>
    set((state) => withTimestamp({ project: { ...state.project, hobs: [...state.project.hobs, hob] } })),

  updateHob: (hobId, patch) =>
    set((state) => withTimestamp({
      project: { ...state.project, hobs: state.project.hobs.map((h) => (h.id === hobId ? { ...h, ...patch } : h)) },
    })),

  removeHob: (hobId) =>
    set((state) => {
      const updatedPlatforms = state.project.platforms.map((p) => ({
        ...p, cutouts: p.cutouts.filter((c: Cutout) => c.sourceObjectId !== hobId),
      }));
      return withTimestamp({
        project: { ...state.project, hobs: state.project.hobs.filter((h) => h.id !== hobId), platforms: updatedPlatforms },
      });
    }),

  // ── Cabinet Actions ──
  addCabinet: (cabinet) =>
    set((state) => withTimestamp({ project: { ...state.project, cabinets: [...state.project.cabinets, cabinet] } })),

  updateCabinet: (cabinetId, patch) =>
    set((state) => withTimestamp({
      project: { ...state.project, cabinets: state.project.cabinets.map((c) => (c.id === cabinetId ? { ...c, ...patch } : c)) },
    })),

  removeCabinet: (cabinetId) =>
    set((state) => withTimestamp({
      project: { ...state.project, cabinets: state.project.cabinets.filter((c) => c.id !== cabinetId) },
    })),

  // ── Appliance Actions ──
  addAppliance: (appliance) =>
    set((state) => withTimestamp({ project: { ...state.project, appliances: [...state.project.appliances, appliance] } })),

  updateAppliance: (applianceId, patch) =>
    set((state) => withTimestamp({
      project: { ...state.project, appliances: state.project.appliances.map((a) => (a.id === applianceId ? { ...a, ...patch } : a)) },
    })),

  removeAppliance: (applianceId) =>
    set((state) => withTimestamp({
      project: { ...state.project, appliances: state.project.appliances.filter((a) => a.id !== applianceId) },
    })),

  // ── Utility Point Actions ──
  addUtilityPoint: (point) =>
    set((state) => withTimestamp({ project: { ...state.project, utilityPoints: [...state.project.utilityPoints, point] } })),

  updateUtilityPoint: (pointId, patch) =>
    set((state) => withTimestamp({
      project: { ...state.project, utilityPoints: state.project.utilityPoints.map((p) => (p.id === pointId ? { ...p, ...patch } : p)) },
    })),

  removeUtilityPoint: (pointId) =>
    set((state) => withTimestamp({
      project: { ...state.project, utilityPoints: state.project.utilityPoints.filter((p) => p.id !== pointId) },
    })),

  // ── Measurement Actions ──
  addMeasurement: (measurement) =>
    set((state) => withTimestamp({
      project: {
        ...state.project,
        measurements: [...(state.project.measurements || []), measurement],
      },
    })),

  removeMeasurement: (id) =>
    set((state) => withTimestamp({
      project: {
        ...state.project,
        measurements: (state.project.measurements || []).filter((m: MeasurementItem) => m.id !== id),
      },
    })),

  clearMeasurements: () =>
    set((state) => withTimestamp({
      project: {
        ...state.project,
        measurements: [],
      },
    })),

  updateCustomer: (patch) =>
    set((state) =>
      withTimestamp({
        project: {
          ...state.project,
          customer: {
            name: state.project.customer?.name || "Client",
            ...state.project.customer,
            ...patch,
          },
        },
      })
    ),

  updateProjectName: (name) =>
    set((state) =>
      withTimestamp({
        project: {
          ...state.project,
          name,
        },
      })
    ),

  resetProject: (name, customerName) =>
    set({ project: createInitialProject(name, customerName) }),
});
