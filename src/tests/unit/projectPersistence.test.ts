import { afterEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe("project persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("restores changed room dimensions after a refresh", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.resetModules();

    const initialStore = await import("@/store");
    initialStore.useAppStore.getState().updateRoom({ length: 4200, width: 3300 });

    const savedProject = JSON.parse(storage.getItem(initialStore.PROJECT_STORAGE_KEY) ?? "{}");
    expect(savedProject.state.project.room).toMatchObject({ length: 4200, width: 3300 });

    vi.resetModules();
    const refreshedStore = await import("@/store");
    await refreshedStore.useAppStore.persist.rehydrate();

    expect(refreshedStore.useAppStore.getState().project.room).toMatchObject({
      length: 4200,
      width: 3300,
    });
  });
});
