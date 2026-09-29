"use client";

import React from "react";
import { useAppStore } from "@/store";
import { formatLength } from "@/core/units";
import { Grid, Magnet, Info } from "lucide-react";

interface StatusBarProps {
  cursorPos?: { x: number; y: number; z: number } | null;
}

export function StatusBar({ cursorPos }: StatusBarProps) {
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedType = useAppStore((state) => state.selectedType);
  const displayUnit = useAppStore((state) => state.displayUnit);
  const gridVisible = useAppStore((state) => state.gridVisible);
  const setGridVisible = useAppStore((state) => state.setGridVisible);
  const snapEnabled = useAppStore((state) => state.snapEnabled);
  const setSnapEnabled = useAppStore((state) => state.setSnapEnabled);
  const snapStep = useAppStore((state) => state.snapStep);

  return (
    <footer className="h-7 bg-card border-t border-border px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0 font-mono">
      {/* Left: Cursor position & Selection */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-foreground/70 font-semibold">POS:</span>
          <span>
            X: {cursorPos ? formatLength(cursorPos.x, displayUnit) : "—"} | Z:{" "}
            {cursorPos ? formatLength(cursorPos.z, displayUnit) : "—"}
          </span>
        </div>

        <div className="h-3 w-px bg-border"></div>

        <div className="flex items-center gap-1.5">
          <span className="text-foreground/70 font-semibold">SEL:</span>
          <span className="text-foreground capitalize">
            {selectedType ? `${selectedType} (${selectedId})` : "None"}
          </span>
        </div>
      </div>

      {/* Right: Grid, Snap, Unit, Certification disclaimer */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setGridVisible(!gridVisible)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
            gridVisible ? "text-foreground bg-muted font-semibold" : "hover:text-foreground"
          }`}
          title="Toggle Grid (G)"
        >
          <Grid className="w-3 h-3" />
          <span>GRID {gridVisible ? "ON" : "OFF"}</span>
        </button>

        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
            snapEnabled ? "text-foreground bg-muted font-semibold" : "hover:text-foreground"
          }`}
          title="Toggle Snap (S)"
        >
          <Magnet className="w-3 h-3" />
          <span>SNAP: {snapEnabled ? `${snapStep}mm` : "OFF"}</span>
        </button>

        <div className="h-3 w-px bg-border"></div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
          <Info className="w-3 h-3 shrink-0" />
          <span>Estimates only. Confirm on site.</span>
        </div>
      </div>
    </footer>
  );
}
