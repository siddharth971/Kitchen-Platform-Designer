"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store";
import { runProjectValidation } from "@/core/validation";
import type { ValidationIssue } from "@/core/validation";
import { formatLength } from "@/core/units";
import {
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Severity styles ────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  error: {
    icon: XCircle,
    iconClass: "text-red-500",
    bgClass: "bg-red-500/8 border-red-500/20",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/8 border-amber-500/20",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    label: "Warning",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/8 border-blue-500/20",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    label: "Info",
  },
} as const;

// ── Issue Card ──────────────────────────────────────────────────────
function IssueCard({
  issue,
  displayUnit,
  onSelect,
}: {
  issue: ValidationIssue;
  displayUnit: string;
  onSelect: () => void;
}) {
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;

  return (
    <div
      className={`border rounded-lg p-3 flex gap-3 transition-colors ${cfg.bgClass}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-foreground leading-tight">{issue.title}</p>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          {issue.message}
        </p>
        {issue.metric && (
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
            <span className="text-muted-foreground">{issue.metric.name}:</span>
            <span className="text-red-500 font-semibold">
              {formatLength(issue.metric.actual, displayUnit as "mm" | "cm" | "inch" | "feet-inch")}
            </span>
            <span className="text-muted-foreground">
              (min {formatLength(issue.metric.threshold, displayUnit as "mm" | "cm" | "inch" | "feet-inch")})
            </span>
          </div>
        )}
        {issue.suggestion && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 italic">
            💡 {issue.suggestion}
          </p>
        )}
        {issue.targetObjectId && (
          <button
            onClick={onSelect}
            className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer font-medium"
          >
            <ChevronRight className="w-3 h-3" />
            Select object
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ValidationDrawer ──────────────────────────────────────────
export function ValidationDrawer() {
  const project = useAppStore((state) => state.project);
  const displayUnit = useAppStore((state) => state.displayUnit);
  const validationDrawerOpen = useAppStore((state) => state.validationDrawerOpen);
  const setValidationDrawerOpen = useAppStore((state) => state.setValidationDrawerOpen);
  const selectObject = useAppStore((state) => state.selectObject);

  const report = useMemo(() => runProjectValidation(project), [project]);

  if (!validationDrawerOpen) return null;

  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const infos = report.issues.filter((i) => i.severity === "info");

  const handleSelect = (issue: ValidationIssue) => {
    if (issue.targetObjectId && issue.targetObjectType) {
      selectObject(
        issue.targetObjectId,
        issue.targetObjectType as Parameters<typeof selectObject>[1]
      );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => setValidationDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {report.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">Design Validation</p>
              <p className="text-[10px] text-muted-foreground">
                {report.errorsCount} errors · {report.warningsCount} warnings · {report.infoCount} info
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setValidationDrawerOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Summary bar */}
        <div
          className={`px-4 py-2.5 shrink-0 text-sm font-medium flex items-center gap-2 border-b border-border/60 ${
            report.isValid
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : report.errorsCount > 0
              ? "bg-red-500/10 text-red-700 dark:text-red-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          {report.isValid ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Design is valid — no errors found
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              {report.errorsCount} issue{report.errorsCount !== 1 ? "s" : ""} require attention
            </>
          )}
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {report.issues.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 h-full text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50" />
              <p className="text-sm font-medium">No issues found</p>
              <p className="text-xs text-center max-w-[220px]">
                Your kitchen design passes all safety and fabrication rules.
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 px-0.5">
                Errors ({errors.length})
              </p>
              {errors.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  displayUnit={displayUnit}
                  onSelect={() => handleSelect(issue)}
                />
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 px-0.5">
                Warnings ({warnings.length})
              </p>
              {warnings.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  displayUnit={displayUnit}
                  onSelect={() => handleSelect(issue)}
                />
              ))}
            </div>
          )}

          {infos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 px-0.5">
                Information ({infos.length})
              </p>
              {infos.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  displayUnit={displayUnit}
                  onSelect={() => handleSelect(issue)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 shrink-0 text-[10px] text-muted-foreground text-center">
          Validation runs in real-time • Rules: IS 3792, IS 4346, stone fabrication standards
        </div>
      </div>
    </>
  );
}
