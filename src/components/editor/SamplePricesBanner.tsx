"use client";

import React from "react";
import { useAppStore } from "@/store";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SamplePricesBanner() {
  const sampleBannerDismissed = useAppStore((state) => state.sampleBannerDismissed);
  const dismissSampleBanner = useAppStore((state) => state.dismissSampleBanner);

  if (sampleBannerDismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-900 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong className="font-semibold">Sample Prices:</strong> All rates, clearances, and costs are placeholder values. Configure your own workshop rates before quoting.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[11px] border-amber-500/30 hover:bg-amber-500/20"
          onClick={() => {
            alert("Pricing configuration will be editable in Phase 5. Rates are currently sample placeholders.");
          }}
        >
          View Rates
        </Button>
        <button
          onClick={dismissSampleBanner}
          className="text-amber-700 dark:text-amber-300 hover:opacity-80 p-0.5 rounded"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
