"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  alignSelection,
  deleteSelection,
  distributeSelection,
  duplicateSelection,
  getReferencesForGroup,
  groupSelection,
  repeatCabinet,
  setSelectionLocked,
  ungroupSelection,
} from "@/core/geometry/sceneActions";
import { generateId } from "@/lib/id";

export function SceneSelectionActions() {
  const project = useAppStore((state) => state.project);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedType = useAppStore((state) => state.selectedType);
  const selectedObjects = useAppStore((state) => state.selectedObjects);
  const setProject = useAppStore((state) => state.setProject);
  const pushHistory = useAppStore((state) => state.pushHistory);
  const setSelectedObjects = useAppStore((state) => state.setSelectedObjects);
  const selectGroup = useAppStore((state) => state.selectGroup);
  const [repeatCount, setRepeatCount] = useState(5);
  const [repeatSpacing, setRepeatSpacing] = useState(600);

  const commit = (nextProject: typeof project) => {
    if (nextProject === project) return false;
    pushHistory(project);
    setProject(nextProject);
    return true;
  };

  const isMulti = selectedType === "multi";
  const isRoomSelection = selectedType === "room";
  const hasSelection = selectedObjects.length > 0;
  const selectedGroup = selectedType === "group"
    ? project.groups.find((group) => group.id === selectedId)
    : undefined;
  const selectableIds = selectedObjects.map((object) => object.id);
  const lockTargets = selectedObjects;
  const isLocked = (reference: (typeof selectedObjects)[number]) => {
    if (reference.type === "room") return project.room.locked === true;
    if (reference.type === "wall") return project.walls.find((item) => item.id === reference.id)?.locked === true;
    if (reference.type === "platform") return project.platforms.find((item) => item.id === reference.id)?.locked === true;
    if (reference.type === "cabinet") return project.cabinets.find((item) => item.id === reference.id)?.locked === true;
    if (reference.type === "appliance") return project.appliances.find((item) => item.id === reference.id)?.locked === true;
    if (reference.type === "sink") return project.sinks.find((item) => item.id === reference.id)?.locked === true;
    if (reference.type === "hob") return project.hobs.find((item) => item.id === reference.id)?.locked === true;
    if (reference.type === "utility") return project.utilityPoints.find((item) => item.id === reference.id)?.locked === true;
    return false;
  };
  const allLocked = lockTargets.length > 0 && lockTargets.every(isLocked);
  const movableSelection = selectedObjects.filter((reference) => !isLocked(reference));

  const runAlignment = (alignment: "left" | "center" | "right") => {
    if (commit(alignSelection(project, movableSelection, alignment))) setSelectedObjects(selectedObjects);
  };

  const runDistribution = (axis: "horizontal" | "vertical") => {
    if (commit(distributeSelection(project, movableSelection, axis))) setSelectedObjects(selectedObjects);
  };

  const duplicate = () => {
    const result = duplicateSelection(project, selectedObjects, generateId);
    if (result.references.length === 0) return;
    if (selectedGroup) {
      const copyGroup = {
        id: generateId("group"),
        name: `${selectedGroup.name} copy`,
        objectIds: result.references.map((reference) => reference.id),
      };
      if (!commit({ ...result.project, groups: [...result.project.groups, copyGroup] })) return;
      selectGroup(copyGroup.id, result.references);
    } else {
      if (!commit(result.project)) return;
      setSelectedObjects(result.references);
    }
  };

  const repeat = () => {
    const cabinet = selectedObjects.find((item) => item.type === "cabinet");
    if (!cabinet || selectedObjects.length !== 1) return;
    const result = repeatCabinet(project, cabinet.id, repeatCount, repeatSpacing, generateId);
    if (!commit(result.project)) return;
    setSelectedObjects([cabinet, ...result.references]);
  };

  const makeGroup = () => {
    if (!isMulti) return;
    const name = `Group ${String(project.groups.length + 1).padStart(2, "0")}`;
    const nextProject = groupSelection(project, name, selectableIds, generateId("group"));
    const group = nextProject.groups.find((item) => !project.groups.some((existing) => existing.id === item.id));
    if (!group || !commit(nextProject)) return;
    selectGroup(group.id, selectedObjects);
  };

  const ungroup = () => {
    if (!selectedGroup || !commit(ungroupSelection(project, selectedGroup.id))) return;
    setSelectedObjects(selectedObjects);
  };

  const toggleLock = () => {
    if (commit(setSelectionLocked(project, lockTargets, !allLocked))) setSelectedObjects(selectedObjects);
  };

  const removeSelection = () => {
    if (!commit(deleteSelection(project, selectedObjects))) return;
    setSelectedObjects([]);
  };

  return (
    <div className="space-y-3">
      {hasSelection && (
        <section className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold">{selectedGroup?.name ?? `${selectedObjects.length} selected`}</h4>
            <span className="text-[10px] text-muted-foreground">{selectedObjects.length} items</span>
          </div>

          {isRoomSelection ? (
            <Button variant="outline" size="sm" className="h-7 w-full text-[10px]" onClick={toggleLock}>{allLocked ? "Unlock floor" : "Lock floor"}</Button>
          ) : <>
          {selectedObjects.length > 1 && <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-muted-foreground">Align</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["left", "center", "right"] as const).map((alignment) => (
                <Button key={alignment} variant="outline" size="sm" className="h-7 px-1 text-[10px] capitalize" onClick={() => runAlignment(alignment)}>
                  {alignment}
                </Button>
              ))}
            </div>
          </div>}

          {selectedObjects.length > 2 && <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-muted-foreground">Distribute</Label>
            <div className="grid grid-cols-2 gap-1">
              <Button variant="outline" size="sm" className="h-7 px-1 text-[10px]" onClick={() => runDistribution("horizontal")}>Horizontal</Button>
              <Button variant="outline" size="sm" className="h-7 px-1 text-[10px]" onClick={() => runDistribution("vertical")}>Vertical</Button>
            </div>
          </div>}

          <div className="grid grid-cols-2 gap-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={duplicate}>Duplicate</Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={toggleLock}>{allLocked ? "Unlock" : "Lock"}</Button>
            {isMulti ? (
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={makeGroup}>Group</Button>
            ) : selectedGroup ? (
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={ungroup}>Ungroup</Button>
            ) : <span />}
            <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={removeSelection}>Delete</Button>
          </div>

          {selectedObjects.length === 1 && selectedObjects[0].type === "cabinet" && !allLocked && (
            <div className="space-y-1.5 border-t border-border pt-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Repeat Cabinet Row</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[10px] text-muted-foreground">
                  Count
                  <Input type="number" min="2" max="100" value={repeatCount} onChange={(event) => setRepeatCount(Math.max(2, Math.min(100, Number(event.currentTarget.value) || 2)))} className="h-7 text-xs" />
                </label>
                <label className="space-y-1 text-[10px] text-muted-foreground">
                  Spacing (mm)
                  <Input type="number" min="1" value={repeatSpacing} onChange={(event) => setRepeatSpacing(Math.max(1, Number(event.currentTarget.value) || 1))} className="h-7 text-xs" />
                </label>
              </div>
              <Button variant="secondary" size="sm" className="h-7 w-full text-[10px]" onClick={repeat}>Repeat</Button>
            </div>
          )}
          </>}
        </section>
      )}

      {project.groups.length > 0 && (
        <section className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Groups</Label>
          {project.groups.map((group) => (
            <Button
              key={group.id}
              variant={selectedGroup?.id === group.id ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-full justify-between px-2 text-[10px]"
              onClick={() => selectGroup(group.id, getReferencesForGroup(project, group.id))}
            >
              <span className="truncate">{group.name}</span>
              <span>{group.objectIds.length}</span>
            </Button>
          ))}
        </section>
      )}
    </div>
  );
}