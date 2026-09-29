"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { BabylonEngine } from "@/engine/BabylonEngine";
import type { SelectableObjectType } from "@/store/selectionSlice";
import { Camera, Crosshair, Grid3X3, Magnet, Move3D, Rotate3D, Scaling } from "lucide-react";
import {
  computeMeasurement,
  findNearestSnapPoint,
  extractProjectSnapPoints,
} from "@/core/geometry/measurement";
import type { Point3D } from "@/types/geometry";
import { generateId } from "@/lib/id";
import { applyTransformCommit } from "@/core/geometry/transform";
import type { TransformGizmoCommit } from "@/engine/TransformGizmoController";
import type { SelectionRectangle } from "@/engine/SelectionManager";
import type { SelectedObjectRef } from "@/store/selectionSlice";

interface Viewport3DProps {
  onCursorMove?: (posMm: { x: number; y: number; z: number }) => void;
}

export function Viewport3D({ onCursorMove }: Viewport3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BabylonEngine | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectionRectangle, setSelectionRectangle] = useState<SelectionRectangle | null>(null);
  const [hiddenWalls, setHiddenWalls] = useState<Record<string, boolean>>({});

  const project = useAppStore((state) => state.project);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedType = useAppStore((state) => state.selectedType);
  const selectedObjects = useAppStore((state) => state.selectedObjects);
  const selectObject = useAppStore((state) => state.selectObject);
  const toggleSelectedObject = useAppStore((state) => state.toggleSelectedObject);
  const setSelectedObjects = useAppStore((state) => state.setSelectedObjects);
  const gridVisible = useAppStore((state) => state.gridVisible);
  const viewMode = useAppStore((state) => state.viewMode);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const fitTrigger = useAppStore((state) => state.fitTrigger);
  const activeTool = useAppStore((state) => state.activeTool);
  const activeMeasurementStart = useAppStore((state) => state.activeMeasurementStart);
  const setActiveMeasurementStart = useAppStore((state) => state.setActiveMeasurementStart);
  const addMeasurement = useAppStore((state) => state.addMeasurement);
  const snapEnabled = useAppStore((state) => state.snapEnabled);
  const setSnapEnabled = useAppStore((state) => state.setSnapEnabled);
  const snapStep = useAppStore((state) => state.snapStep);
  const transformGizmoMode = useAppStore((state) => state.transformGizmoMode);
  const setTransformGizmoMode = useAppStore((state) => state.setTransformGizmoMode);
  const snapToWalls = useAppStore((state) => state.snapToWalls);
  const setSnapToWalls = useAppStore((state) => state.setSnapToWalls);
  const snapToObjects = useAppStore((state) => state.snapToObjects);
  const setSnapToObjects = useAppStore((state) => state.setSnapToObjects);
  const snapToCorners = useAppStore((state) => state.snapToCorners);
  const setSnapToCorners = useAppStore((state) => state.setSnapToCorners);

  const [isReady, setIsReady] = useState(false);
  // Local measure-mode state for hover tracking
  const measureStartRef = useRef<Point3D | null>(null);
  const [hoverSnap, setHoverSnap] = useState<Point3D | null>(null);

  // Selection callback from 3D raycast
  const handleSelect = useCallback(
    (id: string | null, type: SelectableObjectType | null, subId?: string | null, additive = false) => {
      if (additive && id && type) {
        toggleSelectedObject({ id, type, subId });
      } else {
        selectObject(id, type, subId);
      }
    },
    [selectObject, toggleSelectedObject]
  );

  const handleSelectMany = useCallback((objects: SelectedObjectRef[]) => {
    setSelectedObjects(objects);
  }, [setSelectedObjects]);

  const handleTransformCommit = useCallback((changes: TransformGizmoCommit[]) => {
    const store = useAppStore.getState();
    const nextProject = changes.reduce((current, change) => applyTransformCommit(current, change), store.project);
    if (nextProject === store.project) return;
    store.pushHistory(store.project);
    store.setProject(nextProject);
  }, []);

  // Handle cursor move — when in measure mode, snap and update preview
  const handleCursorMove = useCallback(
    (posMm: { x: number; y: number; z: number }) => {
      onCursorMove?.(posMm);

      if (activeTool === "measure" && engineRef.current) {
        const cursor: Point3D = { x: posMm.x, y: posMm.y, z: posMm.z };
        const snapPoints = snapEnabled
          ? extractProjectSnapPoints(project.room, project.walls, project.platforms)
          : [];
        const snapResult = findNearestSnapPoint(cursor, snapPoints, 100);
        const finalPoint = snapResult.point;
        const snappedPoint = snapResult.snapped ? snapResult.point : null;

        setHoverSnap(finalPoint);
        engineRef.current.updateMeasurementPreview(
          measureStartRef.current,
          finalPoint,
          snappedPoint
        );
      }
    },
    [activeTool, snapEnabled, project, onCursorMove]
  );

  // Initialize Babylon Engine once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BabylonEngine(
      canvas,
      handleSelect,
      handleCursorMove,
      handleTransformCommit,
      handleSelectMany,
      setSelectionRectangle
    );
    engineRef.current = engine;
    setIsReady(true);

    // Initial scene setup & framing
    engine.updateProjectScene(
      project.room, project.walls, project.platforms,
      project.sinks, project.hobs, project.cabinets, project.appliances, project.utilityPoints,
      project.measurements ?? [], selectedId, gridVisible
    );
    engine.fitToRoom(project.room);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleTransformCommit, handleSelectMany, handleSelect]);

  // Sync the handleCursorMove callback reference into Babylon SelectionManager dynamically
  // by recreating the engine when activeTool changes is expensive; instead we track in ref
  useEffect(() => {
    measureStartRef.current = activeMeasurementStart;
  }, [activeMeasurementStart]);

  // Sync Room, Walls, Platforms, Selection, and Grid to 3D scene
  useEffect(() => {
    if (!engineRef.current || !isReady) return;
    engineRef.current.updateProjectScene(
      project.room,
      project.walls,
      project.platforms,
      project.sinks,
      project.hobs,
      project.cabinets,
      project.appliances,
      project.utilityPoints,
      project.measurements ?? [],
      selectedId,
      gridVisible
    );
    const targetEnabled = activeTool === "select" && viewMode === "3d";
    if (selectedType === "multi" || selectedType === "group") {
      engineRef.current.setTransformTargets(selectedObjects, targetEnabled);
    } else {
      engineRef.current.setTransformTarget(selectedId, selectedType, targetEnabled);
    }
  }, [
    project.room, project.walls, project.platforms,
    project.sinks, project.hobs, project.cabinets, project.appliances, project.utilityPoints,
    project.measurements, selectedId, selectedType, selectedObjects, gridVisible, activeTool, viewMode, isReady,
  ]);

  useEffect(() => {
    if (!engineRef.current || !isReady) return;
    engineRef.current.setTransformMode(transformGizmoMode);
  }, [transformGizmoMode, isReady]);

  useEffect(() => {
    if (!engineRef.current || !isReady) return;
    engineRef.current.setTransformSnapping({
      grid: snapEnabled,
      walls: snapToWalls,
      objects: snapToObjects,
      corners: snapToCorners,
      stepMm: snapStep,
    });
  }, [snapEnabled, snapStep, snapToWalls, snapToObjects, snapToCorners, isReady]);

  // Sync Camera Mode
  useEffect(() => {
    if (!engineRef.current || !isReady) return;
    engineRef.current.setCameraMode(cameraMode);
  }, [cameraMode, isReady]);

  // Sync Fit to Room Trigger
  useEffect(() => {
    if (!engineRef.current || !isReady || fitTrigger === 0) return;
    engineRef.current.fitToRoom(project.room);
  }, [fitTrigger, project.room, isReady]);

  // When switching away from measure tool, clear preview
  useEffect(() => {
    if (!engineRef.current || !isReady) return;
    if (activeTool !== "measure") {
      engineRef.current.clearMeasurementPreview();
    }
  }, [activeTool, isReady]);

  // Handle canvas click for measure tool
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== "measure") return;
      // Only left-click
      if (e.button !== 0) return;

      const currentPoint = hoverSnap;
      if (!currentPoint) return;

      if (!activeMeasurementStart) {
        // First click — set start
        setActiveMeasurementStart(currentPoint);
      } else {
        // Second click — commit measurement
        const m = computeMeasurement(
          generateId("meas"),
          activeMeasurementStart,
          currentPoint
        );
        addMeasurement(m);
        // Reset for next measurement (chain mode: start = end of last)
        setActiveMeasurementStart(null);
        engineRef.current?.clearMeasurementPreview();
      }
    },
    [activeTool, hoverSnap, activeMeasurementStart, setActiveMeasurementStart, addMeasurement]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (selectedType !== "wall" || !selectedId) {
      setContextMenu(null);
      return;
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [selectedId, selectedType]);

  const isWallHidden = selectedId ? hiddenWalls[selectedId] === true : false;

  const hasHiddenWalls = Object.values(hiddenWalls).some(Boolean);
  const selectedObjectLocked =
    selectedType === "multi" || selectedType === "group"
      ? selectedObjects.length > 0 && selectedObjects.every((reference) => {
          if (reference.type === "wall") return project.walls.find((item) => item.id === reference.id)?.locked === true;
          if (reference.type === "platform") return project.platforms.find((item) => item.id === reference.id)?.locked === true;
          if (reference.type === "cabinet") return project.cabinets.find((item) => item.id === reference.id)?.locked === true;
          if (reference.type === "appliance") return project.appliances.find((item) => item.id === reference.id)?.locked === true;
          if (reference.type === "sink") return project.sinks.find((item) => item.id === reference.id)?.locked === true;
          if (reference.type === "hob") return project.hobs.find((item) => item.id === reference.id)?.locked === true;
          if (reference.type === "utility") return project.utilityPoints.find((item) => item.id === reference.id)?.locked === true;
          return false;
        }) :
    selectedType === "room" ? project.room.locked === true :
    selectedType === "wall" ? project.walls.find((item) => item.id === selectedId)?.locked === true :
    selectedType === "utility" ? project.utilityPoints.find((item) => item.id === selectedId)?.locked === true :
    selectedType === "platform" ? project.platforms.find((item) => item.id === selectedId)?.locked === true :
    selectedType === "cabinet" ? project.cabinets.find((item) => item.id === selectedId)?.locked === true :
    selectedType === "appliance" ? project.appliances.find((item) => item.id === selectedId)?.locked === true :
    selectedType === "sink" ? project.sinks.find((item) => item.id === selectedId)?.locked === true :
    selectedType === "hob" ? project.hobs.find((item) => item.id === selectedId)?.locked === true :
    false;

  const handleContextAction = useCallback((action: "inspect" | "opening" | "deselect" | "toggleVisible" | "showAllWalls") => {
    if (!selectedId) return;

    if (action === "deselect") {
      selectObject(null, null);
    } else if (action === "showAllWalls") {
      setHiddenWalls({});
      engineRef.current?.showAllWalls();
    } else if (action === "opening") {
      selectObject(selectedId, "wall");
    } else if (action === "toggleVisible") {
      const nextHidden = !isWallHidden;
      setHiddenWalls((prev) => ({ ...prev, [selectedId]: nextHidden }));
      engineRef.current?.setWallVisible(selectedId, !nextHidden);
    } else {
      selectObject(selectedId, "wall");
    }
    setContextMenu(null);
  }, [isWallHidden, selectObject, selectedId]);

  const cursorClass =
    activeTool === "measure" ? "cursor-crosshair" : "cursor-default";

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-zinc-950 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className={`w-full h-full outline-none block touch-none ${cursorClass}`}
        tabIndex={0}
        onClick={handleCanvasClick}
        onContextMenu={handleContextMenu}
      />

      {selectionRectangle && (
        <div
          aria-hidden="true"
          className="absolute z-10 border border-primary bg-primary/10 pointer-events-none"
          style={{
            left: selectionRectangle.left,
            top: selectionRectangle.top,
            width: selectionRectangle.width,
            height: selectionRectangle.height,
          }}
        />
      )}

      {contextMenu && selectedType === "wall" && selectedId && (
        <div
          className="absolute z-50 w-40 rounded-md border border-border bg-popover shadow-lg text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="block w-full px-3 py-2 text-left hover:bg-muted/80 cursor-pointer"
            onClick={() => handleContextAction("inspect")}
          >
            Inspect wall
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-muted/80 cursor-pointer"
            onClick={() => handleContextAction("toggleVisible")}
          >
            {isWallHidden ? "Show wall" : "Hide wall"}
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-muted/80 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handleContextAction("showAllWalls")}
            disabled={!hasHiddenWalls}
          >
            Show all walls
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-muted/80 cursor-pointer"
            onClick={() => handleContextAction("opening")}
          >
            Add opening
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-muted/80 cursor-pointer"
            onClick={() => handleContextAction("deselect")}
          >
            Deselect
          </button>
        </div>
      )}

      {viewMode === "3d" && activeTool === "select" && selectedId && selectedType !== "room" && !selectedObjectLocked && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-md border border-border bg-card/95 p-1 shadow-md">
          <div className="flex items-center gap-0.5 border-r border-border pr-1">
            <button
              type="button"
              aria-label="Move selected object"
              aria-pressed={transformGizmoMode === "translate"}
              title="Move with axis-constrained gizmo"
              onClick={() => setTransformGizmoMode("translate")}
              className={`grid size-8 place-items-center rounded-sm ${transformGizmoMode === "translate" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Move3D className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Rotate selected object"
              aria-pressed={transformGizmoMode === "rotate"}
              title="Rotate around an axis"
              onClick={() => setTransformGizmoMode("rotate")}
              className={`grid size-8 place-items-center rounded-sm ${transformGizmoMode === "rotate" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Rotate3D className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Scale selected object"
              aria-pressed={transformGizmoMode === "scale"}
              title="Scale along an axis or uniformly"
              onClick={() => setTransformGizmoMode("scale")}
              className={`grid size-8 place-items-center rounded-sm ${transformGizmoMode === "scale" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Scaling className="size-4" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Toggle grid snapping"
            aria-pressed={snapEnabled}
            title={`Grid snap ${snapEnabled ? "on" : "off"} (${snapStep} mm)`}
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`grid size-8 place-items-center rounded-sm ${snapEnabled ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Grid3X3 className="size-4" />
          </button>
          <input
            aria-label="Grid snap interval in millimetres"
            title="Grid interval in millimetres"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={snapStep}
            onChange={(event) => {
              const nextStep = Number(event.currentTarget.value);
              if (Number.isFinite(nextStep) && nextStep >= 1 && nextStep <= 1000) {
                useAppStore.getState().setSnapStep(nextStep);
              }
            }}
            className="h-7 w-12 rounded border border-border bg-background px-1 text-center text-[10px] font-mono"
          />
          <span className="-ml-1 text-[9px] text-muted-foreground">mm</span>
          <button
            type="button"
            aria-label="Toggle wall snapping"
            aria-pressed={snapToWalls}
            title={`Wall snapping ${snapToWalls ? "on" : "off"}`}
            onClick={() => setSnapToWalls(!snapToWalls)}
            className={`grid size-8 place-items-center rounded-sm ${snapToWalls ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Magnet className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Toggle object snapping"
            aria-pressed={snapToObjects}
            title={`Object snapping ${snapToObjects ? "on" : "off"}`}
            onClick={() => setSnapToObjects(!snapToObjects)}
            className={`grid size-8 place-items-center rounded-sm ${snapToObjects ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Magnet className="size-4 rotate-90" />
          </button>
          <button
            type="button"
            aria-label="Toggle corner snapping"
            aria-pressed={snapToCorners}
            title={`Corner snapping ${snapToCorners ? "on" : "off"}`}
            onClick={() => setSnapToCorners(!snapToCorners)}
            className={`grid size-8 place-items-center rounded-sm ${snapToCorners ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Crosshair className="size-4" />
          </button>
        </div>
      )}

      {/* Floating View Overlay: Camera & Navigation hints */}
      <div className="absolute top-3 left-3 bg-card/85 backdrop-blur-xs border border-border/60 px-2.5 py-1.5 rounded-md shadow-2xs text-[11px] text-muted-foreground flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Camera className="w-3.5 h-3.5 text-primary" />
          <span className="capitalize">{cameraMode} Mode</span>
        </div>
        <div className="h-3 w-px bg-border"></div>
        {activeTool === "measure" ? (
          <span className="text-[10px] text-amber-500 font-medium">
            {activeMeasurementStart
              ? "Click second point to complete measurement"
              : "Click a point to start measuring"}
          </span>
        ) : (
          <span className="text-[10px]">
            Left-drag to orbit • Middle-drag to pan • Scroll to zoom
          </span>
        )}
      </div>

      {/* Room dimensions badge overlay */}
      <div className="absolute top-3 right-3 bg-card/85 backdrop-blur-xs border border-border/60 px-2.5 py-1 rounded-md shadow-2xs text-[11px] font-mono text-muted-foreground pointer-events-none">
        {project.room.length} × {project.room.width} × {project.room.height} mm
      </div>

      {/* Measure mode start indicator */}
      {activeTool === "measure" && activeMeasurementStart && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg pointer-events-none">
          📏 Start set — click end point
        </div>
      )}
    </div>
  );
}
