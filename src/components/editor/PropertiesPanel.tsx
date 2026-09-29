"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store";
import { formatLength, parseLength, formatArea, formatRunningLength } from "@/core/units";
import { getWallLength, calculateWallAreas } from "@/core/geometry/wall";
import { calculatePlatformQuantities } from "@/core/geometry/platform";
import { computeEdgeClearance } from "@/core/geometry/cutout";
import { SAMPLE_MATERIALS, SAMPLE_EDGE_PROFILES } from "@/data/presets";
import { generateId } from "@/lib/id";
import type { WallOpening } from "@/types/project";
import type { PlatformShape, CornerStyle, Cutout } from "@/types/kitchen";
import {
  Home,
  SquareDashedBottom,
  Table,
  Plus,
  Trash2,
  DoorOpen,
  AppWindow,
  Sparkles,
  Layers,
  Scissors,
  Droplets,
  Flame,
  Archive,
  Refrigerator,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function PropertiesPanel() {
  const project = useAppStore((state) => state.project);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedType = useAppStore((state) => state.selectedType);
  const displayUnit = useAppStore((state) => state.displayUnit);
  const selectObject = useAppStore((state) => state.selectObject);
  const updateRoom = useAppStore((state) => state.updateRoom);
  const updateWall = useAppStore((state) => state.updateWall);
  const addWallOpening = useAppStore((state) => state.addWallOpening);
  const updateWallOpening = useAppStore((state) => state.updateWallOpening);
  const removeWallOpening = useAppStore((state) => state.removeWallOpening);
  const updatePlatform = useAppStore((state) => state.updatePlatform);
  const addCutout = useAppStore((state) => state.addCutout);
  const removeCutout = useAppStore((state) => state.removeCutout);
  const updateSink = useAppStore((state) => state.updateSink);
  const removeSink = useAppStore((state) => state.removeSink);
  const updateHob = useAppStore((state) => state.updateHob);
  const removeHob = useAppStore((state) => state.removeHob);
  const updateCabinet = useAppStore((state) => state.updateCabinet);
  const removeCabinet = useAppStore((state) => state.removeCabinet);
  const updateAppliance = useAppStore((state) => state.updateAppliance);
  const removeAppliance = useAppStore((state) => state.removeAppliance);
  const updateUtilityPoint = useAppStore((state) => state.updateUtilityPoint);
  const removeUtilityPoint = useAppStore((state) => state.removeUtilityPoint);
  const openCatalog = useAppStore((state) => state.openCatalog);
  const pushHistory = useAppStore((state) => state.pushHistory);

  // Local error state for dimension text inputs
  const [inputError, setInputError] = useState<string | null>(null);

  const selectedWall = project.walls.find((w) => w.id === selectedId);
  const selectedPlatform = project.platforms.find((p) => p.id === selectedId);
  const selectedSink = project.sinks.find((s) => s.id === selectedId);
  const selectedHob = project.hobs.find((h) => h.id === selectedId);
  const selectedCabinet = project.cabinets.find((c) => c.id === selectedId);
  const selectedAppliance = project.appliances.find((a) => a.id === selectedId);
  const selectedUtility = project.utilityPoints.find((u) => u.id === selectedId);

  // Helper for numeric/length commit
  const handleDimensionCommit = (
    text: string,
    onSuccess: (valMm: number) => void
  ) => {
    try {
      const valMm = parseLength(text, displayUnit);
      if (valMm <= 0) {
        setInputError("Dimension must be positive");
        return;
      }
      pushHistory(project);
      onSuccess(valMm);
      setInputError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setInputError(err.message);
      } else {
        setInputError("Invalid dimension");
      }
    }
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col h-full overflow-hidden select-none z-10 shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {selectedType === "platform" ? (
            <Table className="w-4 h-4 text-primary" />
          ) : selectedType === "wall" ? (
            <SquareDashedBottom className="w-4 h-4 text-primary" />
          ) : selectedType === "sink" ? (
            <Droplets className="w-4 h-4 text-blue-500" />
          ) : selectedType === "hob" ? (
            <Flame className="w-4 h-4 text-amber-500" />
          ) : selectedType === "cabinet" ? (
            <Archive className="w-4 h-4 text-emerald-500" />
          ) : selectedType === "appliance" ? (
            <Refrigerator className="w-4 h-4 text-indigo-500" />
          ) : selectedType === "utility" ? (
            <Zap className="w-4 h-4 text-amber-400" />
          ) : (
            <Home className="w-4 h-4 text-primary" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {selectedType === "platform"
              ? "Countertop Inspector"
              : selectedType === "wall"
              ? "Wall Inspector"
              : selectedType === "sink"
              ? "Sink Inspector"
              : selectedType === "hob"
              ? "Hob Inspector"
              : selectedType === "cabinet"
              ? "Cabinet Inspector"
              : selectedType === "appliance"
              ? "Appliance Inspector"
              : selectedType === "utility"
              ? "Utility Inspector"
              : selectedType === "room"
              ? "Room Inspector"
              : "Properties"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase truncate max-w-[100px]">
          {selectedId || "None"}
        </span>
      </div>

      {inputError && (
        <div className="bg-destructive/10 text-destructive text-xs px-3 py-1.5 border-b border-destructive/20">
          {inputError}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
        {/* PLATFORM PROPERTIES */}
        {selectedType === "platform" && selectedPlatform && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-foreground">{selectedPlatform.name}</h4>
                <span className="text-[10px] font-mono uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {selectedPlatform.shape}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Procedurally generated slab with true fabrication footprint and seams.
              </p>
            </div>

            {/* Shape Switcher */}
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">Platform Shape</Label>
              <div className="grid grid-cols-2 gap-1.5 bg-muted/60 p-1 rounded-md border border-border/50">
                {(["straight", "l-shaped"] as PlatformShape[]).map((shp) => (
                  <button
                    key={shp}
                    onClick={() => {
                      pushHistory(project);
                      updatePlatform(selectedPlatform.id, { shape: shp });
                    }}
                    className={`py-1 text-xs font-medium rounded transition-all capitalize cursor-pointer ${
                      selectedPlatform.shape === shp
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {shp.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Straight Platform Dimensions */}
            {selectedPlatform.shape === "straight" && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Length (X)</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.length, displayUnit)}
                    key={`plen-${selectedPlatform.id}-${selectedPlatform.length}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, { length: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Depth (Z)</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.depth, displayUnit)}
                    key={`pdepth-${selectedPlatform.id}-${selectedPlatform.depth}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, { depth: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
              </div>
            )}

            {/* L-shaped Platform Dimensions */}
            {selectedPlatform.shape === "l-shaped" && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Run A Length (X)</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.lengthA, displayUnit)}
                    key={`pla-${selectedPlatform.id}-${selectedPlatform.lengthA}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, { lengthA: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Run A Depth</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.depthA, displayUnit)}
                    key={`pda-${selectedPlatform.id}-${selectedPlatform.depthA}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, { depthA: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Run B Length (Z)</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.lengthB, displayUnit)}
                    key={`plb-${selectedPlatform.id}-${selectedPlatform.lengthB}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, { lengthB: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Run B Depth</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.depthB, displayUnit)}
                    key={`pdb-${selectedPlatform.id}-${selectedPlatform.depthB}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, { depthB: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>

                {/* Corner Joint Style */}
                <div className="grid grid-cols-2 gap-2 items-center pt-1">
                  <Label className="text-xs text-muted-foreground">Corner Seam</Label>
                  <select
                    value={selectedPlatform.cornerStyle}
                    onChange={(e) => {
                      pushHistory(project);
                      updatePlatform(selectedPlatform.id, {
                        cornerStyle: e.target.value as CornerStyle,
                      });
                    }}
                    className="h-8 text-xs border border-border rounded-md px-2 bg-background font-mono cursor-pointer"
                  >
                    <option value="square">Square Join (90°)</option>
                    <option value="miter">Miter Join (45°)</option>
                  </select>
                </div>
              </div>
            )}

            <Separator />

            {/* Height & Slab Thickness */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Working Height</Label>
                <Input
                  defaultValue={formatLength(selectedPlatform.workingHeight, displayUnit)}
                  key={`pwh-${selectedPlatform.id}-${selectedPlatform.workingHeight}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updatePlatform(selectedPlatform.id, { workingHeight: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Slab Thickness</Label>
                <Input
                  defaultValue={formatLength(selectedPlatform.slabThickness, displayUnit)}
                  key={`pst-${selectedPlatform.id}-${selectedPlatform.slabThickness}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updatePlatform(selectedPlatform.id, { slabThickness: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Front Overhang</Label>
                <Input
                  defaultValue={formatLength(selectedPlatform.overhang.front, displayUnit)}
                  key={`poh-${selectedPlatform.id}-${selectedPlatform.overhang.front}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updatePlatform(selectedPlatform.id, {
                        overhang: { ...selectedPlatform.overhang, front: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            <Separator />

            {/* Material & Edge Profile Selection */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Countertop Material</Label>
                <select
                  value={selectedPlatform.materialId}
                  onChange={(e) => {
                    pushHistory(project);
                    updatePlatform(selectedPlatform.id, { materialId: e.target.value });
                  }}
                  className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background cursor-pointer"
                >
                  {SAMPLE_MATERIALS.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Edge Profile</Label>
                <select
                  value={selectedPlatform.edgeProfileId}
                  onChange={(e) => {
                    pushHistory(project);
                    updatePlatform(selectedPlatform.id, { edgeProfileId: e.target.value });
                  }}
                  className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background cursor-pointer"
                >
                  {SAMPLE_EDGE_PROFILES.map((edge) => (
                    <option key={edge.id} value={edge.id}>
                      {edge.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            {/* Backsplash Configuration */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="backsplash-toggle" className="text-xs">
                  Stone Backsplash
                </Label>
                <Switch
                  id="backsplash-toggle"
                  checked={selectedPlatform.backsplash?.enabled ?? true}
                  onCheckedChange={(checked) => {
                    pushHistory(project);
                    updatePlatform(selectedPlatform.id, {
                      backsplash: {
                        ...(selectedPlatform.backsplash ?? { height: 600, thickness: 20 }),
                        enabled: checked,
                      },
                    });
                  }}
                />
              </div>

              {selectedPlatform.backsplash?.enabled && (
                <div className="grid grid-cols-2 gap-2 items-center pt-1">
                  <Label className="text-xs text-muted-foreground">Backsplash Height</Label>
                  <Input
                    defaultValue={formatLength(selectedPlatform.backsplash.height, displayUnit)}
                    key={`bsh-${selectedPlatform.id}-${selectedPlatform.backsplash.height}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updatePlatform(selectedPlatform.id, {
                          backsplash: { ...selectedPlatform.backsplash, height: val },
                        })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* QUANTITIES & FABRICATION METRICS */}
            {(() => {
              const q = calculatePlatformQuantities(selectedPlatform);
              return (
                <div className="bg-muted/40 p-3 rounded-lg border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Fabrication Quantities
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {q.piecesCount} {q.piecesCount === 1 ? "Piece" : "Pieces"}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Gross Area:</span>
                      <span className="font-mono font-medium">{formatArea(q.grossAreaSqMm, "sq-ft")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Metric Area:</span>
                      <span className="font-mono text-muted-foreground">{formatArea(q.grossAreaSqMm, "sq-m")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Finished Edge:</span>
                      <span className="font-mono">{formatRunningLength(q.finishedEdgeLengthMm, "ft")}</span>
                    </div>
                    {selectedPlatform.backsplash?.enabled && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Backsplash Area:</span>
                        <span className="font-mono">{formatArea(q.backsplashAreaSqMm, "sq-ft")}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Scissors className="w-3 h-3" />
                        Seam Joints:
                      </span>
                      <span className="font-mono font-medium">{q.seamsCount}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <Separator />

            {/* CUTOUTS & OPENINGS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    Cutouts & Openings
                  </h4>
                  <p className="text-[10px] text-muted-foreground">True fabrication holes in slab</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => openCatalog("sinks")}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Sink</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => openCatalog("hobs")}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Hob</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => {
                      pushHistory(project);
                      const newCutout: Cutout = {
                        id: generateId("cutout"),
                        type: "custom",
                        shape: "rect",
                        x: 100,
                        y: 100,
                        width: 200,
                        depth: 200,
                      };
                      addCutout(selectedPlatform.id, newCutout);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Custom</span>
                  </Button>
                </div>
              </div>

              {(!selectedPlatform.cutouts || selectedPlatform.cutouts.length === 0) ? (
                <div className="text-center py-4 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                  <span>No cutouts on this countertop slab.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPlatform.cutouts.map((c: Cutout, idx: number) => {
                    const clearance = computeEdgeClearance(c, selectedPlatform);
                    const isFragile = clearance < 50;
                    return (
                      <div
                        key={c.id}
                        className="bg-card border border-border p-2.5 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize flex items-center gap-1.5">
                            {c.type === "sink" ? (
                              <Droplets className="w-3.5 h-3.5 text-blue-500" />
                            ) : c.type === "hob" ? (
                              <Flame className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {c.type} Cutout #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            {c.sourceObjectId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] px-1.5 text-primary hover:underline"
                                onClick={() => selectObject(c.sourceObjectId!, c.type as "sink" | "hob")}
                              >
                                View Fixture
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                pushHistory(project);
                                removeCutout(selectedPlatform.id, c.id);
                              }}
                              title="Delete Cutout"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground">Width: </span>
                            <span className="font-mono text-foreground">{formatLength(c.width, displayUnit)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Depth: </span>
                            <span className="font-mono text-foreground">{formatLength(c.depth, displayUnit)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground">Min Edge Clearance:</span>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] py-0 px-1 font-mono ${
                              isFragile
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            }`}
                          >
                            {Math.round(clearance)} mm {isFragile ? "⚠️ (< 50mm)" : "✓ Safe"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ROOM PROPERTIES */}
        {selectedType === "room" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Room Dimensions</h4>
              <p className="text-[11px] text-muted-foreground mb-3">
                All measurements are stored in mm internally. You can type values like 3600, 360cm, or 12ft.
              </p>
            </div>

            {/* Length (X) */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Length (X / Width)</Label>
              <Input
                defaultValue={formatLength(project.room.length, displayUnit)}
                key={`len-${project.room.length}-${displayUnit}`}
                className="h-8 text-xs font-mono"
                onBlur={(e) =>
                  handleDimensionCommit(e.target.value, (val) =>
                    updateRoom({ length: val })
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>

            {/* Depth (Z) */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Depth (Z / Length)</Label>
              <Input
                defaultValue={formatLength(project.room.width, displayUnit)}
                key={`depth-${project.room.width}-${displayUnit}`}
                className="h-8 text-xs font-mono"
                onBlur={(e) =>
                  handleDimensionCommit(e.target.value, (val) =>
                    updateRoom({ width: val })
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>

            {/* Height (Y) */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Height (Y / Ceiling)</Label>
              <Input
                defaultValue={formatLength(project.room.height, displayUnit)}
                key={`height-${project.room.height}-${displayUnit}`}
                className="h-8 text-xs font-mono"
                onBlur={(e) =>
                  handleDimensionCommit(e.target.value, (val) =>
                    updateRoom({ height: val })
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>

            {/* Wall Thickness */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Wall Thickness</Label>
              <Input
                defaultValue={formatLength(project.room.wallThickness, displayUnit)}
                key={`thick-${project.room.wallThickness}-${displayUnit}`}
                className="h-8 text-xs font-mono"
                onBlur={(e) =>
                  handleDimensionCommit(e.target.value, (val) =>
                    updateRoom({ wallThickness: val })
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>

            <Separator />

            {/* Floor Area Summary */}
            <div className="bg-muted/40 p-3 rounded-lg border border-border/60 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Floor Area:</span>
                <span className="font-semibold font-mono">
                  {formatArea(project.room.length * project.room.width, "sq-ft")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Metric Area:</span>
                <span className="font-mono text-muted-foreground">
                  {formatArea(project.room.length * project.room.width, "sq-m")}
                </span>
              </div>
            </div>

            {/* Ceiling Toggle */}
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="ceiling-toggle" className="text-xs">
                Show Ceiling Plane
              </Label>
              <Switch
                id="ceiling-toggle"
                checked={project.room.ceilingVisible}
                onCheckedChange={(checked) => updateRoom({ ceilingVisible: checked })}
              />
            </div>

            {/* Quick jump to Platform or Walls */}
            <div className="pt-2 space-y-2">
              {project.platforms.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground block mb-1.5">Select Countertop:</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs justify-start gap-2"
                    onClick={() => selectObject(project.platforms[0].id, "platform")}
                  >
                    <Table className="w-3.5 h-3.5 text-primary" />
                    <span>{project.platforms[0].name} ({formatLength(project.platforms[0].length, displayUnit)})</span>
                  </Button>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground block mb-1.5">Select a Wall:</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {project.walls.map((w) => (
                    <Button
                      key={w.id}
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] justify-start capitalize"
                      onClick={() => selectObject(w.id, "wall")}
                    >
                      {w.id.replace("wall-", "")} Wall
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WALL PROPERTIES & OPENINGS */}
        {selectedType === "wall" && selectedWall && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground capitalize">
                  {selectedWall.id.replace("wall-", "")} Wall
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Length: {formatLength(getWallLength(selectedWall), displayUnit)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => selectObject("room", "room")}
              >
                Back to Room
              </Button>
            </div>

            {/* Wall Height & Thickness */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  defaultValue={formatLength(selectedWall.height, displayUnit)}
                  key={`wh-${selectedWall.id}-${selectedWall.height}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateWall(selectedWall.id, { height: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Thickness</Label>
                <Input
                  defaultValue={formatLength(selectedWall.thickness, displayUnit)}
                  key={`wt-${selectedWall.id}-${selectedWall.thickness}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateWall(selectedWall.id, { thickness: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            {/* Wall Areas calculation */}
            {(() => {
              const areas = calculateWallAreas(selectedWall);
              return (
                <div className="bg-muted/40 p-3 rounded-lg border border-border/60 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Gross Wall Area:</span>
                    <span className="font-mono">{formatArea(areas.grossAreaSqMm, "sq-ft")}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Openings Area:</span>
                    <span className="font-mono">{formatArea(areas.openingsAreaSqMm, "sq-ft")}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium pt-1 border-t border-border/40">
                    <span>Net Wall Area:</span>
                    <span className="font-mono font-semibold">{formatArea(areas.netAreaSqMm, "sq-ft")}</span>
                  </div>
                </div>
              );
            })()}

            <Separator />

            {/* OPENINGS SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Wall Openings</h4>
                  <p className="text-[10px] text-muted-foreground">Real physical cutouts</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 px-2"
                    onClick={() => {
                      const wallLen = getWallLength(selectedWall);
                      const newOpening: WallOpening = {
                        id: "win-" + Date.now(),
                        type: "window",
                        offset: Math.max(100, Math.round(wallLen * 0.25)),
                        width: 1200,
                        height: 1200,
                        sillHeight: 900,
                      };
                      pushHistory(project);
                      addWallOpening(selectedWall.id, newOpening);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Window</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 px-2"
                    onClick={() => {
                      const wallLen = getWallLength(selectedWall);
                      const newOpening: WallOpening = {
                        id: "door-" + Date.now(),
                        type: "door",
                        offset: Math.max(100, Math.round(wallLen * 0.1)),
                        width: 900,
                        height: 2100,
                        sillHeight: 0,
                      };
                      pushHistory(project);
                      addWallOpening(selectedWall.id, newOpening);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Door</span>
                  </Button>
                </div>
              </div>

              {selectedWall.openings.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                  <DoorOpen className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                  <span>No openings on this wall.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedWall.openings.map((op, idx) => (
                    <div
                      key={op.id}
                      className="bg-card border border-border p-3 rounded-lg shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          {op.type === "window" ? (
                            <AppWindow className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <DoorOpen className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className="capitalize">{op.type} #{idx + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            pushHistory(project);
                            removeWallOpening(selectedWall.id, op.id);
                          }}
                          title="Delete Opening"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Offset from start</Label>
                          <Input
                            defaultValue={formatLength(op.offset, displayUnit)}
                            key={`off-${op.id}-${op.offset}-${displayUnit}`}
                            className="h-7 text-xs font-mono"
                            onBlur={(e) =>
                              handleDimensionCommit(e.target.value, (val) =>
                                updateWallOpening(selectedWall.id, op.id, { offset: val })
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Width</Label>
                          <Input
                            defaultValue={formatLength(op.width, displayUnit)}
                            key={`w-${op.id}-${op.width}-${displayUnit}`}
                            className="h-7 text-xs font-mono"
                            onBlur={(e) =>
                              handleDimensionCommit(e.target.value, (val) =>
                                updateWallOpening(selectedWall.id, op.id, { width: val })
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Height</Label>
                          <Input
                            defaultValue={formatLength(op.height, displayUnit)}
                            key={`h-${op.id}-${op.height}-${displayUnit}`}
                            className="h-7 text-xs font-mono"
                            onBlur={(e) =>
                              handleDimensionCommit(e.target.value, (val) =>
                                updateWallOpening(selectedWall.id, op.id, { height: val })
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Sill (from floor)</Label>
                          <Input
                            defaultValue={formatLength(op.sillHeight, displayUnit)}
                            key={`sill-${op.id}-${op.sillHeight}-${displayUnit}`}
                            className="h-7 text-xs font-mono"
                            onBlur={(e) =>
                              handleDimensionCommit(e.target.value, (val) =>
                                updateWallOpening(selectedWall.id, op.id, { sillHeight: val })
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SINK INSPECTOR */}
        {selectedType === "sink" && selectedSink && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{selectedSink.name}</h4>
                <Badge variant="outline" className="text-[10px] capitalize font-mono mt-0.5">
                  {selectedSink.mountingType} Mount
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  pushHistory(project);
                  removeSink(selectedSink.id);
                  selectObject(null, null);
                }}
                title="Delete Sink"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  defaultValue={formatLength(selectedSink.width, displayUnit)}
                  key={`sw-${selectedSink.id}-${selectedSink.width}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, { width: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Depth</Label>
                <Input
                  defaultValue={formatLength(selectedSink.depth, displayUnit)}
                  key={`sd-${selectedSink.id}-${selectedSink.depth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, { depth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Bowl Depth</Label>
                <Input
                  defaultValue={formatLength(selectedSink.height, displayUnit)}
                  key={`sh-${selectedSink.id}-${selectedSink.height}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, { height: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cutout Size</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Cutout Width</Label>
                <Input
                  defaultValue={formatLength(selectedSink.cutoutWidth, displayUnit)}
                  key={`scw-${selectedSink.id}-${selectedSink.cutoutWidth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, { cutoutWidth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Cutout Depth</Label>
                <Input
                  defaultValue={formatLength(selectedSink.cutoutDepth, displayUnit)}
                  key={`scd-${selectedSink.id}-${selectedSink.cutoutDepth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, { cutoutDepth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Position</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Position X</Label>
                <Input
                  defaultValue={formatLength(selectedSink.position.x, displayUnit)}
                  key={`spx-${selectedSink.id}-${selectedSink.position.x}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, {
                        position: { ...selectedSink.position, x: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Position Z</Label>
                <Input
                  defaultValue={formatLength(selectedSink.position.z, displayUnit)}
                  key={`spz-${selectedSink.id}-${selectedSink.position.z}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateSink(selectedSink.id, {
                        position: { ...selectedSink.position, z: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* HOB INSPECTOR */}
        {selectedType === "hob" && selectedHob && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{selectedHob.name}</h4>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[10px] capitalize font-mono">
                    {selectedHob.hobType}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {selectedHob.burners} Burners
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  pushHistory(project);
                  removeHob(selectedHob.id);
                  selectObject(null, null);
                }}
                title="Delete Hob"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  defaultValue={formatLength(selectedHob.width, displayUnit)}
                  key={`hw-${selectedHob.id}-${selectedHob.width}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateHob(selectedHob.id, { width: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Depth</Label>
                <Input
                  defaultValue={formatLength(selectedHob.depth, displayUnit)}
                  key={`hd-${selectedHob.id}-${selectedHob.depth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateHob(selectedHob.id, { depth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Burner Count</Label>
                <select
                  value={selectedHob.burners}
                  onChange={(e) => {
                    pushHistory(project);
                    updateHob(selectedHob.id, { burners: parseInt(e.target.value, 10) });
                  }}
                  className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} Burners
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cutout Size</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Cutout Width</Label>
                <Input
                  defaultValue={formatLength(selectedHob.cutoutWidth, displayUnit)}
                  key={`hcw-${selectedHob.id}-${selectedHob.cutoutWidth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateHob(selectedHob.id, { cutoutWidth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Cutout Depth</Label>
                <Input
                  defaultValue={formatLength(selectedHob.cutoutDepth, displayUnit)}
                  key={`hcd-${selectedHob.id}-${selectedHob.cutoutDepth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateHob(selectedHob.id, { cutoutDepth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Position</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Position X</Label>
                <Input
                  defaultValue={formatLength(selectedHob.position.x, displayUnit)}
                  key={`hpx-${selectedHob.id}-${selectedHob.position.x}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateHob(selectedHob.id, {
                        position: { ...selectedHob.position, x: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Position Z</Label>
                <Input
                  defaultValue={formatLength(selectedHob.position.z, displayUnit)}
                  key={`hpz-${selectedHob.id}-${selectedHob.position.z}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateHob(selectedHob.id, {
                        position: { ...selectedHob.position, z: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CABINET INSPECTOR */}
        {selectedType === "cabinet" && selectedCabinet && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">Cabinet Unit</h4>
                <Badge variant="outline" className="text-[10px] capitalize font-mono mt-0.5">
                  {selectedCabinet.type} Unit
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  pushHistory(project);
                  removeCabinet(selectedCabinet.id);
                  selectObject(null, null);
                }}
                title="Delete Cabinet"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  defaultValue={formatLength(selectedCabinet.width, displayUnit)}
                  key={`cw-${selectedCabinet.id}-${selectedCabinet.width}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateCabinet(selectedCabinet.id, { width: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Depth</Label>
                <Input
                  defaultValue={formatLength(selectedCabinet.depth, displayUnit)}
                  key={`cd-${selectedCabinet.id}-${selectedCabinet.depth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateCabinet(selectedCabinet.id, { depth: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  defaultValue={formatLength(selectedCabinet.height, displayUnit)}
                  key={`ch-${selectedCabinet.id}-${selectedCabinet.height}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateCabinet(selectedCabinet.id, { height: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              {selectedCabinet.plinthHeight !== undefined && (
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">Plinth</Label>
                  <Input
                    defaultValue={formatLength(selectedCabinet.plinthHeight, displayUnit)}
                    key={`cph-${selectedCabinet.id}-${selectedCabinet.plinthHeight}-${displayUnit}`}
                    className="h-8 text-xs font-mono"
                    onBlur={(e) =>
                      handleDimensionCommit(e.target.value, (val) =>
                        updateCabinet(selectedCabinet.id, { plinthHeight: val })
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Position</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Position X</Label>
                <Input
                  defaultValue={formatLength(selectedCabinet.position.x, displayUnit)}
                  key={`cpx-${selectedCabinet.id}-${selectedCabinet.position.x}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateCabinet(selectedCabinet.id, {
                        position: { ...selectedCabinet.position, x: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Position Z</Label>
                <Input
                  defaultValue={formatLength(selectedCabinet.position.z, displayUnit)}
                  key={`cpz-${selectedCabinet.id}-${selectedCabinet.position.z}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateCabinet(selectedCabinet.id, {
                        position: { ...selectedCabinet.position, z: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* APPLIANCE INSPECTOR */}
        {selectedType === "appliance" && selectedAppliance && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{selectedAppliance.name}</h4>
                <Badge variant="outline" className="text-[10px] capitalize font-mono mt-0.5">
                  {selectedAppliance.category}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  pushHistory(project);
                  removeAppliance(selectedAppliance.id);
                  selectObject(null, null);
                }}
                title="Delete Appliance"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  defaultValue={formatLength(selectedAppliance.dimensions.width, displayUnit)}
                  key={`apw-${selectedAppliance.id}-${selectedAppliance.dimensions.width}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateAppliance(selectedAppliance.id, {
                        dimensions: { ...selectedAppliance.dimensions, width: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Depth</Label>
                <Input
                  defaultValue={formatLength(selectedAppliance.dimensions.depth, displayUnit)}
                  key={`apd-${selectedAppliance.id}-${selectedAppliance.dimensions.depth}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateAppliance(selectedAppliance.id, {
                        dimensions: { ...selectedAppliance.dimensions, depth: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  defaultValue={formatLength(selectedAppliance.dimensions.height, displayUnit)}
                  key={`aph-${selectedAppliance.id}-${selectedAppliance.dimensions.height}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateAppliance(selectedAppliance.id, {
                        dimensions: { ...selectedAppliance.dimensions, height: val },
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Required Utilities</h5>
              <div className="flex gap-1.5 flex-wrap">
                {selectedAppliance.powerPointRequired && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                    ⚡ 16A Power
                  </Badge>
                )}
                {selectedAppliance.waterPointRequired && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">
                    🚰 Water Inlet
                  </Badge>
                )}
                {selectedAppliance.drainPointRequired && (
                  <Badge variant="secondary" className="text-[10px] bg-teal-500/10 text-teal-500 border-teal-500/30">
                    🪠 Drain Pipe
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* UTILITY POINT INSPECTOR */}
        {selectedType === "utility" && selectedUtility && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">Utility Connection</h4>
                <Badge variant="outline" className="text-[10px] capitalize font-mono mt-0.5">
                  {selectedUtility.type}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  pushHistory(project);
                  removeUtilityPoint(selectedUtility.id);
                  selectObject(null, null);
                }}
                title="Delete Utility Point"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type & Label</h5>
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Utility Type</Label>
                <select
                  value={selectedUtility.type}
                  onChange={(e) => {
                    pushHistory(project);
                    updateUtilityPoint(selectedUtility.id, {
                      type: e.target.value as "electric" | "water" | "gas" | "drain" | "chimney",
                    });
                  }}
                  className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background cursor-pointer capitalize"
                >
                  {["electric", "water", "drain", "gas", "chimney"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Notes / Description</Label>
                <Input
                  defaultValue={selectedUtility.notes ?? ""}
                  key={`un-${selectedUtility.id}-${selectedUtility.notes}`}
                  className="h-8 text-xs"
                  placeholder="e.g. Geyser 16A point"
                  onBlur={(e) => {
                    pushHistory(project);
                    updateUtilityPoint(selectedUtility.id, { notes: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Position</h5>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">X (Width)</Label>
                <Input
                  defaultValue={formatLength(selectedUtility.x, displayUnit)}
                  key={`ux-${selectedUtility.id}-${selectedUtility.x}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateUtilityPoint(selectedUtility.id, { x: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Y (Height)</Label>
                <Input
                  defaultValue={formatLength(selectedUtility.y, displayUnit)}
                  key={`uy-${selectedUtility.id}-${selectedUtility.y}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateUtilityPoint(selectedUtility.id, { y: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Z (Depth)</Label>
                <Input
                  defaultValue={formatLength(selectedUtility.z, displayUnit)}
                  key={`uz-${selectedUtility.id}-${selectedUtility.z}-${displayUnit}`}
                  className="h-8 text-xs font-mono"
                  onBlur={(e) =>
                    handleDimensionCommit(e.target.value, (val) =>
                      updateUtilityPoint(selectedUtility.id, { z: val })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE / QUICK COMPONENT NAVIGATOR */}
        {!selectedType && (
          <div className="space-y-4 py-2">
            <div className="text-center py-4 px-2 space-y-2 border border-dashed border-border rounded-lg bg-muted/20">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-foreground">Kitchen Scene Inspector</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select an element in 3D or click below to inspect and customize.
                </p>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 mt-1"
                onClick={() => openCatalog("sinks")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add from Catalog</span>
              </Button>
            </div>

            {/* Quick Object Selectors */}
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground block mb-1.5 uppercase tracking-wider font-semibold">
                  Scene Elements
                </Label>
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs justify-start gap-2"
                    onClick={() => selectObject("room", "room")}
                  >
                    <Home className="w-3.5 h-3.5 text-primary" />
                    <span>Room Floor & Walls</span>
                  </Button>

                  {project.platforms.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start gap-2"
                      onClick={() => selectObject(p.id, "platform")}
                    >
                      <Table className="w-3.5 h-3.5 text-primary" />
                      <span>{p.name} ({p.cutouts?.length ?? 0} Cutouts)</span>
                    </Button>
                  ))}

                  {project.sinks.map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start gap-2"
                      onClick={() => selectObject(s.id, "sink")}
                    >
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      <span>{s.name}</span>
                    </Button>
                  ))}

                  {project.hobs.map((h) => (
                    <Button
                      key={h.id}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start gap-2"
                      onClick={() => selectObject(h.id, "hob")}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{h.name}</span>
                    </Button>
                  ))}

                  {project.cabinets.map((c) => (
                    <Button
                      key={c.id}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start gap-2 capitalize"
                      onClick={() => selectObject(c.id, "cabinet")}
                    >
                      <Archive className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{c.type} Cabinet ({formatLength(c.width, displayUnit)})</span>
                    </Button>
                  ))}

                  {project.appliances.map((a) => (
                    <Button
                      key={a.id}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start gap-2"
                      onClick={() => selectObject(a.id, "appliance")}
                    >
                      <Refrigerator className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{a.name}</span>
                    </Button>
                  ))}

                  {project.utilityPoints.map((u) => (
                    <Button
                      key={u.id}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start gap-2 capitalize"
                      onClick={() => selectObject(u.id, "utility")}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{u.notes || `${u.type} point`}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
