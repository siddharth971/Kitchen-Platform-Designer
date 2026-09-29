/**
 * Pure domain module for stone fabrication drawings, cut lists, slab nesting,
 * and quotation export summaries.
 *
 * ZERO React / ZERO Babylon dependencies.
 */

import type { Project } from "@/types/project";
import type { EstimationResult } from "@/core/estimation";
import type { BusinessSettings } from "@/types/business";
import { SQ_MM_TO_SQ_FT, formatCurrency } from "@/core/estimation";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CutoutOnPiece {
  id: string;
  type: string;
  name: string;
  xOffset: number; // mm from piece bottom-left/start
  zOffset: number; // mm from piece front edge
  width: number;
  depth: number;
}

export interface CutPiece {
  id: string;
  label: string;
  platformId: string;
  platformName: string;
  length: number;    // mm (longer dimension)
  depth: number;     // mm (shorter dimension)
  thickness: number; // mm
  areaSqMm: number;
  areaSqFt: number;
  materialId: string;
  materialName: string;
  edgeProfile: string;
  finishedEdges: Array<"front" | "back" | "left" | "right">;
  cutouts: CutoutOnPiece[];
  seamNotes?: string;
}

export interface PlacedPiece extends CutPiece {
  slabIndex: number;
  x: number; // mm on slab
  y: number; // mm on slab
  rotated: boolean;
}

export interface SlabNesting {
  slabWidth: number;
  slabDepth: number;
  slabAreaSqMm: number;
  totalPieceAreaSqMm: number;
  slabsRequired: number;
  utilizationPercent: number;
  wastePercent: number;
  placedPieces: PlacedPiece[];
  hasOverlargePiece: boolean;
  overlargePieces: string[];
}

export const STANDARD_SLAB_WIDTH = 3200; // mm
export const STANDARD_SLAB_DEPTH = 1600; // mm
export const SLAB_SAW_KERF = 5;          // mm saw blade margin between pieces

// ── Cut List Generation ────────────────────────────────────────────────────────

/**
 * Generates an engineering cut list of rectangular stone pieces from the project platforms.
 * Handles Straight and L-shaped platforms, splitting by seams.
 */
