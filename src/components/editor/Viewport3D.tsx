"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { BabylonEngine } from "@/engine/BabylonEngine";
import type { SelectableObjectType } from "@/store/selectionSlice";
import { Camera } from "lucide-react";

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

  const [isReady, setIsReady] = useState(false);

  // Selection callback from 3D raycast
  const handleSelect = useCallback(
    (id: string | null, type: SelectableObjectType | null, subId?: string | null) => {
      selectObject(id, type, subId);
    },
    [selectObject]
  );

  // Initialize Babylon Engine once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BabylonEngine(canvas, handleSelect, onCursorMove);
    engineRef.current = engine;
    setIsReady(true);

    // Initial scene setup & framing
    engine.updateProjectScene(
      project.room, project.walls, project.platforms,
      project.sinks, project.hobs, project.cabinets, project.appliances, project.utilityPoints,
      selectedId, gridVisible
    );
    engine.fitToRoom(project.room);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      selectedId,
      gridVisible
    );
  }, [
    project.room, project.walls, project.platforms,
    project.sinks, project.hobs, project.cabinets, project.appliances, project.utilityPoints,
    selectedId, gridVisible, isReady,
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

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-zinc-950 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none block touch-none cursor-default"
        tabIndex={0}
      />

      {/* Floating View Overlay: Camera & Navigation hints */}
      <div className="absolute top-3 left-3 bg-card/85 backdrop-blur-xs border border-border/60 px-2.5 py-1.5 rounded-md shadow-2xs text-[11px] text-muted-foreground flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Camera className="w-3.5 h-3.5 text-primary" />
          <span className="capitalize">{cameraMode} Mode</span>
        </div>
        <div className="h-3 w-px bg-border"></div>
        <span className="text-[10px]">
          Right-drag to orbit • Middle-drag to pan • Scroll to zoom
        </span>
      </div>

      {/* Room dimensions badge overlay */}
      <div className="absolute top-3 right-3 bg-card/85 backdrop-blur-xs border border-border/60 px-2.5 py-1 rounded-md shadow-2xs text-[11px] font-mono text-muted-foreground pointer-events-none">
        {project.room.length} × {project.room.width} × {project.room.height} mm
      </div>
    </div>
  );
}
