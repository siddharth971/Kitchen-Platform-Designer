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

export interface SelectionSlice {
  selectedId: string | null;
  selectedType: SelectableObjectType | null;
  selectedSubId: string | null; // e.g. openingId within a wall
  selectObject: (id: string | null, type?: SelectableObjectType | null, subId?: string | null) => void;
  clearSelection: () => void;
}

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (set) => ({
  selectedId: "room", // default select the room so properties panel is immediately helpful
  selectedType: "room",
  selectedSubId: null,

  selectObject: (id, type = null, subId = null) =>
    set({
      selectedId: id,
      selectedType: type,
      selectedSubId: subId,
    }),

  clearSelection: () =>
    set({
      selectedId: null,
      selectedType: null,
      selectedSubId: null,
    }),
});
