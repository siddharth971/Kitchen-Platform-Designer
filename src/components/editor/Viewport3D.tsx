"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { BabylonEngine } from "@/engine/BabylonEngine";
import type { SelectableObjectType } from "@/store/selectionSlice";
import { Camera } from "lucide-react";
import {
  computeMeasurement,
  findNearestSnapPoint,
  extractProjectSnapPoints,
} from "@/core/geometry/measurement";
import type { Point3D } from "@/types/geometry";
import { generateId } from "@/lib/id";

interface Viewport3DProps {
  onCursorMove?: (posMm: { x: number; y: number; z: number }) => void;
}

export function Viewport3D({ onCursorMove }: Viewport3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BabylonEngine | null>(null);

  const project = useAppStore((state) => state.project);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectObject = useAppStore((state) => state.selectObject);
  const gridVisible = useAppStore((state) => state.gridVisible);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const fitTrigger = useAppStore((state) => state.fitTrigger);
  const activeTool = useAppStore((state) => state.activeTool);
  const activeMeasurementStart = useAppStore((state) => state.activeMeasurementStart);
  const setActiveMeasurementStart = useAppStore((state) => state.setActiveMeasurementStart);
  const addMeasurement = useAppStore((state) => state.addMeasurement);
  const snapEnabled = useAppStore((state) => state.snapEnabled);

  const [isReady, setIsReady] = useState(false);
  // Local measure-mode state for hover tracking
  const measureStartRef = useRef<Point3D | null>(null);
  const [hoverSnap, setHoverSnap] = useState<Point3D | null>(null);

  // Selection callback from 3D raycast
  const handleSelect = useCallback(
    (id: string | null, type: SelectableObjectType | null, subId?: string | null) => {
      selectObject(id, type, subId);
    },
    [selectObject]
  );

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

    const engine = new BabylonEngine(canvas, handleSelect, handleCursorMove);
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
  }, []);

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
  }, [
    project.room, project.walls, project.platforms,
    project.sinks, project.hobs, project.cabinets, project.appliances, project.utilityPoints,
    project.measurements, selectedId, gridVisible, isReady,
  ]);

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

  const cursorClass =
    activeTool === "measure" ? "cursor-crosshair" : "cursor-default";

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-zinc-950 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className={`w-full h-full outline-none block touch-none ${cursorClass}`}
        tabIndex={0}
        onClick={handleCanvasClick}
      />

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
            Right-drag to orbit • Middle-drag to pan • Scroll to zoom
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
