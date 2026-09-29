"use client";

import React, { useMemo, useState, useRef } from "react";
import { useAppStore } from "@/store";
import { estimateProject, formatCurrency } from "@/core/estimation";
import {
  generateCutList,
  computeSlabNesting,
  generateFabricationSvg,
  buildWhatsAppSummary,
} from "@/core/fabrication";
import { runProjectValidation } from "@/core/validation";
import { serializeProject, validateAndMigrateProject } from "@/core/export";
import {
  X,
  FileText,
  Compass,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  Building,
  AlertTriangle,
  ShieldCheck,
  Upload,
  Camera,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExportModal() {
  const exportModalOpen = useAppStore((state) => state.exportModalOpen);
  const exportModalTab = useAppStore((state) => state.exportModalTab);
  const setExportModalOpen = useAppStore((state) => state.setExportModalOpen);
  const openExportModal = useAppStore((state) => state.openExportModal);
  const setValidationDrawerOpen = useAppStore((state) => state.setValidationDrawerOpen);

  const project = useAppStore((state) => state.project);
  const setProject = useAppStore((state) => state.setProject);
  const updateCustomer = useAppStore((state) => state.updateCustomer);
  const updateProjectName = useAppStore((state) => state.updateProjectName);

  const pricing = useAppStore((state) => state.pricing);
  const business = useAppStore((state) => state.business);
  const updateBusiness = useAppStore((state) => state.updateBusiness);
  const resetBusiness = useAppStore((state) => state.resetBusiness);

  const activeTab = exportModalTab || "quote";
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [savedSettingsFeedback, setSavedSettingsFeedback] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculations
  const estimation = useMemo(() => estimateProject(project, pricing), [project, pricing]);
  const cutList = useMemo(() => generateCutList(project), [project]);
  const nesting = useMemo(() => computeSlabNesting(cutList), [cutList]);
  const validationReport = useMemo(() => runProjectValidation(project), [project]);

  const fabricationSvg = useMemo(
    () =>
      generateFabricationSvg(project, cutList, {
        customerName: project.customer?.name,
        projectName: project.name,
      }),
    [project, cutList]
  );

  const waSummary = useMemo(
    () => buildWhatsAppSummary(project, estimation, business),
    [project, estimation, business]
  );

  if (!exportModalOpen) return null;

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleCopyQuote = () => {
    const text = [
      `QUOTATION: ${project.name}`,
      `Customer: ${project.customer?.name ?? "—"}`,
      `Date: ${new Date().toLocaleDateString("en-IN")}`,
      ``,
      ...estimation.lineItems.map(
        (li) =>
          `${li.description.padEnd(40)} ${li.qty} ${li.unit} @ ${Math.round(li.unitRate)} = ${Math.round(li.amount)}`
      ),
      ``,
      `Subtotal: ${Math.round(estimation.subtotalBeforeDiscountAndTax)}`,
      estimation.discountAmount > 0 ? `Discount: -${Math.round(estimation.discountAmount)}` : "",
      estimation.taxAmount > 0 ? `GST (${pricing.taxPercent}%): +${Math.round(estimation.taxAmount)}` : "",
      `GRAND TOTAL: ${formatCurrency(estimation.grandTotalRounded, estimation.currency)}`,
      ``,
      `Estimate only. Final measurement and price are confirmed on site.`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const handleCopyWa = () => {
    navigator.clipboard.writeText(waSummary);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([fabricationSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fabrication-drawing-${sanitizeFilename(project.name)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const data = serializeProject(project);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(project.name)}.kpd.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCapturePng = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      alert("3D Viewport canvas not found.");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `3d-view-${sanitizeFilename(project.name)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Canvas export failed:", e);
      alert("Could not capture canvas snapshot. Canvas might be tainted or busy.");
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateAndMigrateProject(parsed);

        if (!result.success || !result.project) {
          setImportError(result.error || "Invalid project file format.");
          return;
        }

        setProject(result.project);
        setImportSuccess(`Successfully loaded "${result.project.name}"`);
        setTimeout(() => setImportSuccess(null), 4000);
      } catch (err: unknown) {
        setImportError(
          err instanceof Error
            ? `Failed to parse JSON file: ${err.message}`
            : "Failed to parse JSON file: Invalid format"
        );
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  const openWhatsAppDirect = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(waSummary)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Export &amp; Quotation Hub</h2>
              <p className="text-xs text-muted-foreground">
                Generate client estimates, stone fabrication cut lists, and save project data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setExportModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Validation Warning Alert (if errors exist) */}
        {!validationReport.isValid && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between shrink-0 text-xs text-amber-900 dark:text-amber-200 print:hidden">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Pre-Export Notice:</strong> {validationReport.errorsCount} error(s) and {validationReport.warningsCount} warning(s) detected in design.
                Review before cutting stone.
              </span>
            </div>
            <button
              onClick={() => {
                setExportModalOpen(false);
                setValidationDrawerOpen(true);
              }}
              className="font-semibold underline hover:opacity-80 shrink-0 ml-4 cursor-pointer"
            >
              Review Issues &rarr;
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6 gap-1 bg-muted/10 shrink-0 print:hidden overflow-x-auto">
          <TabButton
            active={activeTab === "quote"}
            onClick={() => openExportModal("quote")}
            icon={<FileText className="w-4 h-4" />}
            label="Client Quotation"
          />
          <TabButton
            active={activeTab === "fabrication"}
            onClick={() => openExportModal("fabrication")}
            icon={<Compass className="w-4 h-4" />}
            label="Fabrication Drawing &amp; Cut List"
          />
          <TabButton
            active={activeTab === "export"}
            onClick={() => openExportModal("export")}
            icon={<Download className="w-4 h-4" />}
            label="Save &amp; Export"
          />
          <TabButton
            active={activeTab === "settings"}
            onClick={() => openExportModal("settings")}
            icon={<Building className="w-4 h-4" />}
            label="Workshop Settings"
          />
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: CLIENT QUOTATION */}
          {activeTab === "quote" && (
            <div className="space-y-6">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border print:hidden">
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handlePrint} className="gap-1.5 cursor-pointer">
                    <Printer className="w-4 h-4" />
                    Print Quotation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyQuote}
                    className="gap-1.5 cursor-pointer"
                  >
                    {copiedQuote ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copiedQuote ? "Copied!" : "Copy Text"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openWhatsAppDirect}
                    className="gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Valid for: <strong>{business.quoteValidityDays} days</strong> | Mode: <strong>{pricing.billOn.toUpperCase()} area</strong>
                </div>
              </div>

              {/* Editable Customer Fields (quick inline edit before printing) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/10 p-3.5 rounded-lg border border-border print:hidden text-xs">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Customer Name</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    value={project.customer?.name || ""}
                    onChange={(e) => updateCustomer({ name: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Phone Number</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    value={project.customer?.phone || ""}
                    onChange={(e) => updateCustomer({ phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Site Location</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    value={project.customer?.location || ""}
                    onChange={(e) => updateCustomer({ location: e.target.value })}
                    placeholder="e.g. Flat 402, Royal Palms"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Project Name</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    value={project.name}
                    onChange={(e) => updateProjectName(e.target.value)}
                    placeholder="Kitchen Name"
                  />
                </div>
              </div>

              {/* Printable Quotation Sheet */}
              <div className="bg-white text-slate-900 border border-slate-200 rounded-lg p-8 shadow-sm print:border-none print:shadow-none print:p-0 font-sans">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {business.businessName}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{business.tagline}</p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {business.address}, {business.cityStateZip}
                      <br />
                      Phone: {business.phone} | Email: {business.email}
                      <br />
                      <strong>GSTIN:</strong> {business.gstNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-widest rounded mb-2">
                      ESTIMATE / QUOTATION
                    </span>
                    <p className="text-xs text-slate-500 font-mono">
                      REF: QT-{new Date().getFullYear()}-{project.id.slice(0, 4).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Date: <strong>{new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}</strong>
                    </p>
                    <p className="text-xs text-slate-600">
                      Valid Until: <strong>{getExpiryDate(business.quoteValidityDays)}</strong>
                    </p>
                  </div>
                </div>

                {/* Client & Project Details */}
                <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-md border border-slate-100 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                      QUOTATION FOR (CLIENT)
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {project.customer?.name || "Client Name"}
                    </p>
                    {project.customer?.phone && (
                      <p className="text-slate-600 mt-0.5">Phone: {project.customer.phone}</p>
                    )}
                    {project.customer?.email && (
                      <p className="text-slate-600">Email: {project.customer.email}</p>
                    )}
                    {project.customer?.location && (
                      <p className="text-slate-600">Site: {project.customer.location}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                      PROJECT SPECIFICATIONS
                    </p>
                    <p className="text-sm font-bold text-slate-900">{project.name}</p>
                    <p className="text-slate-600 mt-0.5">
                      Layout: <strong>{project.kitchenType.toUpperCase()}</strong> | Room:{" "}
                      <strong>{project.room.length} × {project.room.width} mm</strong>
                    </p>
                    <p className="text-slate-600">
                      Platforms: <strong>{project.platforms.length}</strong> | Slabs:{" "}
                      <strong>{nesting.slabsRequired} standard slab(s)</strong>
                    </p>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="w-full text-left text-xs mb-6 border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-600 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 font-bold">#</th>
                      <th className="py-2.5 font-bold">Item Description</th>
                      <th className="py-2.5 font-bold">Category</th>
                      <th className="py-2.5 font-bold text-right">Quantity</th>
                      <th className="py-2.5 font-bold text-right">Unit Rate</th>
                      <th className="py-2.5 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estimation.lineItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 font-medium text-slate-900">
                          {item.description}
                          {item.note && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              {item.note}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-slate-500 capitalize">{item.category}</td>
                        <td className="py-2 text-right font-mono text-slate-700">
                          {item.qty} {item.unit}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-700">
                          {formatCurrency(item.unitRate, estimation.currency)}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(item.amount, estimation.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Summary Block */}
                <div className="flex justify-end mb-8">
                  <div className="w-72 space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency(estimation.subtotalBeforeDiscountAndTax, estimation.currency)}
                      </span>
                    </div>

                    {estimation.discountAmount > 0 && (
                      <div className="flex justify-between py-1 text-emerald-700">
                        <span>Discount ({pricing.discount.value}{pricing.discount.type === "percent" ? "%" : " flat"}):</span>
                        <span className="font-mono">
                          -{formatCurrency(estimation.discountAmount, estimation.currency)}
                        </span>
                      </div>
                    )}

                    {estimation.taxAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span>GST / Tax ({pricing.taxPercent}%):</span>
                        <span className="font-mono">
                          +{formatCurrency(estimation.taxAmount, estimation.currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between py-2.5 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                      <span>GRAND TOTAL:</span>
                      <span className="font-mono text-base">
                        {formatCurrency(estimation.grandTotalRounded, estimation.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="border-t border-slate-200 pt-5 text-[11px] text-slate-600 space-y-2">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Payment Terms &amp; Conditions
                  </p>
                  <p><strong>Payment Terms:</strong> {business.paymentTerms}</p>
                  <p className="whitespace-pre-line text-slate-500">{business.termsAndConditions}</p>
                </div>

                {/* Mandatory Disclaimer */}
                <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Estimate only. Final measurement and price are confirmed on site.
                  </span>
                </div>

                {/* Signature Row */}
                <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-200 text-xs">
                  <div>
                    <div className="border-b border-slate-400 h-10 w-48 mb-2"></div>
                    <p className="font-semibold text-slate-800">Customer Acceptance</p>
                    <p className="text-[10px] text-slate-500">Sign &amp; Date</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="border-b border-slate-400 h-10 w-48 mb-2"></div>
                    <p className="font-semibold text-slate-800">For {business.businessName}</p>
                    <p className="text-[10px] text-slate-500">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FABRICATION DRAWING & CUT LIST */}
          {activeTab === "fabrication" && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border print:hidden">
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleDownloadSvg} className="gap-1.5 cursor-pointer">
                    <Download className="w-4 h-4" />
                    Download SVG Drawing
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 cursor-pointer">
                    <Printer className="w-4 h-4" />
                    Print Cut Sheet
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Standard Slab: <strong>3200 × 1600 mm</strong></span>
                  <span>Slabs Required: <strong className="text-foreground">{nesting.slabsRequired}</strong></span>
                  <span>Yield: <strong className="text-emerald-600 dark:text-emerald-400">{nesting.utilizationPercent}%</strong></span>
                </div>
              </div>

              {/* Overlarge Piece Alert */}
              {nesting.hasOverlargePiece && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <strong>Slab Size Exceeded:</strong> One or more pieces exceed maximum standard slab dimensions (3200×1600 mm). A seam must be placed on the platform.
                  </div>
                </div>
              )}

              {/* Interactive SVG Preview */}
              <div className="border border-border rounded-lg p-4 bg-white overflow-x-auto shadow-inner flex justify-center">
                <div
                  className="max-w-full"
                  dangerouslySetInnerHTML={{ __html: fabricationSvg }}
                />
              </div>

              {/* Cut List Table */}
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Stone Pieces Cut List ({cutList.length} piece{cutList.length !== 1 ? "s" : ""})
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    Tolerance: ±1.5 mm
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/10 text-muted-foreground uppercase text-[10px]">
                      <th className="p-2.5">Piece Label</th>
                      <th className="p-2.5">Finished Dimensions</th>
                      <th className="p-2.5">Thickness</th>
                      <th className="p-2.5">Area (m² / sq ft)</th>
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5">Finished Edges</th>
                      <th className="p-2.5">Cutouts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cutList.map((piece) => (
                      <tr key={piece.id} className="hover:bg-muted/20 font-mono">
                        <td className="p-2.5 font-bold font-sans text-foreground">
                          {piece.label}
                          {piece.seamNotes && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                              {piece.seamNotes}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {piece.length} × {piece.depth} mm
                        </td>
                        <td className="p-2.5">{piece.thickness} mm</td>
                        <td className="p-2.5">
                          {(piece.areaSqMm / 1_000_000).toFixed(2)} m² ({piece.areaSqFt.toFixed(1)} sq ft)
                        </td>
                        <td className="p-2.5 font-sans capitalize">{piece.materialName}</td>
                        <td className="p-2.5 font-sans">
                          {piece.finishedEdges.join(", ")} ({piece.edgeProfile})
                        </td>
                        <td className="p-2.5 font-sans">
                          {piece.cutouts.length === 0 ? (
                            <span className="text-muted-foreground">None</span>
                          ) : (
                            piece.cutouts.map((c) => `${c.name} (${c.width}×${c.depth}mm)`).join("; ")
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Slab Nesting Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border bg-muted/10">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Slabs Required</p>
                  <p className="text-2xl font-black text-foreground mt-1">{nesting.slabsRequired} Slabs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Size: 3200 × 1600 mm each</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/10">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Stone Utilization</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {nesting.utilizationPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Finished piece surface area</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/10">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Estimated Scrap / Offcut</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {nesting.wastePercent}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Includes kerf and perimeter trim</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAVE & EXPORT */}
          {activeTab === "export" && (
            <div className="space-y-6">
              {/* Feedback banners */}
              {importSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* JSON Project Backup */}
                <div className="p-5 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <Download className="w-4 h-4 text-primary" />
                    <span>Project File (.kpd.json)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Download complete project data including room dimensions, walls, countertop platforms, cutouts, sinks, hobs, and validation state.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleDownloadJson} className="gap-1.5 cursor-pointer">
                      <Download className="w-3.5 h-3.5" />
                      Download Project JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.kpd.json"
                      onChange={handleImportJson}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* 3D Viewport Snapshot */}
                <div className="p-5 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <Camera className="w-4 h-4 text-primary" />
                    <span>3D View Snapshot (PNG)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Capture a high-resolution PNG image directly from the active 3D Babylon.js canvas for presentations or client messaging.
                  </p>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" onClick={handleCapturePng} className="gap-1.5 cursor-pointer">
                      <Camera className="w-3.5 h-3.5" />
                      Save 3D Image (PNG)
                    </Button>
                  </div>
                </div>

                {/* WhatsApp Share Card */}
                <div className="p-5 rounded-lg border border-border bg-card space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                      <Share2 className="w-4 h-4 text-emerald-500" />
                      <span>WhatsApp Client Summary</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyWa}
                        className="h-7 text-xs gap-1 cursor-pointer"
                      >
                        {copiedWa ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedWa ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={openWhatsAppDirect}
                        className="h-7 text-xs gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Send via WhatsApp
                      </Button>
                    </div>
                  </div>
                  <pre className="p-3 bg-muted/40 border border-border rounded text-[11px] font-mono whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">
                    {waSummary}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORKSHOP SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-foreground">Workshop &amp; Business Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These details appear on printed quotations, invoices, and exported client summaries.
                </p>
              </div>

              {savedSettingsFeedback && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Settings saved to browser storage.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <Label>Business Name</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.businessName}
                    onChange={(e) => updateBusiness({ businessName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tagline / Specialty</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.tagline}
                    onChange={(e) => updateBusiness({ tagline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>GST Number / Tax ID</Label>
                  <Input
                    className="h-8 text-xs mt-1 font-mono"
                    value={business.gstNumber}
                    onChange={(e) => updateBusiness({ gstNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone / WhatsApp</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.phone}
                    onChange={(e) => updateBusiness({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.email}
                    onChange={(e) => updateBusiness({ email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>City, State &amp; Pin Code</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.cityStateZip}
                    onChange={(e) => updateBusiness({ cityStateZip: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Workshop Address</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.address}
                    onChange={(e) => updateBusiness({ address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quote Validity (Days)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    className="h-8 text-xs mt-1"
                    value={business.quoteValidityDays}
                    onChange={(e) => updateBusiness({ quoteValidityDays: Number(e.target.value) || 15 })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Default Payment Terms</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={business.paymentTerms}
                    onChange={(e) => updateBusiness({ paymentTerms: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Terms &amp; Conditions (Printed at bottom of quotation)</Label>
                  <textarea
                    rows={4}
                    className="w-full text-xs p-2 rounded-md border border-input bg-background mt-1 font-mono leading-relaxed"
                    value={business.termsAndConditions}
                    onChange={(e) => updateBusiness({ termsAndConditions: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSavedSettingsFeedback(true);
                    setTimeout(() => setSavedSettingsFeedback(false), 2500);
                  }}
                  className="gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Settings
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetBusiness}
                  className="cursor-pointer"
                >
                  Reset Defaults
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
        active
          ? "border-primary text-primary font-bold"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
}

function getExpiryDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}
