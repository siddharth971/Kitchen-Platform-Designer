import { generateId } from "@/lib/id";
import type { Project, Wall } from "@/types/project";
import type { ApplianceInstance, Cabinet, CountertopPlatform, Cutout, HobInstance, SinkInstance, UtilityPoint } from "@/types/kitchen";
import type { SelectedObjectRef, SelectableObjectType } from "@/store/selectionSlice";

interface Bounds2D {
  left: number;
  right: number;
  front: number;
  back: number;
}

const platformSize = (platform: CountertopPlatform) => ({
  width: platform.shape === "straight" ? platform.length : platform.lengthA,
  depth: platform.shape === "straight" ? platform.depth : platform.lengthB,
});

export function getObjectBounds(project: Project, reference: SelectedObjectRef): Bounds2D | null {
  const { id, type } = reference;
  if (type === "wall" || type === "opening") {
    const wall = project.walls.find((item) => item.id === id);
    if (!wall) return null;
    return {
      left: Math.min(wall.start.x, wall.end.x),
      right: Math.max(wall.start.x, wall.end.x),
      front: Math.min(wall.start.z, wall.end.z),
      back: Math.max(wall.start.z, wall.end.z),
    };
  }
  if (type === "platform") {
    const item = project.platforms.find((value) => value.id === id);
    if (!item) return null;
    const size = platformSize(item);
    return { left: item.position.x, right: item.position.x + size.width, front: item.position.z, back: item.position.z + size.depth };
  }
  if (type === "cabinet") {
    const item = project.cabinets.find((value) => value.id === id);
    if (!item) return null;
    return { left: item.position.x, right: item.position.x + item.width, front: item.position.z, back: item.position.z + item.depth };
  }
  if (type === "appliance") {
    const item = project.appliances.find((value) => value.id === id);
    if (!item) return null;
    return { left: item.position.x, right: item.position.x + item.dimensions.width, front: item.position.z, back: item.position.z + item.dimensions.depth };
  }
  if (type === "sink" || type === "hob") {
    const item = type === "sink"
      ? project.sinks.find((value) => value.id === id)
      : project.hobs.find((value) => value.id === id);
    if (!item) return null;
    return { left: item.position.x, right: item.position.x + item.width, front: item.position.z, back: item.position.z + item.depth };
  }
  if (type === "utility") {
    const item = project.utilityPoints.find((value) => value.id === id);
    if (!item) return null;
    return { left: item.x, right: item.x, front: item.z, back: item.z };
  }
  return null;
}

export function translateObject(project: Project, reference: SelectedObjectRef, dx: number, dz: number): Project {
  const { id, type } = reference;
  if (type === "wall" || type === "opening") {
    return { ...project, walls: project.walls.map((wall) => wall.id !== id ? wall : ({
      ...wall,
      start: { x: wall.start.x + dx, z: wall.start.z + dz },
      end: { x: wall.end.x + dx, z: wall.end.z + dz },
    })) };
  }
  if (type === "platform") {
    return { ...project, platforms: project.platforms.map((item) => item.id !== id ? item : ({
      ...item,
      position: { x: item.position.x + dx, z: item.position.z + dz },
    })) };
  }
  if (type === "cabinet") {
    return { ...project, cabinets: project.cabinets.map((item) => item.id !== id ? item : ({
      ...item,
      position: { ...item.position, x: item.position.x + dx, z: item.position.z + dz },
    })) };
  }
  if (type === "appliance") {
    return { ...project, appliances: project.appliances.map((item) => item.id !== id ? item : ({
      ...item,
      position: { ...item.position, x: item.position.x + dx, z: item.position.z + dz },
    })) };
  }
  if (type === "sink") {
    return { ...project, sinks: project.sinks.map((item) => item.id !== id ? item : ({
      ...item,
      position: { ...item.position, x: item.position.x + dx, z: item.position.z + dz },
    })) };
  }
  if (type === "hob") {
    return { ...project, hobs: project.hobs.map((item) => item.id !== id ? item : ({
      ...item,
      position: { ...item.position, x: item.position.x + dx, z: item.position.z + dz },
    })) };
  }
  if (type === "utility") {
    return { ...project, utilityPoints: project.utilityPoints.map((item) => item.id !== id ? item : ({ ...item, x: item.x + dx, z: item.z + dz })) };
  }
  return project;
}

export function alignSelection(
  project: Project,
  references: SelectedObjectRef[],
  alignment: "left" | "center" | "right"
): Project {
  const items = references.map((reference) => ({ reference, bounds: getObjectBounds(project, reference) }))
    .filter((item): item is { reference: SelectedObjectRef; bounds: Bounds2D } => item.bounds !== null);
  if (items.length < 2) return project;
  const left = Math.min(...items.map((item) => item.bounds.left));
  const right = Math.max(...items.map((item) => item.bounds.right));
  const center = (left + right) / 2;

  return items.reduce((current, item) => {
    const dx = alignment === "left"
      ? left - item.bounds.left
      : alignment === "right"
        ? right - item.bounds.right
        : center - (item.bounds.left + item.bounds.right) / 2;
    return translateObject(current, item.reference, dx, 0);
  }, project);
}

