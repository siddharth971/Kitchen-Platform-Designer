import type { StateCreator } from "zustand";
import { type BusinessSettings, DEFAULT_BUSINESS_SETTINGS } from "@/types/business";

const STORAGE_KEY = "kpd_business_settings";

function loadSavedSettings(): BusinessSettings {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BUSINESS_SETTINGS;
    return { ...DEFAULT_BUSINESS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BUSINESS_SETTINGS;
  }
}

function saveSettings(settings: BusinessSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to persist business settings to localStorage:", e);
  }
}

export interface BusinessSlice {
  business: BusinessSettings;
  updateBusiness: (patch: Partial<BusinessSettings>) => void;
  resetBusiness: () => void;
}

export const createBusinessSlice: StateCreator<BusinessSlice, [], [], BusinessSlice> = (set) => ({
  business: loadSavedSettings(),
  updateBusiness: (patch) =>
    set((state) => {
      const next = { ...state.business, ...patch };
      saveSettings(next);
      return { business: next };
    }),
  resetBusiness: () =>
    set(() => {
      saveSettings(DEFAULT_BUSINESS_SETTINGS);
      return { business: DEFAULT_BUSINESS_SETTINGS };
    }),
});
