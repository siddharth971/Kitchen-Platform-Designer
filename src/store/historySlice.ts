import type { StateCreator } from "zustand";
import type { Project } from "@/types/project";

export interface HistorySlice {
  past: Project[];
  future: Project[];
  pushHistory: (currentState: Project) => void;
  undo: () => Project | null;
  redo: () => Project | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

const MAX_HISTORY_STEPS = 50;

export const createHistorySlice: StateCreator<HistorySlice, [], [], HistorySlice> = (set, get) => ({
  past: [],
  future: [],

  pushHistory: (currentState) => {
    set((state) => ({
      past: [...state.past.slice(-MAX_HISTORY_STEPS + 1), JSON.parse(JSON.stringify(currentState))],
      future: [],
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      past: newPast,
      future: [previous, ...future],
    });

    return previous;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, next],
      future: newFuture,
    });

    return next;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearHistory: () => set({ past: [], future: [] }),
});