export function distributeSelection(
  project: Project,
  references: SelectedObjectRef[],
  axis: "horizontal" | "vertical"
): Project {
  const coordinate = (bounds: Bounds2D) => axis === "horizontal"
    ? (bounds.left + bounds.right) / 2
    : (bounds.front + bounds.back) / 2;
  const items = references.map((reference) => ({ reference, bounds: getObjectBounds(project, reference) }))
    .filter((item): item is { reference: SelectedObjectRef; bounds: Bounds2D } => item.bounds !== null)
    .sort((a, b) => coordinate(a.bounds) - coordinate(b.bounds));
  if (items.length < 3) return project;

  const first = coordinate(items[0].bounds);
  const last = coordinate(items[items.length - 1].bounds);
  return items.slice(1, -1).reduce((current, item, index) => {
    const target = first + ((last - first) * (index + 1)) / (items.length - 1);
    const delta = target - coordinate(item.bounds);
    return translateObject(current, item.reference, axis === "horizontal" ? delta : 0, axis === "vertical" ? delta : 0);
  }, project);
}

function cloneReference(
  project: Project,
  reference: SelectedObjectRef,
  newId: string,
  dx: number,
  makeId: (prefix: string) => string
): { project: Project; reference: SelectedObjectRef } {
  const { id, type } = reference;
  if (type === "wall" || type === "opening") {
    const wall = project.walls.find((item) => item.id === id);
    if (!wall) return { project, reference };
    const clone: Wall = {
      ...wall,
      id: newId,
      start: { x: wall.start.x + dx, z: wall.start.z },
      end: { x: wall.end.x + dx, z: wall.end.z },
      openings: wall.openings.map((opening) => ({ ...opening, id: makeId("opening") })),
    };
    return { project: { ...project, walls: [...project.walls, clone] }, reference: { id: newId, type: "wall" } };
  }
  if (type === "platform") {
    const item = project.platforms.find((value) => value.id === id);
    if (!item) return { project, reference };
    const clone: CountertopPlatform = {
      ...item,
      id: newId,
      name: `${item.name} copy`,
      position: { x: item.position.x + dx, z: item.position.z },
      cutouts: item.cutouts.map((cutout: Cutout) => ({ ...cutout, id: makeId("cutout"), sourceObjectId: undefined })),
    };
    return { project: { ...project, platforms: [...project.platforms, clone] }, reference: { id: newId, type } };
  }
  if (type === "cabinet") {
    const item = project.cabinets.find((value) => value.id === id);
    if (!item) return { project, reference };
    const clone: Cabinet = { ...item, id: newId, name: item.name ? `${item.name} copy` : undefined, position: { ...item.position, x: item.position.x + dx } };
    return { project: { ...project, cabinets: [...project.cabinets, clone] }, reference: { id: newId, type } };
  }
  if (type === "appliance") {
    const item = project.appliances.find((value) => value.id === id);
    if (!item) return { project, reference };
    const clone: ApplianceInstance = { ...item, id: newId, name: `${item.name} copy`, position: { ...item.position, x: item.position.x + dx } };
    return { project: { ...project, appliances: [...project.appliances, clone] }, reference: { id: newId, type } };
  }
  if (type === "sink") {
    const item = project.sinks.find((value) => value.id === id);
    if (!item) return { project, reference };
    const clone: SinkInstance = { ...item, id: newId, name: `${item.name} copy`, platformId: undefined, position: { ...item.position, x: item.position.x + dx } };
    return { project: { ...project, sinks: [...project.sinks, clone] }, reference: { id: newId, type } };
  }
  if (type === "hob") {
    const item = project.hobs.find((value) => value.id === id);
    if (!item) return { project, reference };
    const clone: HobInstance = { ...item, id: newId, name: `${item.name} copy`, platformId: undefined, position: { ...item.position, x: item.position.x + dx } };
    return { project: { ...project, hobs: [...project.hobs, clone] }, reference: { id: newId, type } };
  }
  if (type === "utility") {
    const item = project.utilityPoints.find((value) => value.id === id);
    if (!item) return { project, reference };
    const clone: UtilityPoint = { ...item, id: newId, x: item.x + dx };
    return { project: { ...project, utilityPoints: [...project.utilityPoints, clone] }, reference: { id: newId, type } };
  }
  return { project, reference };
}

export function duplicateSelection(
  project: Project,
  references: SelectedObjectRef[],
  makeId: (prefix: string) => string = generateId
): { project: Project; references: SelectedObjectRef[] } {
  const bounds = references.map((reference) => getObjectBounds(project, reference)).filter((value): value is Bounds2D => value !== null);
  if (bounds.length === 0) return { project, references: [] };
  const offset = Math.max(600, Math.max(...bounds.map((value) => value.right)) - Math.min(...bounds.map((value) => value.left)));
  let nextProject = project;
  const copies: SelectedObjectRef[] = [];
  for (const reference of references) {
    const result = cloneReference(nextProject, reference, makeId(reference.type), offset, makeId);
    nextProject = result.project;
    if (result.reference.id !== reference.id) copies.push(result.reference);
  }
  return { project: nextProject, references: copies };
}

