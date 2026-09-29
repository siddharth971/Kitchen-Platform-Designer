"use client";

import React from "react";
import { useAppStore } from "@/store";
import {
  SINK_CATALOG,
  HOB_CATALOG,
  CABINET_CATALOG,
  APPLIANCE_CATALOG,
  type SinkCatalogEntry,
  type HobCatalogEntry,
  type CabinetCatalogEntry,
  type ApplianceCatalogEntry,
} from "@/data/catalogLoader";
import type {
  SinkInstance,
  HobInstance,
  Cabinet,
  ApplianceInstance,
  UtilityPoint,
  Cutout,
} from "@/types/kitchen";
import { generateId } from "@/lib/id";
import { formatLength } from "@/core/units";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Flame,
  Archive,
  Refrigerator,
  Zap,
  Droplets,
  Plus,
  Check,
  AlertTriangle,
} from "lucide-react";

export function CatalogModal() {
  const catalogOpen = useAppStore((state) => state.catalogOpen);
  const catalogTab = useAppStore((state) => state.catalogTab);
  const closeCatalog = useAppStore((state) => state.closeCatalog);
  const project = useAppStore((state) => state.project);
  const selectedId = useAppStore((state) => state.selectedId);
  const displayUnit = useAppStore((state) => state.displayUnit);

  const addSink = useAppStore((state) => state.addSink);
  const addHob = useAppStore((state) => state.addHob);
  const addCutout = useAppStore((state) => state.addCutout);
  const addCabinet = useAppStore((state) => state.addCabinet);
  const addAppliance = useAppStore((state) => state.addAppliance);
  const addUtilityPoint = useAppStore((state) => state.addUtilityPoint);
  const selectObject = useAppStore((state) => state.selectObject);
  const pushHistory = useAppStore((state) => state.pushHistory);

  const openCatalog = useAppStore((state) => state.openCatalog);

  const targetPlatform =
    project.platforms.find((p) => p.id === selectedId) || project.platforms[0];

  // ── SINK INSERTION ──
  const handleInsertSink = (entry: SinkCatalogEntry) => {
    if (!targetPlatform) return;
    pushHistory(project);

    // Calculate smart position on platform
    // Center in depth, place around 25% along length or after existing cutouts
    const existingCutouts = targetPlatform.cutouts || [];
    let placeX = 300;
    if (existingCutouts.length > 0) {
      const maxX = Math.max(...existingCutouts.map((c: Cutout) => c.x + c.width));
      placeX = Math.min(maxX + 200, targetPlatform.length - entry.width - 100);
    }
    const placeZ = Math.max(50, Math.round((targetPlatform.depth - entry.depth) / 2));

    const sinkId = generateId("sink");
    const cutoutId = generateId("cutout");

    // Sink 3D object
    const sink: SinkInstance = {
      id: sinkId,
      catalogId: entry.id,
      name: entry.name,
      position: {
        x: targetPlatform.position.x + placeX,
        y: targetPlatform.workingHeight,
        z: targetPlatform.position.z + placeZ,
      },
      width: entry.width,
      depth: entry.depth,
      height: entry.height,
      cutoutWidth: entry.cutoutWidth,
      cutoutDepth: entry.cutoutDepth,
      mountingType: entry.mountingType,
      requiredClearance: entry.requiredClearance,
      platformId: targetPlatform.id,
    };

    // Cutout hole in countertop slab
    const cutoutOffsetInsetX = (entry.width - entry.cutoutWidth) / 2;
    const cutoutOffsetInsetZ = (entry.depth - entry.cutoutDepth) / 2;

    const cutout: Cutout = {
      id: cutoutId,
      type: "sink",
      shape: "rect",
      x: placeX + cutoutOffsetInsetX,
      y: placeZ + cutoutOffsetInsetZ,
      width: entry.cutoutWidth,
      depth: entry.cutoutDepth,
      sourceObjectId: sinkId,
    };

    addSink(sink);
    addCutout(targetPlatform.id, cutout);
    selectObject(sinkId, "sink");
    closeCatalog();
  };

  // ── HOB INSERTION ──
  const handleInsertHob = (entry: HobCatalogEntry) => {
    if (!targetPlatform) return;
    pushHistory(project);

    // Center in depth, place around 60% of length or after existing cutouts
    const existingCutouts = targetPlatform.cutouts || [];
    let placeX = Math.round(targetPlatform.length * 0.6);
    if (existingCutouts.length > 0) {
      const maxX = Math.max(...existingCutouts.map((c: Cutout) => c.x + c.width));
      placeX = Math.min(maxX + 200, targetPlatform.length - entry.width - 100);
    }
    const placeZ = Math.max(50, Math.round((targetPlatform.depth - entry.depth) / 2));

    const hobId = generateId("hob");
    const cutoutId = generateId("cutout");

    const hob: HobInstance = {
      id: hobId,
      catalogId: entry.id,
      name: entry.name,
      position: {
        x: targetPlatform.position.x + placeX,
        y: targetPlatform.workingHeight,
        z: targetPlatform.position.z + placeZ,
      },
      width: entry.width,
      depth: entry.depth,
      height: entry.height,
      cutoutWidth: entry.cutoutWidth,
      cutoutDepth: entry.cutoutDepth,
      burners: entry.burners,
      hobType: entry.hobType,
      requiredClearance: entry.requiredClearance,
      platformId: targetPlatform.id,
    };

    const cutoutOffsetInsetX = (entry.width - entry.cutoutWidth) / 2;
    const cutoutOffsetInsetZ = (entry.depth - entry.cutoutDepth) / 2;

    const cutout: Cutout = {
      id: cutoutId,
      type: "hob",
      shape: "rect",
      x: placeX + cutoutOffsetInsetX,
      y: placeZ + cutoutOffsetInsetZ,
      width: entry.cutoutWidth,
      depth: entry.cutoutDepth,
      sourceObjectId: hobId,
    };

    addHob(hob);
    addCutout(targetPlatform.id, cutout);
    selectObject(hobId, "hob");
    closeCatalog();
  };

  // ── CABINET INSERTION ──
  const handleInsertCabinet = (entry: CabinetCatalogEntry) => {
    pushHistory(project);
    const cabId = generateId("cab");

    // Position adjacent to existing cabinets or against room wall
    const existingCabs = project.cabinets.filter((c) => c.type === entry.type);
    let posX = project.room.wallThickness + 50;
    if (existingCabs.length > 0) {
      const last = existingCabs[existingCabs.length - 1];
      posX = last.position.x + last.width;
    }

    const posY = entry.type === "wall" ? 1400 : 0;
    const posZ = project.room.wallThickness;

    const cabinet: Cabinet = {
      id: cabId,
      type: entry.type,
      position: { x: posX, y: posY, z: posZ },
      width: entry.width,
      height: entry.height,
      depth: entry.depth,
      doors: entry.doors,
      drawers: entry.drawers,
      plinthHeight: entry.plinthHeight,
    };

    addCabinet(cabinet);
    selectObject(cabId, "cabinet");
    closeCatalog();
  };

  // ── APPLIANCE INSERTION ──
  const handleInsertAppliance = (entry: ApplianceCatalogEntry) => {
    pushHistory(project);
    const applId = generateId("appl");

    let posX = project.room.wallThickness + 100;
    let posZ = project.room.width - entry.depth - project.room.wallThickness;
    let posY = 0;

    if (entry.category === "chimney") {
      // Align chimney over hob if available
      if (project.hobs.length > 0) {
        const hob = project.hobs[0];
        posX = hob.position.x + (hob.width - entry.width) / 2;
        posZ = hob.position.z;
        posY = 1450;
      } else {
        posY = 1450;
      }
    } else if (entry.category === "microwave") {
      posY = targetPlatform ? targetPlatform.workingHeight : 850;
    }

    const appliance: ApplianceInstance = {
      id: applId,
      catalogId: entry.id,
      name: entry.name,
      category: entry.category,
      position: { x: posX, y: posY, z: posZ },
      dimensions: {
        width: entry.width,
        height: entry.height,
        depth: entry.depth,
      },
      clearance: entry.clearance,
      powerPointRequired: entry.powerPointRequired,
      waterPointRequired: entry.waterPointRequired,
      drainPointRequired: entry.drainPointRequired,
    };

    addAppliance(appliance);
    selectObject(applId, "appliance");
    closeCatalog();
  };

  // ── UTILITY INSERTION ──
  const handleInsertUtility = (
    type: "electric" | "water" | "gas" | "drain" | "chimney",
    name: string,
    defaultY: number
  ) => {
    pushHistory(project);
    const utilId = generateId("util");
    const count = project.utilityPoints.filter((u) => u.type === type).length;

    const posX = project.room.wallThickness + 400 + count * 200;
    const posZ = project.room.wallThickness + 20;

    const util: UtilityPoint = {
      id: utilId,
      type,
      x: posX,
      y: defaultY,
      z: posZ,
      notes: name,
    };

    addUtilityPoint(util);
    selectObject(utilId, "utility");
    closeCatalog();
  };

  return (
    <Dialog open={catalogOpen} onOpenChange={(open) => !open && closeCatalog()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg font-bold">Kitchen Component Catalog</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Select verified sinks, hobs, cabinets, appliances, and utility points to place into your design.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={catalogTab}
          onValueChange={(t) =>
            openCatalog(
              t as "sinks" | "hobs" | "cabinets" | "appliances" | "utilities"
            )
          }
          className="flex-1 flex flex-col min-h-0 pt-2"
        >
          <TabsList className="grid grid-cols-5 w-full bg-muted/60">
            <TabsTrigger value="sinks" className="text-xs gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>Sinks</span>
            </TabsTrigger>
            <TabsTrigger value="hobs" className="text-xs gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Hobs</span>
            </TabsTrigger>
            <TabsTrigger value="cabinets" className="text-xs gap-1.5">
              <Archive className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cabinets</span>
            </TabsTrigger>
            <TabsTrigger value="appliances" className="text-xs gap-1.5">
              <Refrigerator className="w-3.5 h-3.5 text-indigo-500" />
              <span>Appliances</span>
            </TabsTrigger>
            <TabsTrigger value="utilities" className="text-xs gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Utilities</span>
            </TabsTrigger>
          </TabsList>

          {/* SINKS TAB */}
          <TabsContent value="sinks" className="flex-1 overflow-hidden pt-3">
            {!targetPlatform && (
              <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You need a countertop platform in the scene to insert a sink and cut out the hole.</span>
              </div>
            )}
            <ScrollArea className="h-[460px] pr-3">
              <div className="grid grid-cols-2 gap-3">
                {SINK_CATALOG.map((sink) => (
                  <div
                    key={sink.id}
                    className="p-3.5 rounded-lg border border-border bg-card/60 hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-xs text-foreground">{sink.name}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0 font-mono">
                          {sink.mountingType}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>Dimensions:</span>
                          <span className="font-mono text-foreground">
                            {formatLength(sink.width, displayUnit)} × {formatLength(sink.depth, displayUnit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cutout Required:</span>
                          <span className="font-mono text-primary font-medium">
                            {formatLength(sink.cutoutWidth, displayUnit)} × {formatLength(sink.cutoutDepth, displayUnit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Clearance:</span>
                          <span className="font-mono">{formatLength(sink.requiredClearance, displayUnit)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5"
                      disabled={!targetPlatform}
                      onClick={() => handleInsertSink(sink)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place on Countertop</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* HOBS TAB */}
          <TabsContent value="hobs" className="flex-1 overflow-hidden pt-3">
            {!targetPlatform && (
              <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You need a countertop platform in the scene to insert a hob and cut out the hole.</span>
              </div>
            )}
            <ScrollArea className="h-[460px] pr-3">
              <div className="grid grid-cols-2 gap-3">
                {HOB_CATALOG.map((hob) => (
                  <div
                    key={hob.id}
                    className="p-3.5 rounded-lg border border-border bg-card/60 hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-xs text-foreground">{hob.name}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0 font-mono">
                          {hob.hobType} · {hob.burners}B
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>Dimensions:</span>
                          <span className="font-mono text-foreground">
                            {formatLength(hob.width, displayUnit)} × {formatLength(hob.depth, displayUnit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cutout Hole:</span>
                          <span className="font-mono text-primary font-medium">
                            {formatLength(hob.cutoutWidth, displayUnit)} × {formatLength(hob.cutoutDepth, displayUnit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Edge Clearance:</span>
                          <span className="font-mono">{formatLength(hob.requiredClearance, displayUnit)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5"
                      disabled={!targetPlatform}
                      onClick={() => handleInsertHob(hob)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place on Countertop</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CABINETS TAB */}
          <TabsContent value="cabinets" className="flex-1 overflow-hidden pt-3">
            <ScrollArea className="h-[460px] pr-3">
              <div className="grid grid-cols-2 gap-3">
                {CABINET_CATALOG.map((cab) => (
                  <div
                    key={cab.id}
                    className="p-3.5 rounded-lg border border-border bg-card/60 hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-xs text-foreground">{cab.name}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0 font-mono">
                          {cab.type}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>W × D × H:</span>
                          <span className="font-mono text-foreground">
                            {formatLength(cab.width, displayUnit)} × {formatLength(cab.depth, displayUnit)} × {formatLength(cab.height, displayUnit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Doors & Drawers:</span>
                          <span className="font-mono">
                            {cab.doors} {cab.doors === 1 ? "Door" : "Doors"}, {cab.drawers} {cab.drawers === 1 ? "Drawer" : "Drawers"}
                          </span>
                        </div>
                        {cab.plinthHeight > 0 && (
                          <div className="flex justify-between">
                            <span>Plinth Height:</span>
                            <span className="font-mono">{formatLength(cab.plinthHeight, displayUnit)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleInsertCabinet(cab)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cabinet</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* APPLIANCES TAB */}
          <TabsContent value="appliances" className="flex-1 overflow-hidden pt-3">
            <ScrollArea className="h-[460px] pr-3">
              <div className="grid grid-cols-2 gap-3">
                {APPLIANCE_CATALOG.map((appl) => (
                  <div
                    key={appl.id}
                    className="p-3.5 rounded-lg border border-border bg-card/60 hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-xs text-foreground">{appl.name}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0 font-mono">
                          {appl.category}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>Dimensions:</span>
                          <span className="font-mono text-foreground">
                            {formatLength(appl.width, displayUnit)} × {formatLength(appl.depth, displayUnit)} × {formatLength(appl.height, displayUnit)}
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {appl.powerPointRequired && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-amber-500/10 text-amber-500">
                              ⚡ Power Required
                            </Badge>
                          )}
                          {appl.waterPointRequired && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-blue-500/10 text-blue-500">
                              🚰 Water Inlet
                            </Badge>
                          )}
                          {appl.drainPointRequired && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-teal-500/10 text-teal-500">
                              🪠 Drain Outlet
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleInsertAppliance(appl)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place Appliance</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* UTILITIES TAB */}
          <TabsContent value="utilities" className="flex-1 overflow-hidden pt-3">
            <ScrollArea className="h-[460px] pr-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-card/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <h4 className="font-semibold text-xs text-foreground">Water Inlet (Angle Valve)</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Standard cold/hot water angle stop for sink mixer or water purifier. Default height: 550mm.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => handleInsertUtility("water", "Water Inlet", 550)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Water Inlet</span>
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Droplets className="w-4 h-4 text-teal-500" />
                      <h4 className="font-semibold text-xs text-foreground">Drainage Outlet</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Waste drain pipe connection for sink bowl or dishwasher. Default height: 450mm from floor.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => handleInsertUtility("drain", "Waste Drain", 450)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Drain Outlet</span>
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="font-semibold text-xs text-foreground">16A Power Socket</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Heavy-duty power socket for microwave, refrigerator, or induction hob. Default height: 1100mm.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => handleInsertUtility("electric", "16A Power Socket", 1100)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Power Socket</span>
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold text-xs text-foreground">Gas Line Point</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Piped natural gas (PNG) inlet nozzle or cylinder pathway hole. Default height: 750mm.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => handleInsertUtility("gas", "Gas Point", 750)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Gas Point</span>
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Check className="w-4 h-4 text-purple-500" />
                      <h4 className="font-semibold text-xs text-foreground">Chimney Duct Outlet</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      6-inch round wall core cut for chimney exhaust ducting. Default height: 2200mm.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => handleInsertUtility("chimney", "Chimney Duct Point", 2200)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Duct Point</span>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
