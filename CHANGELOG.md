# Changelog

All notable changes to the Kitchen Platform Designer project will be documented in this file.

## [Unreleased] - Phase 0 & Phase 1

### Added
- **Phase 0: Foundation**:
  - Next.js (App Router) + TypeScript strict setup.
  - Tailwind CSS + shadcn/ui components integration.
  - Zustand stores with modular slices (`projectSlice`, `selectionSlice`, `uiSlice`, `cameraSlice`, `historySlice`).
  - i18n localization scaffolding (`en`, `hi`, `gu`).
  - Client-only Babylon.js viewport with render-on-demand dirty cycle and zero SSR leak.
  - Full editor layout: Top Bar, Tool Box, 3D Canvas, Properties Panel, and Status Bar.
- **Phase 1: Room Engine & Pure Domain Math**:
  - `core/units`: pure functions for conversions between mm, cm, inches, feet-inches, formatting and robust text parsing (`2400`, `240cm`, `7'10"`, `7 ft 10.5 in`, `94.5in`).
  - `engine/coordinates.ts`: single source of truth for converting mm project space to Babylon scene space (1 unit = 1000 mm, right-handed system).
  - `data/presets.ts`: editable standard kitchen platform and room presets with `PLACEHOLDER` business pricing.
  - `core/geometry/wall`: procedural wall generator supporting analytical openings for doors, windows, and passages with zero CSG overhead.
  - Interactive camera modes: Perspective, Top, Front, Left, Right, Isometric, and Fit to Room.
  - Interactive selection and dynamic numeric properties panel for room and wall dimensions and openings.
  - Vitest test suite for unit conversions, parsing edge cases, coordinate round-trips, and wall geometry subdivision.

- **Phase 2: Platform Engine**:
  - `core/geometry/platform`: unified 2D boundary footprint polygon generation for Straight and L-shaped platforms.
  - Area calculation counting corner intersection exactly once ($L_A D_A + L_B D_B - D_A D_B$).
  - Seam calculation splitting platform into fabricable slab pieces ($<= 3200 \times 1600\text{ mm}$).
  - Procedural slab extrusion via `PolygonMeshBuilder` and `earcut`.
  - Finished edge length, gross area, and backsplash metrics calculation.
  - Overhangs, backsplash toggle, and materials/edge profile selector.

- **Phase 3: Cutouts and Objects**:
  - Seed catalog JSON files for sinks, hobs, cabinets, and appliances with explicit `PLACEHOLDER` pricing and dimensions.
  - Runtime Zod schemas & catalog loader (`catalogLoader.ts`).
  - `core/geometry/cutout`: pure functions for rectangular, rounded, circular, and polygonal cutouts, point-in-polygon containment, area, and edge clearance checks.
  - True slab cutout holes: extruded in `PlatformRenderer` via `builder.addHole()` with `earcut`.
  - `ObjectRenderer.ts`: 3D procedural representation of sinks (with basin and faucet), hobs (with burners and type styling), cabinets (with plinth and door separations), appliances, and color-coded utility connection points (electric, water, drain, gas, chimney).
  - Component Catalog modal (`CatalogModal.tsx`) with category tabs, specs, and one-click smart placement.
  - Full inspector panels in `PropertiesPanel.tsx` for platforms (cutout list with edge clearance badges), sinks, hobs, cabinets, appliances, and utility points.
  - Complete test suite: 64 unit tests passing across 7 test suites.
