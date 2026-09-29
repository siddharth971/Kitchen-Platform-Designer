import type { StateCreator } from "zustand";
import type { PricingConfig } from "@/types/pricing";
import { DEFAULT_PRICING_CONFIG } from "@/data/presets";

export interface PricingSlice {
  pricing: PricingConfig;
  updatePricing: (patch: Partial<PricingConfig>) => void;
  resetPricing: () => void;
}

export const createPricingSlice: StateCreator<PricingSlice, [], [], PricingSlice> = (set) => ({
  pricing: { ...DEFAULT_PRICING_CONFIG },

  updatePricing: (patch) =>
    set((state) => ({
      pricing: { ...state.pricing, ...patch },
    })),

  resetPricing: () =>
    set({ pricing: { ...DEFAULT_PRICING_CONFIG } }),
});
