import type { StateCreator } from "zustand";

export type SelectableObjectType =
  | "room"
  | "wall"
  | "opening"
  | "platform"
  | "cabinet"
  | "appliance"
  | "sink"
  | "hob"
  | "utility";

export interface SelectedObjectRef {
  id: string;
  type: SelectableObjectType;
  subId?: string | null;
}

export interface SelectionSlice {
  selectedId: string | null;
  selectedType: SelectableObjectType | "multi" | "group" | null;
  selectedSubId: string | null; // e.g. openingId within a wall
  selectedObjects: SelectedObjectRef[];
  selectObject: (id: string | null, type?: SelectableObjectType | null, subId?: string | null) => void;
  setSelectedObjects: (objects: SelectedObjectRef[]) => void;
  toggleSelectedObject: (object: SelectedObjectRef) => void;
  selectGroup: (groupId: string, objects: SelectedObjectRef[]) => void;
  clearSelection: () => void;
}

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (set) => ({
  selectedId: "room", // default select the room so properties panel is immediately helpful
  selectedType: "room",
  selectedSubId: null,
  selectedObjects: [{ id: "room", type: "room" }],

  selectObject: (id, type = null, subId = null) =>
    set({
      selectedId: id,
      selectedType: type,
      selectedSubId: subId,
      selectedObjects: id && type ? [{ id, type, subId }] : [],
    }),

  setSelectedObjects: (objects) => set(() => {
    const unique = objects.filter((object, index) => objects.findIndex((candidate) => candidate.id === object.id) === index);
    if (unique.length === 0) {
      return { selectedId: null, selectedType: null, selectedSubId: null, selectedObjects: [] };
    }
    if (unique.length === 1) {
      return {
        selectedId: unique[0].id,
        selectedType: unique[0].type,
        selectedSubId: unique[0].subId ?? null,
        selectedObjects: unique,
      };
    }
    return { selectedId: unique[0].id, selectedType: "multi", selectedSubId: null, selectedObjects: unique };
  }),

  toggleSelectedObject: (object) => set((state) => {
    const exists = state.selectedObjects.some((selected) => selected.id === object.id);
    const objects = exists
      ? state.selectedObjects.filter((selected) => selected.id !== object.id)
      : [...state.selectedObjects, object];
    if (objects.length === 0) {
      return { selectedId: null, selectedType: null, selectedSubId: null, selectedObjects: [] };
    }
    if (objects.length === 1) {
      return {
        selectedId: objects[0].id,
        selectedType: objects[0].type,
        selectedSubId: objects[0].subId ?? null,
        selectedObjects: objects,
      };
    }
    return { selectedId: object.id, selectedType: "multi", selectedSubId: null, selectedObjects: objects };
  }),

  selectGroup: (groupId, objects) => set({
    selectedId: groupId,
    selectedType: "group",
    selectedSubId: null,
    selectedObjects: objects,
  }),

  clearSelection: () =>
    set({
      selectedId: null,
      selectedType: null,
      selectedSubId: null,
      selectedObjects: [],
    }),
});
