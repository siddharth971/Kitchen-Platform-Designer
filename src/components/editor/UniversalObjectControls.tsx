"use client";

import React, { useState } from "react";
import { Eye, LockKeyhole } from "lucide-react";
import { parseLength } from "@/core/units";
import { SAMPLE_MATERIALS } from "@/data/presets";
import { useAppStore } from "@/store";
import type {
  ApplianceInstance,
  Cabinet,
  CountertopPlatform,
  EditableObjectProperties,
  HobInstance,
  SinkInstance,
} from "@/types/kitchen";
import type { Point3D } from "@/types/geometry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type EditableSelection =
  | { kind: "platform"; object: CountertopPlatform }
  | { kind: "cabinet"; object: Cabinet }
  | { kind: "appliance"; object: ApplianceInstance }
  | { kind: "sink"; object: SinkInstance }
  | { kind: "hob"; object: HobInstance };

type TransformPatch = Partial<EditableObjectProperties> & { name?: string };

export function UniversalObjectControls() {
  const project = useAppStore((state) => state.project);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedType = useAppStore((state) => state.selectedType);
  const pushHistory = useAppStore((state) => state.pushHistory);
  const updatePlatform = useAppStore((state) => state.updatePlatform);
  const updateCabinet = useAppStore((state) => state.updateCabinet);
  const updateAppliance = useAppStore((state) => state.updateAppliance);
  const updateSink = useAppStore((state) => state.updateSink);
  const updateHob = useAppStore((state) => state.updateHob);
  const [error, setError] = useState<string | null>(null);

  if (!selectedId) return null;

  const selection: EditableSelection | null =
    selectedType === "platform"
      ? project.platforms.find((item) => item.id === selectedId)
        ? { kind: "platform", object: project.platforms.find((item) => item.id === selectedId)! }
        : null
      : selectedType === "cabinet"
        ? project.cabinets.find((item) => item.id === selectedId)
          ? { kind: "cabinet", object: project.cabinets.find((item) => item.id === selectedId)! }
          : null
        : selectedType === "appliance"
          ? project.appliances.find((item) => item.id === selectedId)
            ? { kind: "appliance", object: project.appliances.find((item) => item.id === selectedId)! }
            : null
          : selectedType === "sink"
            ? project.sinks.find((item) => item.id === selectedId)
              ? { kind: "sink", object: project.sinks.find((item) => item.id === selectedId)! }
              : null
            : selectedType === "hob"
              ? project.hobs.find((item) => item.id === selectedId)
                ? { kind: "hob", object: project.hobs.find((item) => item.id === selectedId)! }
                : null
              : null;

  if (!selection) return null;

  const object = selection.object;
  const getObjectUpdate = () => (patch: TransformPatch) => {
    switch (selection.kind) {
      case "platform":
        updatePlatform(object.id, patch as Partial<CountertopPlatform>);
        break;
      case "cabinet":
        updateCabinet(object.id, patch as Partial<Cabinet>);
        break;
      case "appliance":
        updateAppliance(object.id, patch as Partial<ApplianceInstance>);
        break;
      case "sink":
        updateSink(object.id, patch as Partial<SinkInstance>);
        break;
      case "hob":
        updateHob(object.id, patch as Partial<HobInstance>);
        break;
    }
  };
  const updateObject = getObjectUpdate();
  const recordChange = (patch: TransformPatch) => {
    pushHistory(project);
    updateObject(patch);
  };
  const isPlatform = selection.kind === "platform";
  const currentPosition: Point3D = isPlatform
    ? { x: selection.object.position.x, y: selection.object.workingHeight, z: selection.object.position.z }
    : selection.object.position;
  const currentSize = isPlatform
    ? {
        width: selection.object.shape === "straight" ? selection.object.length : selection.object.lengthA,
        depth: selection.object.shape === "straight" ? selection.object.depth : selection.object.lengthB,
        height: selection.object.slabThickness,
      }
    : selection.kind === "appliance"
      ? {
          width: selection.object.dimensions.width,
          depth: selection.object.dimensions.depth,
          height: selection.object.dimensions.height,
        }
      : {
          width: selection.object.width,
          depth: selection.object.depth,
          height: selection.object.height,
        };
  const currentMaterialId = object.materialId;
  const objectName = selection.kind === "cabinet"
    ? selection.object.name || `${selection.object.type} cabinet`
    : selection.object.name;
  const rotation = object.rotation ?? { x: 0, y: 0, z: 0 };
  const locked = object.locked === true;

  const updateAxis = (axis: "x" | "y" | "z", value: number) => {
    if (selection.kind === "platform") {
      if (axis === "y") recordChange({ workingHeight: value } as TransformPatch);
      else recordChange({ position: { ...selection.object.position, [axis]: value } } as TransformPatch);
      return;
    }
    recordChange({ position: { ...selection.object.position, [axis]: value } } as TransformPatch);
  };

  const updateSize = (dimension: "width" | "depth" | "height", value: number) => {
    if (selection.kind === "platform") {
      if (dimension === "width") {
        recordChange(selection.object.shape === "straight"
          ? { length: value } as TransformPatch
          : { lengthA: value } as TransformPatch);
      } else if (dimension === "depth") {
        recordChange(selection.object.shape === "straight"
          ? { depth: value } as TransformPatch
          : { lengthB: value } as TransformPatch);
      } else {
        recordChange({ slabThickness: value } as TransformPatch);
      }
      return;
    }
    if (selection.kind === "appliance") {
      recordChange({ dimensions: { ...selection.object.dimensions, [dimension]: value } } as TransformPatch);
      return;
    }
    recordChange({ [dimension]: value } as TransformPatch);
  };

  const commitLength = (text: string, commit: (value: number) => void, positive = false) => {
    try {
      const value = parseLength(text, "mm");
      if (positive && value <= 0) throw new Error("Dimension must be positive");
      commit(value);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid value");
    }
  };

  const updateRotation = (axis: "x" | "y" | "z", value: number) => {
    recordChange({ rotation: { ...rotation, [axis]: value } });
  };

  const sectionTitle = (title: string) => (
    <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h5>
  );

  const numericField = (
    label: string,
    value: number,
    key: string,
    commit: (text: string) => void,
    suffix?: string
  ) => (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className="w-3 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <Input
        defaultValue={String(value)}
        key={`${key}-${value}`}
        type="number"
        step="any"
        disabled={locked}
        className="h-7 min-w-0 px-1.5 text-[11px] font-mono"
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      {suffix && <span className="shrink-0 text-[10px] text-muted-foreground">{suffix}</span>}
    </label>
  );

  const lengthField = (axis: "x" | "y" | "z") => numericField(
    axis.toUpperCase(),
    currentPosition[axis],
    `position-${axis}-${object.id}`,
    (text) => commitLength(text, (value) => updateAxis(axis, value)),
    "mm"
  );
  const sizeField = (axis: "width" | "depth" | "height", label: string) => numericField(
    label,
    currentSize[axis],
    `size-${axis}-${object.id}`,
    (text) => commitLength(text, (value) => updateSize(axis, value), true),
    "mm"
  );

  return (
    <section className="space-y-3 rounded-md border border-border/70 bg-background/60 p-3">
      <div className="space-y-2">
        {sectionTitle("Select Object")}
        <div className="flex items-center gap-2">
          <Label htmlFor={`object-name-${object.id}`} className="w-12 shrink-0 text-[10px] text-muted-foreground">Name</Label>
          <Input
            id={`object-name-${object.id}`}
            defaultValue={objectName}
            key={`${object.id}-${objectName}`}
            disabled={locked}
            className="h-7 text-[11px]"
            onBlur={(event) => {
              if (event.currentTarget.value === objectName) return;
              pushHistory(project);
              updateObject({ name: event.currentTarget.value });
            }}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        {sectionTitle("Transform")}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground">Position</span>
          {lengthField("x")}
          {lengthField("y")}
          {lengthField("z")}
        </div>
        {!isPlatform && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground">Rotation</span>
            <div className="grid grid-cols-3 gap-1.5">
              {numericField("X", rotation.x, `rotation-x-${object.id}`, (text) => updateRotation("x", Number(text) || 0), "°")}
              {numericField("Y", rotation.y, `rotation-y-${object.id}`, (text) => updateRotation("y", Number(text) || 0), "°")}
              {numericField("Z", rotation.z, `rotation-z-${object.id}`, (text) => updateRotation("z", Number(text) || 0), "°")}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground">Size</span>
          {sizeField("width", "W")}
          {sizeField("depth", "D")}
          {sizeField("height", "H")}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        {sectionTitle("Appearance")}
        <div className="grid grid-cols-[52px_1fr] items-center gap-2">
          <Label className="text-[10px] text-muted-foreground">Material</Label>
          <select
            value={currentMaterialId ?? ""}
            disabled={locked}
            onChange={(event) => recordChange({ materialId: event.currentTarget.value, textureId: undefined } as TransformPatch)}
            className="h-7 min-w-0 rounded-md border border-border bg-background px-2 text-[11px] disabled:opacity-50"
          >
            {selection.kind !== "platform" && <option value="">Default finish</option>}
            {SAMPLE_MATERIALS.map((material) => (
              <option key={material.id} value={material.id}>{material.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        {sectionTitle("Visibility")}
        <div className="flex items-center justify-between">
          <Label htmlFor={`visible-${object.id}`} className="flex items-center gap-1.5 text-[11px]">
            <Eye className="size-3.5 text-muted-foreground" /> Visible
          </Label>
          <Switch
            id={`visible-${object.id}`}
            checked={object.visible !== false}
            onCheckedChange={(visible) => recordChange({ visible })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor={`locked-${object.id}`} className="flex items-center gap-1.5 text-[11px]">
            <LockKeyhole className="size-3.5 text-muted-foreground" /> Lock
          </Label>
          <Switch
            id={`locked-${object.id}`}
            checked={locked}
            onCheckedChange={(lockedValue) => recordChange({ locked: lockedValue })}
          />
        </div>
      </div>

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </section>
  );
}