export function repeatCabinet(
  project: Project,
  cabinetId: string,
  count: number,
  spacingMm: number,
  makeId: (prefix: string) => string = generateId
): { project: Project; references: SelectedObjectRef[] } {
  const source = project.cabinets.find((item) => item.id === cabinetId);
  const repeatCount = Math.max(1, Math.min(100, Math.floor(count)));
  if (!source || repeatCount < 2) return { project, references: [] };
  const repeated = Array.from({ length: repeatCount - 1 }, (_, index) => ({
    ...source,
    id: makeId("cab"),
    name: source.name ? `${source.name} ${index + 2}` : undefined,
    position: { ...source.position, x: source.position.x + spacingMm * (index + 1) },
  }));
  return {
    project: { ...project, cabinets: [...project.cabinets, ...repeated] },
    references: repeated.map((item) => ({ id: item.id, type: "cabinet" as const })),
  };
}

export function deleteSelection(project: Project, references: SelectedObjectRef[]): Project {
  const ids = new Set(references.map((item) => item.id));
  const cutoutSourceIds = new Set([
    ...project.sinks.filter((item) => ids.has(item.id)).map((item) => item.id),
    ...project.hobs.filter((item) => ids.has(item.id)).map((item) => item.id),
  ]);
  return {
    ...project,
    walls: project.walls.filter((item) => !ids.has(item.id)),
    platforms: project.platforms
      .filter((item) => !ids.has(item.id))
      .map((item) => ({
        ...item,
        cutouts: item.cutouts.filter((cutout: Cutout) => !cutout.sourceObjectId || !cutoutSourceIds.has(cutout.sourceObjectId)),
      })),
    cabinets: project.cabinets.filter((item) => !ids.has(item.id)),
    appliances: project.appliances.filter((item) => !ids.has(item.id)),
    sinks: project.sinks.filter((item) => !ids.has(item.id)),
    hobs: project.hobs.filter((item) => !ids.has(item.id)),
    utilityPoints: project.utilityPoints.filter((item) => !ids.has(item.id)),
    groups: project.groups.map((group) => ({ ...group, objectIds: group.objectIds.filter((id) => !ids.has(id)) }))
      .filter((group) => group.objectIds.length > 0),
  };
}

export function setSelectionLocked(project: Project, references: SelectedObjectRef[], locked: boolean): Project {
  const ids = new Set(references.map((item) => item.id));
  return {
    ...project,
    room: ids.has("room") ? { ...project.room, locked } : project.room,
    walls: project.walls.map((item) => ids.has(item.id) ? { ...item, locked } : item),
    platforms: project.platforms.map((item) => ids.has(item.id) ? { ...item, locked } : item),
    cabinets: project.cabinets.map((item) => ids.has(item.id) ? { ...item, locked } : item),
    appliances: project.appliances.map((item) => ids.has(item.id) ? { ...item, locked } : item),
    sinks: project.sinks.map((item) => ids.has(item.id) ? { ...item, locked } : item),
    hobs: project.hobs.map((item) => ids.has(item.id) ? { ...item, locked } : item),
    utilityPoints: project.utilityPoints.map((item) => ids.has(item.id) ? { ...item, locked } : item),
  };
}

export function groupSelection(project: Project, name: string, objectIds: string[], id = generateId("group")): Project {
  const existing = new Set(project.groups.flatMap((group) => group.objectIds));
  const eligibleIds = [...new Set(objectIds)].filter((objectId) => !existing.has(objectId) && getObjectType(project, objectId) !== null);
  if (eligibleIds.length === 0) return project;
  return { ...project, groups: [...project.groups, { id, name, objectIds: eligibleIds }] };
}

export function ungroupSelection(project: Project, groupId: string): Project {
  return { ...project, groups: project.groups.filter((group) => group.id !== groupId) };
}

export function getReferencesForGroup(project: Project, groupId: string): SelectedObjectRef[] {
  const group = project.groups.find((item) => item.id === groupId);
  if (!group) return [];
  return group.objectIds.flatMap((id) => {
    const type = getObjectType(project, id);
    return type ? [{ id, type }] : [];
  });
}

export function getObjectType(project: Project, id: string): SelectableObjectType | null {
  if (project.walls.some((item) => item.id === id)) return "wall";
  if (project.platforms.some((item) => item.id === id)) return "platform";
  if (project.cabinets.some((item) => item.id === id)) return "cabinet";
  if (project.appliances.some((item) => item.id === id)) return "appliance";
  if (project.sinks.some((item) => item.id === id)) return "sink";
  if (project.hobs.some((item) => item.id === id)) return "hob";
  if (project.utilityPoints.some((item) => item.id === id)) return "utility";
  return null;
}