export function generateCutList(project: Project): CutPiece[] {
  const pieces: CutPiece[] = [];
  let pieceIndex = 1;

  for (const plat of project.platforms || []) {
    const platName = plat.name || `Platform ${plat.id.slice(0, 4)}`;
    const materialId = plat.materialId || "granite-black-galaxy";
    const materialName = formatMaterialName(materialId);
    const edgeProfile = plat.edgeProfile || "bullnose";
    const thickness = plat.slabThickness || 20;

    // Collect cutouts on this platform
    const platformCutouts: CutoutOnPiece[] = [];

    // From sinks
    for (const s of project.sinks || []) {
      if (s.platformId === plat.id) {
        platformCutouts.push({
          id: s.id,
          type: "sink",
          name: s.modelName || "Undermount Sink",
          xOffset: s.position?.x ?? 200,
          zOffset: s.position?.z ?? 100,
          width: s.cutoutDimensions?.width ?? s.dimensions?.width ?? 540,
          depth: s.cutoutDimensions?.depth ?? s.dimensions?.depth ?? 440,
        });
      }
    }

    // From hobs
    for (const h of project.hobs || []) {
      if (h.platformId === plat.id) {
        platformCutouts.push({
          id: h.id,
          type: "hob",
          name: h.modelName || "Gas/Induction Hob",
          xOffset: h.position?.x ?? 400,
          zOffset: h.position?.z ?? 100,
          width: h.cutoutDimensions?.width ?? h.dimensions?.width ?? 560,
          depth: h.cutoutDimensions?.depth ?? h.dimensions?.depth ?? 480,
        });
      }
    }

    // From custom cutouts
    for (const c of plat.cutouts || []) {
      platformCutouts.push({
        id: c.id,
        type: c.type || "custom",
        name: c.name || "Custom Cutout",
        xOffset: c.position?.x ?? 150,
        zOffset: c.position?.z ?? 150,
        width: c.dimensions?.width ?? 200,
        depth: c.dimensions?.depth ?? 200,
      });
    }

    if (plat.shape === "straight") {
      const length = plat.length || 2400;
      const depth = plat.depth || 600;

      // Check if slab requires a seam (> STANDARD_SLAB_WIDTH)
      if (length > STANDARD_SLAB_WIDTH) {
        const seamX = Math.round(length / 2);
        const p1Len = seamX;
        const p2Len = length - seamX;

        // Piece 1
        const p1Cutouts = platformCutouts.filter((c) => c.xOffset < p1Len);
        pieces.push({
          id: `${plat.id}-p1`,
          label: `Piece #${pieceIndex++} (${platName} - Part 1)`,
          platformId: plat.id,
          platformName: platName,
          length: p1Len,
          depth,
          thickness,
          areaSqMm: p1Len * depth,
          areaSqFt: (p1Len * depth) * SQ_MM_TO_SQ_FT,
          materialId,
          materialName,
          edgeProfile,
          finishedEdges: ["front", "left"],
          cutouts: p1Cutouts,
          seamNotes: `Seam at X = ${seamX} mm`,
        });

        // Piece 2
        const p2Cutouts = platformCutouts
          .filter((c) => c.xOffset >= p1Len)
          .map((c) => ({ ...c, xOffset: c.xOffset - p1Len }));
        pieces.push({
          id: `${plat.id}-p2`,
          label: `Piece #${pieceIndex++} (${platName} - Part 2)`,
          platformId: plat.id,
          platformName: platName,
          length: p2Len,
          depth,
          thickness,
          areaSqMm: p2Len * depth,
          areaSqFt: (p2Len * depth) * SQ_MM_TO_SQ_FT,
          materialId,
          materialName,
          edgeProfile,
          finishedEdges: ["front", "right"],
          cutouts: p2Cutouts,
          seamNotes: `Seam at X = 0 mm (joins Part 1)`,
        });
      } else {
        pieces.push({
          id: `${plat.id}-p1`,
          label: `Piece #${pieceIndex++} (${platName})`,
          platformId: plat.id,
          platformName: platName,
          length,
          depth,
          thickness,
          areaSqMm: length * depth,
          areaSqFt: (length * depth) * SQ_MM_TO_SQ_FT,
          materialId,
          materialName,
          edgeProfile,
          finishedEdges: ["front", "left", "right"],
          cutouts: platformCutouts,
        });
      }
    } else if (plat.shape === "l-shaped") {
      const lenA = plat.lengthA || 2400;
      const depA = plat.depthA || 600;
      const lenB = plat.lengthB || 1800;
      const depB = plat.depthB || 600;

      // Arm A is the primary straight slab
      const p1Cutouts = platformCutouts.filter((c) => c.xOffset < lenA);
      pieces.push({
        id: `${plat.id}-arm-a`,
        label: `Piece #${pieceIndex++} (${platName} - Arm A)`,
        platformId: plat.id,
        platformName: platName,
        length: lenA,
        depth: depA,
        thickness,
        areaSqMm: lenA * depA,
        areaSqFt: (lenA * depA) * SQ_MM_TO_SQ_FT,
        materialId,
        materialName,
        edgeProfile,
        finishedEdges: ["front", "left"],
        cutouts: p1Cutouts,
        seamNotes: `Corner butt-joint with Arm B at depth ${depA} mm`,
      });

      // Arm B runs from corner seam to outer end
      const armBLength = Math.max(100, lenB - depA);
      const p2Cutouts = platformCutouts
        .filter((c) => c.xOffset >= lenA)
        .map((c) => ({ ...c, xOffset: c.xOffset - lenA }));
      pieces.push({
        id: `${plat.id}-arm-b`,
        label: `Piece #${pieceIndex++} (${platName} - Arm B)`,
        platformId: plat.id,
        platformName: platName,
        length: armBLength,
        depth: depB,
        thickness,
        areaSqMm: armBLength * depB,
        areaSqFt: (armBLength * depB) * SQ_MM_TO_SQ_FT,
        materialId,
        materialName,
        edgeProfile,
        finishedEdges: ["front", "right"],
        cutouts: p2Cutouts,
        seamNotes: `Mates with Arm A at 90° corner seam`,
      });
    }
  }

  return pieces;
}

