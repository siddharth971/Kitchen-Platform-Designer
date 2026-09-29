"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store";
import type { CameraPresetMode } from "@/store/cameraSlice";
import type { DisplayUnit } from "@/types/project";
import { runProjectValidation } from "@/core/validation";
import {
  Undo2,
  Redo2,
  Maximize2,
  Camera,
  ChevronDown,
  Save,
  ShieldCheck,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function TopBar() {
  const project = useAppStore((state) => state.project);
  const displayUnit = useAppStore((state) => state.displayUnit);
  const setDisplayUnit = useAppStore((state) => state.setDisplayUnit);
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const triggerFit = useAppStore((state) => state.triggerFit);
  const canUndo = useAppStore((state) => state.canUndo());
  const canRedo = useAppStore((state) => state.canRedo());
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const setProject = useAppStore((state) => state.setProject);
  const validationDrawerOpen = useAppStore((state) => state.validationDrawerOpen);
  const setValidationDrawerOpen = useAppStore((state) => state.setValidationDrawerOpen);

  const report = useMemo(() => runProjectValidation(project), [project]);
  const estimationOpen = useAppStore((state) => state.estimationOpen);
  const setEstimationOpen = useAppStore((state) => state.setEstimationOpen);

  const handleUndo = () => {
    const prev = undo();
    if (prev) setProject(prev);
  };

  const handleRedo = () => {
    const next = redo();
    if (next) setProject(next);
  };

  const cameraModes: { id: CameraPresetMode; label: string }[] = [
    { id: "perspective", label: "Perspective (3D)" },
    { id: "top", label: "Top View (Plan)" },
    { id: "front", label: "Front View (South)" },
    { id: "left", label: "Left View (West)" },
    { id: "right", label: "Right View (East)" },
    { id: "isometric", label: "Isometric" },
  ];

  const unitOptions: { id: DisplayUnit; label: string }[] = [
    { id: "mm", label: "Millimetres (mm)" },
    { id: "cm", label: "Centimetres (cm)" },
    { id: "inch", label: "Inches (in)" },
    { id: "feet-inch", label: "Feet & Inches (ft/in)" },
  ];

  return (
    <header className="h-13 bg-card border-b border-border px-4 flex items-center justify-between select-none shrink-0 z-10">
      {/* Left: Project Brand & Details */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-tight text-sm text-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
          <span>Kitchen Platform Designer</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-medium">
            v0.4 Phase 4
          </span>
        </div>

        <div className="h-4 w-px bg-border mx-1"></div>

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
            {project.name}
          </span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
            {project.customer?.name ? `Client: ${project.customer.name}` : "Untitled Kitchen"}
          </span>
        </div>
      </div>

      {/* Center: Controls (Undo/Redo, 2D/3D, Camera, Fit) */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-1"></div>

        {/* 2D / 3D Toggle */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/50 text-xs">
          <button
            onClick={() => {
              setViewMode("3d");
              if (cameraMode === "top") setCameraMode("perspective");
            }}
            className={`px-2.5 py-1 rounded-sm font-medium transition-all cursor-pointer ${
              viewMode === "3d"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => {
              setViewMode("2d");
              setCameraMode("top");
            }}
            className={`px-2.5 py-1 rounded-sm font-medium transition-all cursor-pointer ${
              viewMode === "2d"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            2D Plan
          </button>
        </div>

        {/* Camera Preset Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 gap-1.5 text-xs font-normal cursor-pointer"
            )}
          >
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="capitalize">{cameraMode}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {cameraModes.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => setCameraMode(item.id)}
                className={`text-xs cursor-pointer ${cameraMode === item.id ? "font-semibold bg-accent" : ""}`}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fit to View */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer"
          onClick={triggerFit}
          title="Fit Whole Room in View (F)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </Button>
      </div>

      {/* Right: Unit System & Actions */}
      <div className="flex items-center gap-2">
        {/* Unit Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 gap-1.5 text-xs font-mono cursor-pointer"
            )}
          >
            <span>{displayUnit.toUpperCase()}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {unitOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => setDisplayUnit(opt.id)}
                className={`text-xs cursor-pointer ${displayUnit === opt.id ? "font-semibold bg-accent" : ""}`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Validation Badge */}
        <button
          onClick={() => setValidationDrawerOpen(!validationDrawerOpen)}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-all cursor-pointer ${
            report.isValid
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
              : report.errorsCount > 0
              ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          }`}
          title="Open Design Validation"
        >
          {report.isValid ? (
            <ShieldCheck className="w-3.5 h-3.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
          <span>
            {report.isValid
              ? "Valid"
              : `${report.errorsCount}E ${report.warningsCount}W`}
          </span>
        </button>

        <Button
          variant="outline"
          size="sm"
          className={`h-8 gap-1.5 text-xs cursor-pointer ${
            estimationOpen ? "bg-primary text-primary-foreground border-primary" : ""
          }`}
          onClick={() => setEstimationOpen(!estimationOpen)}
          title="Open Cost Estimation (E)"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Estimate</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer"
          onClick={() => {
            alert("Project saved locally to memory state.");
          }}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </Button>
      </div>
    </header>
  );
}
