# Architectural and Technical Decisions

This document records architectural, mathematical, and domain-level decisions made during the design and implementation of Kitchen Platform Designer.

---

## 1. Coordinates, Handedness, and Unit Scale (Section 3)

### Context
- Project domain coordinates: `x` along room width (mm), `z` along room depth (mm) (both on the horizontal floor plane), and `y` pointing upwards (mm).
- Babylon.js is left-handed by default with Y up, whereas glTF/GLB models and standard CAD systems are right-handed (+X right, +Y up, +Z towards viewer).
- Internal measurements are strictly in millimetres (`mm`).

### Options Considered
1. **Default Babylon.js left-handed system**: Invert Z coordinates at the boundary when importing glTF models or performing vector cross-products.
2. **`scene.useRightHandedSystem = true` in Babylon.js**: Configure the scene to right-handed mode natively.
3. **1 unit = 1 mm vs 1 unit = 1 meter (1000 mm)**.

### Decision
- **Handedness**: Set `scene.useRightHandedSystem = true` on the Babylon scene. This aligns with glTF 2.0 specifications, standard engineering/CAD mathematics, and avoids inverted cross-product or negative sign bugs.
- **Unit Scale**: **1 Babylon scene unit = 1000 mm (1.0 meter)**.
  - Room 3600 × 3000 mm = 3.6 × 3.0 scene units.
  - This keeps floating-point coordinates in the standard range (0.1 to 10.0), ensuring optimal camera near/far clipping (`minZ = 0.05`, `maxZ = 100`), precision in depth buffers, and physically accurate lighting falloffs in Babylon PBR.
- **Boundary Module**: `engine/coordinates.ts` is the single source of truth for conversions (`toScene`, `fromScene`, `toSceneLength`, `fromSceneLength`). No other module is permitted to convert coordinate units.

---

## 2. Dependency Management: `vite` Addition for Vitest (Section 4 & 6)

### Context
Section 4 specifies `Vitest` for unit tests. In `vitest` v5+, `vite` is a required peer dependency for the test runner.

### Decision
`vite` and `@types/node@^22` were added as devDependencies to enable `vitest run` without breaking strict dependency rules.

---

## 3. Wall Openings Geometry Strategy (Section 8)

### Context
Walls require real physical openings for doors, windows, and passages.

### Options Considered
1. **CSG boolean subtraction at runtime**: Compute mesh difference between wall box and opening box. Drawback: heavyweight CSG evaluation on property changes, potential non-manifold artifacts or performance lag.
2. **Procedural subdivision (analytical wall segments)**: Decompose a wall with openings into non-overlapping sub-blocks (left of opening, right of opening, sill below window, header above opening/door).

### Decision
- Use **Procedural subdivision (analytical wall segments)** in `core/geometry/wall/index.ts`.
- Pure domain calculation: returns exact non-overlapping cuboid dimensions for wall segments and lintel/sill blocks.
- Yields deterministic, instant, zero-artifact geometry with zero external CSG runtime overhead.

---

## 4. Render-On-Demand Architecture (Section 4 & 20)

### Context
To achieve maximum battery efficiency and stay within bundle/performance budgets, the Babylon engine must not render in an uncontrolled 60 fps continuous loop when nothing is changing.

### Decision
- Maintain a dirty flag in `BabylonEngine`.
- Requests to render (`markDirty` / `requestRender`) trigger frames when:
  - Camera rotates, pans, or zooms.
  - State changes in the Zustand project or selection stores.
  - User interacts with gizmos, inputs, or tools.
- Idle timeout settles the render loop after camera momentum stops.

---

## 5. State Management & Single Source of Truth (Section 2 & 15)

### Context
Business data must never live in React component state or Babylon mesh properties.

### Decision
- Project state is strictly modeled as pure JSON in Zustand slices (`projectSlice`, `selectionSlice`, `uiSlice`, `cameraSlice`, `historySlice`).
- Meshes in Babylon are purely reactive visual projections of the store.
- Object identity is a UUID `id`, never a Babylon mesh name or node id.

---

## 6. Platform Geometry & Unified Footprint Polygon (Section 9 & Phase 2)

### Context
Countertops can be Straight, L-shaped, U-shaped, or islands. L and U shapes must not overlap, duplicate corner areas, or exhibit z-fighting.

### Options Considered
1. **Separate overlapping rectangular meshes**: Place two boxes meeting at a corner. Drawback: double thickness at corner, z-fighting, inaccurate area/quantity calculation.
2. **Unified Footprint Polygon**: Compute a unified 2D boundary polygon (6 vertices for L-shape) and extrude vertically. Decompose into fabrication pieces via explicit seam lines.

### Decision
- Use the **Unified Footprint Polygon** approach.
- Pure function `computePlatformFootprint(platform)` generates a 2D boundary polygon.
- Shared corner area is counted exactly once ($L_A D_A + L_B D_B - D_A D_B$).
- Extruded with Babylon `PolygonMeshBuilder` using `earcut`.
- Seams divide the platform into discrete physical pieces for the cut list, fabrication drawing, and slab nesting.

---

## 7. True Cutout Holes & Hole Extrusion (Section 10 & Phase 3)

### Context
Sinks, hobs, and utility pathways require true physical holes in stone slabs for fabrication drawings and 3D visualization.

### Options Considered
1. **Babylon CSG subtraction at runtime**: Compute CSG difference between slab mesh and cutout box. Drawback: CSG can produce non-manifold geometry, triangulation artifacts, and performance lag when dragging/editing dimensions.
2. **PolygonMeshBuilder with `addHole()`**: Convert the platform footprint to an outer contour, convert each cutout to an inner hole polygon in X-Z plane, and extrude once with Babylon's native `PolygonMeshBuilder(name, corners, scene, earcut)`.

### Decision
- Use **`PolygonMeshBuilder.addHole(holeCorners)`** with `earcut` triangulation.
- Cutout shapes are generated deterministically by pure geometry functions (`computeCutoutPolygon`, `isCutoutInsidePlatform`, `computeEdgeClearance`).
- Guarantees clean 2D polygon boundaries for DXF/SVG fabrication export and zero runtime CSG instability.

---

## 8. Catalog Data & Component Representation (Section 11 & Phase 3)

### Context
Sinks, hobs, cabinets, appliances, and utilities must have real dimensions, cutout requirements, and clearances without hardcoding business data in UI or 3D meshes.

### Decision
- **Editable JSON seed catalogs** with Zod runtime schemas (`src/data/catalogLoader.ts`).
- Clearly marked with `PLACEHOLDER` comments to prevent fake compliance claims.
- **Procedural 3D visualization (`ObjectRenderer.ts`)**: Renders components with recognizable visual cues (sink basins and faucets, hob burner rings, cabinet plinths and door splits, color-coded utility point indicators) without loading external heavy GLTF models during MVP.


