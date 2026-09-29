"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

interface EditorViewportProps {
  onCursorMove?: (posMm: { x: number; y: number; z: number }) => void;
}

const Viewport3D = dynamic(
  () => import("./Viewport3D").then((mod) => mod.Viewport3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 gap-3 text-muted-foreground select-none">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs font-medium">Initializing 3D Spatial Engine...</span>
      </div>
    ),
  }
);

export function EditorViewport({ onCursorMove }: EditorViewportProps) {
  return <Viewport3D onCursorMove={onCursorMove} />;
}