// ── 2D Slab Nesting ────────────────────────────────────────────────────────────

/**
 * Packs rectangular cut list pieces onto standard slabs (3200 × 1600 mm) using
 * a guillotine shelf-packing algorithm.
 */
export function computeSlabNesting(
  pieces: CutPiece[],
  slabWidth = STANDARD_SLAB_WIDTH,
  slabDepth = STANDARD_SLAB_DEPTH
): SlabNesting {
  const slabAreaSqMm = slabWidth * slabDepth;
  const placedPieces: PlacedPiece[] = [];
  const overlargePieces: string[] = [];

  let totalPieceArea = 0;
  for (const p of pieces) {
    totalPieceArea += p.areaSqMm;
    const canFitNormal = p.length <= slabWidth && p.depth <= slabDepth;
    const canFitRotated = p.depth <= slabWidth && p.length <= slabDepth;
    if (!canFitNormal && !canFitRotated) {
      overlargePieces.push(`${p.label} (${p.length}×${p.depth}mm exceeds slab ${slabWidth}×${slabDepth}mm)`);
    }
  }

  // Sort pieces largest first (by area descending)
  const sorted = [...pieces].sort((a, b) => b.areaSqMm - a.areaSqMm);

  interface Shelf {
    y: number;
    height: number;
    currentX: number;
  }

  interface SlabState {
    index: number;
    shelves: Shelf[];
  }

  const slabs: SlabState[] = [];

  for (const piece of sorted) {
    let placed = false;

    // Try fitting into existing slabs
    for (const slab of slabs) {
      // Try existing shelves
      for (const shelf of slab.shelves) {
        // Try unrotated
        if (
          shelf.currentX + piece.length <= slabWidth &&
          piece.depth <= shelf.height
        ) {
          placedPieces.push({
            ...piece,
            slabIndex: slab.index,
            x: shelf.currentX,
            y: shelf.y,
            rotated: false,
          });
          shelf.currentX += piece.length + SLAB_SAW_KERF;
          placed = true;
          break;
        }

        // Try rotated (if allowed)
        if (
          shelf.currentX + piece.depth <= slabWidth &&
          piece.length <= shelf.height
        ) {
          placedPieces.push({
            ...piece,
            slabIndex: slab.index,
            x: shelf.currentX,
            y: shelf.y,
            rotated: true,
          });
          shelf.currentX += piece.depth + SLAB_SAW_KERF;
          placed = true;
          break;
        }
      }

      if (placed) break;

      // Try adding a new shelf to this slab
      const lastShelf = slab.shelves[slab.shelves.length - 1];
      const nextY = lastShelf ? lastShelf.y + lastShelf.height + SLAB_SAW_KERF : 0;

      // Normal orientation shelf
      if (nextY + piece.depth <= slabDepth && piece.length <= slabWidth) {
        slab.shelves.push({
          y: nextY,
          height: piece.depth,
          currentX: piece.length + SLAB_SAW_KERF,
        });
        placedPieces.push({
          ...piece,
          slabIndex: slab.index,
          x: 0,
          y: nextY,
          rotated: false,
        });
        placed = true;
        break;
      }

      // Rotated orientation shelf
      if (nextY + piece.length <= slabDepth && piece.depth <= slabWidth) {
        slab.shelves.push({
          y: nextY,
          height: piece.length,
          currentX: piece.depth + SLAB_SAW_KERF,
        });
        placedPieces.push({
          ...piece,
          slabIndex: slab.index,
          x: 0,
          y: nextY,
          rotated: true,
        });
        placed = true;
        break;
      }
    }

    // If still not placed, start a new slab
    if (!placed) {
      const newSlabIndex = slabs.length + 1;
      const isRotated = piece.length > slabWidth && piece.depth <= slabWidth;
      const pw = isRotated ? piece.depth : piece.length;
      const ph = isRotated ? piece.length : piece.depth;

      slabs.push({
        index: newSlabIndex,
        shelves: [
          {
            y: 0,
            height: ph,
            currentX: pw + SLAB_SAW_KERF,
          },
        ],
      });

      placedPieces.push({
        ...piece,
        slabIndex: newSlabIndex,
        x: 0,
        y: 0,
        rotated: isRotated,
      });
    }
  }

  const slabsRequired = Math.max(slabs.length, pieces.length > 0 ? 1 : 0);
  const totalSlabCapacity = slabsRequired * slabAreaSqMm;
  const utilizationPercent =
    totalSlabCapacity > 0
      ? Math.min(100, Math.round((totalPieceArea / totalSlabCapacity) * 1000) / 10)
      : 0;
  const wastePercent = Math.max(0, Math.round((100 - utilizationPercent) * 10) / 10);

  return {
    slabWidth,
    slabDepth,
    slabAreaSqMm,
    totalPieceAreaSqMm: totalPieceArea,
    slabsRequired,
    utilizationPercent,
    wastePercent,
    placedPieces,
    hasOverlargePiece: overlargePieces.length > 0,
    overlargePieces,
  };
}

