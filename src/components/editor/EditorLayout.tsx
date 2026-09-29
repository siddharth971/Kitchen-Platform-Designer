"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { SamplePricesBanner } from "./SamplePricesBanner";
import { TopBar } from "./TopBar";
import { Toolbox } from "./Toolbox";
import { EditorViewport } from "./EditorViewport";
import { PropertiesPanel } from "./PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { CatalogModal } from "./CatalogModal";
import { ValidationDrawer } from "./ValidationDrawer";

export function EditorLayout() {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; z: number } | null>(null);

  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const setProject = useAppStore((state) => state.setProject);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const triggerFit = useAppStore((state) => state.triggerFit);
  const gridVisible = useAppStore((state) => state.gridVisible);
  const setGridVisible = useAppStore((state) => state.setGridVisible);
  const snapEnabled = useAppStore((state) => state.snapEnabled);
  const setSnapEnabled = useAppStore((state) => state.setSnapEnabled);
  const selectObject = useAppStore((state) => state.selectObject);
  const setActiveTool = useAppStore((state) => state.setActiveTool);
  const setActiveMeasurementStart = useAppStore((state) => state.setActiveMeasurementStart);
  const setValidationDrawerOpen = useAppStore((state) => state.setValidationDrawerOpen);
  const validationDrawerOpen = useAppStore((state) => state.validationDrawerOpen);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          const next = redo();
          if (next) setProject(next);
        } else {
          const prev = undo();
          if (prev) setProject(prev);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        const next = redo();
        if (next) setProject(next);
        return;
      }

      // Quick Camera presets: 1=Perspective, 2=Top, 3=Front, 4=Left, 5=Right, 6=Isometric, F=Fit
      switch (e.key) {
        case "1":
          setCameraMode("perspective");
          break;
        case "2":
          setCameraMode("top");
          break;
        case "3":
          setCameraMode("front");
          break;
        case "4":
          setCameraMode("left");
          break;
        case "5":
          setCameraMode("right");
          break;
        case "6":
          setCameraMode("isometric");
          break;
        case "f":
        case "F":
          triggerFit();
          break;
        case "g":
        case "G":
          setGridVisible(!gridVisible);
          break;
        case "s":
        case "S":
          setSnapEnabled(!snapEnabled);
          break;
        case "Escape":
          selectObject(null, null);
          setActiveMeasurementStart(null);
          break;
        // Tool shortcuts
        case "v":
        case "V":
          setActiveTool("select");
          setActiveMeasurementStart(null);
          break;
        case "m":
        case "M":
          setActiveTool("measure");
          break;
        case "r":
        case "R":
          setActiveTool("room");
          setActiveMeasurementStart(null);
          break;
        // Validation drawer
        case "d":
        case "D":
          setValidationDrawerOpen(!validationDrawerOpen);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, setProject, setCameraMode, triggerFit, gridVisible, setGridVisible, snapEnabled, setSnapEnabled, selectObject, setActiveTool, setActiveMeasurementStart, setValidationDrawerOpen, validationDrawerOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sample Pricing Notice */}
      <SamplePricesBanner />

      {/* Top Application Bar */}
      <TopBar />

      {/* Main Studio Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Vertical Tool Ribbon */}
        <Toolbox />

        {/* Center 3D / CAD Viewport */}
        <main className="flex-1 relative h-full overflow-hidden">
          <EditorViewport onCursorMove={setCursorPos} />
        </main>

        {/* Right Numeric Inspector & Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar cursorPos={cursorPos} />

      {/* Component Catalog Modal */}
      <CatalogModal />

      {/* Design Validation Drawer */}
      <ValidationDrawer />
    </div>
  );
}
