"use client";

import React, { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { estimateProject, formatCurrency } from "@/core/estimation";
import type { LineItem } from "@/core/estimation";
import {
  X,
  ChevronDown,
  ChevronRight,
  Calculator,
  FileText,
  Tag,
  Percent,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { PricingConfig } from "@/types/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  material:     { label: "Material",     color: "text-violet-600 dark:text-violet-400" },
  edge:         { label: "Edge",         color: "text-blue-600 dark:text-blue-400" },
  backsplash:   { label: "Backsplash",   color: "text-cyan-600 dark:text-cyan-400" },
  cutout:       { label: "Cutout",       color: "text-orange-500 dark:text-orange-400" },
  cabinet:      { label: "Cabinet",      color: "text-emerald-600 dark:text-emerald-400" },
  installation: { label: "Installation", color: "text-slate-600 dark:text-slate-400" },
  labour:       { label: "Labour",       color: "text-slate-500 dark:text-slate-400" },
  polish:       { label: "Polish",       color: "text-indigo-500 dark:text-indigo-400" },
  discount:     { label: "Discount",     color: "text-green-600 dark:text-green-400" },
  tax:          { label: "GST",          color: "text-rose-500 dark:text-rose-400" },
};

// ── Line item row ─────────────────────────────────────────────────────────────
function LineItemRow({ item, currency }: { item: LineItem; currency: string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_LABELS[item.category] ?? { label: item.category, color: "text-foreground" };

  return (
    <div
      className={`border-b border-border/50 last:border-0 ${item.note ? "cursor-pointer" : ""}`}
      onClick={() => item.note && setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 py-2 px-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider w-20 shrink-0 ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="flex-1 text-[11px] text-foreground truncate min-w-0">
          {item.description}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground w-16 text-right shrink-0">
          {item.qty} {item.unit}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground w-20 text-right shrink-0">
          @ {formatCurrency(item.unitRate, currency)}
        </span>
        <span className={`text-[11px] font-semibold font-mono w-24 text-right shrink-0 ${
          item.amount < 0 ? "text-green-600 dark:text-green-400" : "text-foreground"
        }`}>
          {item.amount < 0 ? `(${formatCurrency(-item.amount, currency)})` : formatCurrency(item.amount, currency)}
        </span>
        {item.note && (
          <span className="text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </div>
      {item.note && expanded && (
        <div className="px-3 pb-2 text-[10px] text-muted-foreground italic pl-[5.5rem]">
          {item.note}
        </div>
      )}
    </div>
  );
}

// ── Platform section ──────────────────────────────────────────────────────────
function PlatformSection({
  pe,
  currency,
}: {
  pe: ReturnType<typeof estimateProject>["platforms"][0];
  currency: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left cursor-pointer"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
        <span className="text-xs font-semibold text-foreground flex-1">{pe.platformName}</span>
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span>{pe.billableAreaSqFt} sq ft</span>
          <span>{pe.finishedEdgeRunFt} run ft</span>
          {pe.cutoutCount > 0 && <span>{pe.cutoutCount} cutouts</span>}
        </div>
        <span className="text-xs font-bold text-foreground ml-2">{formatCurrency(pe.subtotal, currency)}</span>
      </button>

      {open && (
        <div className="divide-y divide-border/0">
          {pe.lineItems.map((item) => (
            <LineItemRow key={item.id} item={item} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pricing Config Editor ─────────────────────────────────────────────────────
function PricingConfigEditor({
  pricing,
  onChange,
}: {
  pricing: PricingConfig;
  onChange: (patch: Partial<PricingConfig>) => void;
}) {
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">Bill on</Label>
          <select
            className="w-full mt-1 h-7 rounded-md border border-input bg-background px-2 text-xs"
            value={pricing.billOn}
            onChange={(e) => onChange({ billOn: e.target.value as "gross" | "net" })}
          >
            <option value="gross">Gross area</option>
            <option value="net">Net + waste</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Waste %</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.wastePercent}
            min={0}
            max={30}
            onChange={(e) => onChange({ wastePercent: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">Edge rate (₹/run ft)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.edgePerRunningFt}
            onChange={(e) => onChange({ edgePerRunningFt: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Backsplash (₹/sq ft)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.backsplashPerSqFt}
            onChange={(e) => onChange({ backsplashPerSqFt: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Sink cutout (₹)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.cutoutRates["sink"] ?? 0}
            onChange={(e) => onChange({ cutoutRates: { ...pricing.cutoutRates, sink: Number(e.target.value) } })}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Hob cutout (₹)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.cutoutRates["hob"] ?? 0}
            onChange={(e) => onChange({ cutoutRates: { ...pricing.cutoutRates, hob: Number(e.target.value) } })}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Custom cutout (₹)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.cutoutRates["custom"] ?? 0}
            onChange={(e) => onChange({ cutoutRates: { ...pricing.cutoutRates, custom: Number(e.target.value) } })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">Installation (₹)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.installation}
            onChange={(e) => onChange({ installation: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Labour (₹)</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.labour}
            onChange={(e) => onChange({ labour: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Discount type</Label>
          <select
            className="w-full mt-1 h-7 rounded-md border border-input bg-background px-2 text-xs"
            value={pricing.discount.type}
            onChange={(e) => onChange({ discount: { ...pricing.discount, type: e.target.value as "percent" | "flat" } })}
          >
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Discount value</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.discount.value}
            min={0}
            onChange={(e) => onChange({ discount: { ...pricing.discount, value: Number(e.target.value) } })}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">GST %</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            value={pricing.taxPercent}
            min={0}
            max={28}
            onChange={(e) => onChange({ taxPercent: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main EstimationPanel ──────────────────────────────────────────────────────
export function EstimationPanel() {
  const project = useAppStore((state) => state.project);
  const estimationOpen = useAppStore((state) => state.estimationOpen);
  const setEstimationOpen = useAppStore((state) => state.setEstimationOpen);
  const pricing = useAppStore((state) => state.pricing);
  const updatePricing = useAppStore((state) => state.updatePricing);
  const sampleBannerDismissed = useAppStore((state) => state.sampleBannerDismissed);

  const [showPricingEditor, setShowPricingEditor] = useState(false);

  const result = useMemo(() => estimateProject(project, pricing), [project, pricing]);

  if (!estimationOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={() => setEstimationOpen(false)}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[680px] max-w-full bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Cost Estimation</p>
              <p className="text-[10px] text-muted-foreground">
                {project.name} · {project.platforms.length} platform{project.platforms.length !== 1 ? "s" : ""}
                {project.cabinets.length > 0 ? ` · ${project.cabinets.length} cabinets` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowPricingEditor(!showPricingEditor)}
            >
              <Tag className="w-3 h-3" />
              {showPricingEditor ? "Hide Rates" : "Edit Rates"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEstimationOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sample Price Warning */}
        {!sampleBannerDismissed && (
          <div className="flex items-center gap-2 px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              Using <strong>sample placeholder rates</strong> &mdash; click &ldquo;Edit Rates&rdquo; to set your actual prices before quoting.
            </p>
          </div>
        )}

        {/* Pricing Editor (collapsible) */}
        {showPricingEditor && (
          <div className="border-b border-border px-5 py-4 shrink-0 bg-muted/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Rate Configuration
            </p>
            <PricingConfigEditor pricing={pricing} onChange={updatePricing} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {project.platforms.length === 0 && project.cabinets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
              <Calculator className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">No platforms or cabinets yet</p>
              <p className="text-xs max-w-[220px]">
                Add countertop platforms and cabinets in the editor to generate a cost estimate.
              </p>
            </div>
          ) : (
            <>
              {/* Per-platform sections */}
              {result.platforms.map((pe) => (
                <PlatformSection key={pe.platformId} pe={pe} currency={result.currency} />
              ))}

              {/* Cabinets section */}
              {result.cabinetLineItems.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Cabinets</span>
                    <span>{formatCurrency(result.cabinetLineItems.reduce((s, l) => s + l.amount, 0), result.currency)}</span>
                  </div>
                  {result.cabinetLineItems.map((item) => (
                    <LineItemRow key={item.id} item={item} currency={result.currency} />
                  ))}
                </div>
              )}

              {/* Installation & Labour */}
              {result.installationLineItems.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Installation & Labour</span>
                    <span>{formatCurrency(result.installationLineItems.reduce((s, l) => s + l.amount, 0), result.currency)}</span>
                  </div>
                  {result.installationLineItems.map((item) => (
                    <LineItemRow key={item.id} item={item} currency={result.currency} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Total Footer */}
        <div className="border-t border-border shrink-0 bg-card">
          {/* Summary rows */}
          <div className="px-5 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subtotal (before tax)</span>
              <span className="font-mono">{formatCurrency(result.subtotalBeforeDiscountAndTax, result.currency)}</span>
            </div>
            {result.discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Discount
                </span>
                <span className="font-mono">({formatCurrency(result.discountAmount, result.currency)})</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>GST @ {pricing.taxPercent}%</span>
              <span className="font-mono">{formatCurrency(result.taxAmount, result.currency)}</span>
            </div>
          </div>

          <Separator />

          {/* Grand total */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Grand Total (incl. GST)</p>
              {result.grandTotal !== result.grandTotalRounded && (
                <p className="text-[10px] text-muted-foreground italic">
                  Rounded to nearest ₹{pricing.roundTo}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary tracking-tight">
                {formatCurrency(result.grandTotalRounded, result.currency)}
              </p>
              {sampleBannerDismissed && (
                <div className="flex items-center gap-1 mt-0.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[10px]">Using your rates</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => {
                const summary = [
                  `Project: ${project.name}`,
                  `Customer: ${project.customer?.name ?? "—"}`,
                  ``,
                  ...result.lineItems.map(
                    (li) =>
                      `${li.description.padEnd(50)} ${li.qty} ${li.unit} @ ${Math.round(li.unitRate)} = ${Math.round(li.amount)}`
                  ),
                  ``,
                  `Subtotal: ${Math.round(result.subtotalBeforeDiscountAndTax)}`,
                  result.discountAmount > 0 ? `Discount: (${Math.round(result.discountAmount)})` : "",
                  `GST ${pricing.taxPercent}%: ${Math.round(result.taxAmount)}`,
                  `GRAND TOTAL: ${result.grandTotalRounded}`,
                ]
                  .filter(Boolean)
                  .join("\n");

                const blob = new Blob([summary], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.name.replace(/\s+/g, "-")}-estimate.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              Export TXT
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => {
                // Print the estimate (Phase 6: PDF will use proper template)
                window.print();
              }}
            >
              <Calculator className="w-3.5 h-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