// ── SVG Fabrication Drawing ────────────────────────────────────────────────────

export interface SvgDrawingOptions {
  includeTitleBlock?: boolean;
  includeCutouts?: boolean;
  includeDimensions?: boolean;
  includeEdgeProfile?: boolean;
  customerName?: string;
  projectName?: string;
  date?: string;
}

/**
 * Generates an engineering 2D SVG fabrication drawing showing dimensioned slabs,
 * seam joints, cutouts, edge finishing, and title block.
 */
export function generateFabricationSvg(
  project: Project,
  cutList: CutPiece[],
  options: SvgDrawingOptions = {}
): string {
  const {
    includeTitleBlock = true,
    includeCutouts = true,
    includeDimensions = true,
    customerName = project.customer?.name || "Client",
    projectName = project.name || "Kitchen Platform",
    date = new Date().toISOString().split("T")[0],
  } = options;

  if (cutList.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="400" y="200" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999999">No platforms defined in project</text>
    </svg>`;
  }

  // Calculate layout coordinates for each piece stacked vertically
  const margin = 80;
  const spacing = 120;
  const scale = 0.22; // mm to SVG units

  let currentY = margin + 40;
  let maxPieceSvgWidth = 0;

  interface PieceLayout {
    piece: CutPiece;
    svgX: number;
    svgY: number;
    svgW: number;
    svgH: number;
  }

  const pieceLayouts: PieceLayout[] = [];

  for (const piece of cutList) {
    const svgW = piece.length * scale;
    const svgH = piece.depth * scale;
    maxPieceSvgWidth = Math.max(maxPieceSvgWidth, svgW);

    pieceLayouts.push({
      piece,
      svgX: margin + 30,
      svgY: currentY,
      svgW,
      svgH,
    });

    currentY += svgH + spacing;
  }

  const titleBlockHeight = includeTitleBlock ? 140 : 20;
  const totalSvgWidth = Math.max(900, maxPieceSvgWidth + margin * 2 + 100);
  const totalSvgHeight = currentY + titleBlockHeight + 60;

  // Build SVG elements
  const elements: string[] = [];

  // Background
  elements.push(`<rect width="100%" height="100%" fill="#ffffff" />`);

  // Engineering Grid Lines (subtle)
  elements.push(`
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
      </pattern>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  `);

  // Sheet Title
  elements.push(`
    <text x="${margin}" y="${margin - 20}" font-family="monospace, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">
      FABRICATION DRAWING &amp; STONE CUT LIST
    </text>
    <text x="${margin}" y="${margin}" font-family="sans-serif" font-size="12" fill="#64748b">
      Units: Millimetres (mm) | Tolerance: ±1.5 mm | Material: ${escapeXml(cutList[0]?.materialName || "Granite")} (${cutList[0]?.thickness || 20} mm)
    </text>
  `);

  // Draw Pieces
  for (const { piece, svgX, svgY, svgW, svgH } of pieceLayouts) {
    // Piece Label & Specs
    elements.push(`
      <text x="${svgX}" y="${svgY - 14}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">
        ${escapeXml(piece.label)} — ${piece.length} × ${piece.depth} × ${piece.thickness} mm
      </text>
      <text x="${svgX + svgW}" y="${svgY - 14}" text-anchor="end" font-family="sans-serif" font-size="11" fill="#475569">
        Area: ${(piece.areaSqMm / 1_000_000).toFixed(2)} m² (${piece.areaSqFt.toFixed(1)} sq ft) | Edge: ${piece.edgeProfile}
      </text>
    `);

    // Piece Slab Box
    elements.push(`
      <rect
        x="${svgX}"
        y="${svgY}"
        width="${svgW}"
        height="${svgH}"
        fill="#f8fafc"
        stroke="#334155"
        stroke-width="2"
        rx="2"
      />
    `);

    // Finished Edges (Thick blue highlight on exposed finished edges)
    const edgeStroke = 4;
    if (piece.finishedEdges.includes("front")) {
      // Front is bottom in top-view
      elements.push(`
        <line x1="${svgX}" y1="${svgY + svgH}" x2="${svgX + svgW}" y2="${svgY + svgH}" stroke="#0284c7" stroke-width="${edgeStroke}" stroke-linecap="round" />
        <text x="${svgX + svgW / 2}" y="${svgY + svgH + 18}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#0284c7">
          ▼ Finished Edge (${piece.edgeProfile})
        </text>
      `);
    }
    if (piece.finishedEdges.includes("left")) {
      elements.push(`
        <line x1="${svgX}" y1="${svgY}" x2="${svgX}" y2="${svgY + svgH}" stroke="#0284c7" stroke-width="${edgeStroke}" />
      `);
    }
    if (piece.finishedEdges.includes("right")) {
      elements.push(`
        <line x1="${svgX + svgW}" y1="${svgY}" x2="${svgX + svgW}" y2="${svgY + svgH}" stroke="#0284c7" stroke-width="${edgeStroke}" />
      `);
    }
    if (piece.finishedEdges.includes("back")) {
      elements.push(`
        <line x1="${svgX}" y1="${svgY}" x2="${svgX + svgW}" y2="${svgY}" stroke="#0284c7" stroke-width="${edgeStroke}" />
      `);
    }

    // Seam indicator notes if any
    if (piece.seamNotes) {
      elements.push(`
        <text x="${svgX + 12}" y="${svgY + 22}" font-family="monospace" font-size="10" fill="#d97706" font-weight="bold">
          [!] ${escapeXml(piece.seamNotes)}
        </text>
      `);
    }

    // Draw Cutouts
    if (includeCutouts && piece.cutouts.length > 0) {
      for (const cut of piece.cutouts) {
        const cutX = svgX + cut.xOffset * scale;
        const cutY = svgY + cut.zOffset * scale;
        const cutW = cut.width * scale;
        const cutH = cut.depth * scale;

        // Cutout rect with red dash
        elements.push(`
          <g>
            <rect
              x="${cutX}"
              y="${cutY}"
              width="${cutW}"
              height="${cutH}"
              fill="#fee2e2"
              fill-opacity="0.6"
              stroke="#dc2626"
              stroke-width="1.5"
              stroke-dasharray="4,3"
            />
            <!-- Center Crosshair -->
            <line x1="${cutX + cutW / 2 - 8}" y1="${cutY + cutH / 2}" x2="${cutX + cutW / 2 + 8}" y2="${cutY + cutH / 2}" stroke="#dc2626" stroke-width="1" />
            <line x1="${cutX + cutW / 2}" y1="${cutY + cutH / 2 - 8}" x2="${cutX + cutW / 2}" y2="${cutY + cutH / 2 + 8}" stroke="#dc2626" stroke-width="1" />
            
            <!-- Cutout Name & Dimensions -->
            <text x="${cutX + cutW / 2}" y="${cutY + cutH / 2 - 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#991b1b">
              ${escapeXml(cut.name)}
            </text>
            <text x="${cutX + cutW / 2}" y="${cutY + cutH / 2 + 10}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#991b1b">
              CUTOUT: ${cut.width} × ${cut.depth} mm
            </text>

            <!-- Offset dimension from left piece edge -->
            <line x1="${svgX}" y1="${cutY + cutH / 2}" x2="${cutX}" y2="${cutY + cutH / 2}" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2" />
            <text x="${svgX + (cutX - svgX) / 2}" y="${cutY + cutH / 2 - 3}" text-anchor="middle" font-family="monospace" font-size="9" fill="#475569">
              ${Math.round(cut.xOffset)} mm
            </text>
          </g>
        `);
      }
    }

    // Overall Dimension Lines
    if (includeDimensions) {
      // Top Horizontal dimension (Length)
      const dimY = svgY - 28;
      elements.push(`
        <g stroke="#2563eb" stroke-width="1">
          <line x1="${svgX}" y1="${dimY}" x2="${svgX + svgW}" y2="${dimY}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
          <line x1="${svgX}" y1="${dimY - 6}" x2="${svgX}" y2="${svgY}" stroke="#94a3b8" />
          <line x1="${svgX + svgW}" y1="${dimY - 6}" x2="${svgX + svgW}" y2="${svgY}" stroke="#94a3b8" />
          <text x="${svgX + svgW / 2}" y="${dimY - 5}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb" stroke="none">
            ${piece.length} mm
          </text>
        </g>
      `);

      // Right Vertical dimension (Depth)
      const dimX = svgX + svgW + 24;
      elements.push(`
        <g stroke="#2563eb" stroke-width="1">
          <line x1="${dimX}" y1="${svgY}" x2="${dimX}" y2="${svgY + svgH}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
          <line x1="${svgX + svgW}" y1="${svgY}" x2="${dimX + 6}" y2="${svgY}" stroke="#94a3b8" />
          <line x1="${svgX + svgW}" y1="${svgY + svgH}" x2="${dimX + 6}" y2="${svgY + svgH}" stroke="#94a3b8" />
          <text x="${dimX + 14}" y="${svgY + svgH / 2 + 4}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb" stroke="none">
            ${piece.depth} mm
          </text>
        </g>
      `);
    }
  }

  // Title Block (Engineering style at bottom)
  if (includeTitleBlock) {
    const tbY = currentY + 10;
    const tbW = totalSvgWidth - margin * 2;
    const tbH = 100;

    elements.push(`
      <g>
        <!-- Border box -->
        <rect x="${margin}" y="${tbY}" width="${tbW}" height="${tbH}" fill="#f8fafc" stroke="#334155" stroke-width="1.5" />
        
        <!-- Column dividers -->
        <line x1="${margin + tbW * 0.35}" y1="${tbY}" x2="${margin + tbW * 0.35}" y2="${tbY + tbH}" stroke="#cbd5e1" stroke-width="1" />
        <line x1="${margin + tbW * 0.70}" y1="${tbY}" x2="${margin + tbW * 0.70}" y2="${tbY + tbH}" stroke="#cbd5e1" stroke-width="1" />
        <line x1="${margin}" y1="${tbY + 50}" x2="${margin + tbW}" y2="${tbY + 50}" stroke="#cbd5e1" stroke-width="1" />

        <!-- Cell 1: Project & Client -->
        <text x="${margin + 12}" y="${tbY + 20}" font-family="sans-serif" font-size="10" fill="#64748b" font-weight="600">PROJECT / CLIENT</text>
        <text x="${margin + 12}" y="${tbY + 38}" font-family="sans-serif" font-size="12" fill="#0f172a" font-weight="bold">
          ${escapeXml(projectName)} (${escapeXml(customerName)})
        </text>

        <!-- Cell 2: Date & Revision -->
        <text x="${margin + tbW * 0.35 + 12}" y="${tbY + 20}" font-family="sans-serif" font-size="10" fill="#64748b" font-weight="600">DATE &amp; REVISION</text>
        <text x="${margin + tbW * 0.35 + 12}" y="${tbY + 38}" font-family="sans-serif" font-size="12" fill="#0f172a" font-weight="bold">
          ${date} | REV: 1.0 (PROVISIONAL)
        </text>

        <!-- Cell 3: Pieces & Slabs Summary -->
        <text x="${margin + tbW * 0.70 + 12}" y="${tbY + 20}" font-family="sans-serif" font-size="10" fill="#64748b" font-weight="600">CUT LIST SUMMARY</text>
        <text x="${margin + tbW * 0.70 + 12}" y="${tbY + 38}" font-family="sans-serif" font-size="12" fill="#0f172a" font-weight="bold">
          Total Pieces: ${cutList.length} | Cutouts: ${cutList.reduce((acc, p) => acc + p.cutouts.length, 0)}
        </text>

        <!-- Bottom Warning row across full width -->
        <rect x="${margin + 1}" y="${tbY + 51}" width="${tbW - 2}" height="${tbH - 52}" fill="#fffbeb" />
        <text x="${margin + 12}" y="${tbY + 72}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#b45309">
          NOTICE TO FABRICATOR &amp; INSTALLER:
        </text>
        <text x="${margin + 12}" y="${tbY + 88}" font-family="sans-serif" font-size="10" fill="#78350f">
          Estimate only. Final measurement and price are confirmed on site. Verify all cutout templates with physical appliance before cutting.
        </text>
      </g>
    `);
  }

  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${totalSvgWidth} ${totalSvgHeight}"
    width="${totalSvgWidth}"
    height="${totalSvgHeight}"
    style="background: #ffffff; font-family: ui-sans-serif, system-ui, sans-serif;"
  >
    ${elements.join("\n")}
  </svg>`;
}

// ── WhatsApp Message Summary ───────────────────────────────────────────────────

export function buildWhatsAppSummary(
  project: Project,
  quote: EstimationResult,
  business?: BusinessSettings
): string {
  const customerName = project.customer?.name || "Valued Customer";
  const businessName = business?.businessName || "Kitchen Platform Works";
  const phone = business?.phone || "";

  const lines: string[] = [
    `📋 *QUOTATION SUMMARY*`,
    `*${businessName}*`,
    `--------------------------------`,
    `👤 *Customer:* ${customerName}`,
    `📁 *Project:* ${project.name}`,
    `📐 *Kitchen Layout:* ${project.kitchenType.toUpperCase()} (${project.room.length}×${project.room.width} mm)`,
    `🪨 *Countertop:* ${project.platforms.length} platform(s)`,
    ``,
    `*ITEMIZED ESTIMATE:*`,
  ];

  // Group line items
  for (const item of quote.lineItems) {
    lines.push(`• ${item.description}: ${formatCurrency(item.amount, quote.currency)}`);
  }

  lines.push(
    `--------------------------------`,
    `Subtotal: ${formatCurrency(quote.subtotalBeforeDiscountAndTax, quote.currency)}`
  );

  if (quote.discountAmount > 0) {
    lines.push(`Discount: -${formatCurrency(quote.discountAmount, quote.currency)}`);
  }

  if (quote.taxAmount > 0) {
    lines.push(`GST / Tax: ${formatCurrency(quote.taxAmount, quote.currency)}`);
  }

  lines.push(
    `*GRAND TOTAL: ${formatCurrency(quote.grandTotalRounded, quote.currency)}*`,
    `--------------------------------`,
    `⚠️ _Estimate only. Final measurement and price are confirmed on site._`,
    phone ? `📞 Contact: ${phone}` : ""
  );

  return lines.filter(Boolean).join("\n");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMaterialName(id: string): string {
  return id
    .replace(/^granite-/, "Granite ")
    .replace(/^quartz-/, "Quartz ")
    .replace(/^marble-/, "Marble ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
