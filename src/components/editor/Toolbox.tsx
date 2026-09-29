"use client";

import React, { useCallback } from "react";
import { useAppStore } from "@/store";
import type { ActiveTool } from "@/store/uiSlice";
import type { CountertopPlatform } from "@/types/kitchen";
import { PLATFORM_DEFAULTS } from "@/data/presets";
import { generateId } from "@/lib/id";
import {
  MousePointer,
  Home,
  SquareDashedBottom,
  Table,
  Archive,
  Refrigerator,
  Ruler,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ToolItem {
  id: ActiveTool;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
  phaseBadge?: string;
  shortcut?: string;
}

export function Toolbox() {
  const activeTool = useAppStore((state) => state.activeTool);
  const setActiveTool = useAppStore((state) => state.setActiveTool);
  const selectObject = useAppStore((state) => state.selectObject);
  const project = useAppStore((state) => state.project);
  const addPlatform = useAppStore((state) => state.addPlatform);

  const tools: ToolItem[] = [
    {
      id: "select",
      label: "Select & Inspect",
      icon: MousePointer,
      shortcut: "V",
    },
    {
      id: "room",
      label: "Room Settings",
      icon: Home,
      shortcut: "R",
    },
    {
      id: "wall",
      label: "Wall Engine & Openings",
      icon: SquareDashedBottom,
      shortcut: "W",
    },
    {
      id: "platform",
      label: "Countertop / Platform",
      icon: Table,
      shortcut: "P",
    },
    {
      id: "cabinet",
      label: "Base & Wall Cabinets",
      icon: Archive,
      shortcut: "C",
    },
    {
      id: "appliance",
      label: "Appliances & Sinks",
      icon: Refrigerator,
      shortcut: "A",
    },
    {
      id: "measure",
      label: "CAD Measurement",
      icon: Ruler,
      disabled: true,
      phaseBadge: "Phase 4",
    },
  ];

  const openCatalog = useAppStore((state) => state.openCatalog);

  const handleToolClick = useCallback((toolId: ActiveTool) => {
    setActiveTool(toolId);

    if (toolId === "room") {
      selectObject("room", "room");
    } else if (toolId === "cabinet") {
      openCatalog("cabinets");
    } else if (toolId === "appliance") {
      openCatalog("sinks");
    } else if (toolId === "platform") {
      if (project.platforms.length > 0) {
        selectObject(project.platforms[0].id, "platform");
      } else {
        const newPlatform: CountertopPlatform = {
          id: generateId("plat"),
          name: "Main Platform",
          shape: "straight",
          position: { x: project.room.wallThickness, z: project.room.wallThickness },
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
        addPlatform(newPlatform);
        selectObject(newPlatform.id, "platform");
      }
    }
  }, [setActiveTool, selectObject, project.platforms, project.room.wallThickness, addPlatform, openCatalog]);

  return (
    <aside className="w-14 bg-card border-r border-border flex flex-col items-center py-3 gap-1.5 shrink-0 select-none z-10">
      <TooltipProvider delay={150}>
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;

          return (
            <Tooltip key={t.id}>
              <TooltipTrigger
                disabled={t.disabled}
                onClick={() => {
                  if (t.disabled) return;
                  handleToolClick(t.id);
                }}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  t.disabled
                    ? "opacity-35 cursor-not-allowed text-muted-foreground"
                    : isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                {t.phaseBadge && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-muted border border-border/80 px-1 py-0.2 rounded font-mono font-medium text-muted-foreground scale-90">
                    P{t.phaseBadge.split(" ")[1]}
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2 text-xs">
                <span>{t.label}</span>
                {t.shortcut && <span className="text-[10px] text-muted-foreground font-mono">({t.shortcut})</span>}
                {t.phaseBadge && <span className="text-[10px] text-amber-500 font-semibold font-mono">[{t.phaseBadge}]</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </aside>
  );
}
