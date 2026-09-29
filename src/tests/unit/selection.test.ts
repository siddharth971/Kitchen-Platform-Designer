import { describe, expect, it } from "vitest";
import { createStore } from "zustand";
import { createSelectionSlice } from "@/store/selectionSlice";

describe("multi-object selection", () => {
  it("toggles Ctrl-click selections while preserving each stable ID", () => {
    const store = createStore(createSelectionSlice);
    store.getState().selectObject("cab-1", "cabinet");
    store.getState().toggleSelectedObject({ id: "cab-2", type: "cabinet" });

    expect(store.getState().selectedType).toBe("multi");
    expect(store.getState().selectedObjects.map((item) => item.id)).toEqual(["cab-1", "cab-2"]);

    store.getState().toggleSelectedObject({ id: "cab-1", type: "cabinet" });
    expect(store.getState().selectedId).toBe("cab-2");
    expect(store.getState().selectedObjects).toEqual([{ id: "cab-2", type: "cabinet" }]);
  });

  it("selects a group without replacing its member IDs", () => {
    const store = createStore(createSelectionSlice);
    const members = [
      { id: "cab-1", type: "cabinet" as const },
      { id: "sink-1", type: "sink" as const },
    ];
    store.getState().selectGroup("group-1", members);

    expect(store.getState().selectedType).toBe("group");
    expect(store.getState().selectedId).toBe("group-1");
    expect(store.getState().selectedObjects).toEqual(members);
  });
});