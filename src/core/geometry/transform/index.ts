import type { Project } from "@/types/project";
import type { Point2D, Point3D } from "@/types/geometry";
import type { Cutout } from "@/types/kitchen";

export interface TransformCommit {
  objectId: string;
  objectType: string;
  positionDeltaMm: Point3D;
  rotationDegrees: Point3D;
  scale: Point3D;
}

const positiveScaled = (value: number, factor: number) => Math.max(1, value * factor);

function rotatePoint(point: Point2D, center: Point2D, radians: number): Point2D {
  const x = point.x - center.x;
  const z = point.z - center.z;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: center.x + x * cosine - z * sine,
    z: center.z + x * sine + z * cosine,
  };
}

export function applyTransformCommit(project: Project, change: TransformCommit): Project {
  const { objectId, objectType, positionDeltaMm: delta, rotationDegrees, scale } = change;

  if (objectType === "wall" || objectType === "opening") {
    const wall = project.walls.find((item) => item.id === objectId);
    if (!wall) return project;

    const center = {
      x: (wall.start.x + wall.end.x) / 2,
      z: (wall.start.z + wall.end.z) / 2,
    };
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const length = Math.hypot(dx, dz) || 1;
    const tangentX = dx / length;
    const tangentZ = dz / length;
    const lengthScale = Math.hypot(tangentX * scale.x, tangentZ * scale.z);
    const normalX = -tangentZ;
    const normalZ = tangentX;
    const thicknessScale = Math.hypot(normalX * scale.x, normalZ * scale.z);
    const scaledCenter = { x: center.x + delta.x, z: center.z + delta.z };
    const scalePoint = (point: Point2D): Point2D => ({
      x: scaledCenter.x + (point.x - center.x) * scale.x,
      z: scaledCenter.z + (point.z - center.z) * scale.z,
    });
    const rotatedStart = rotatePoint(scalePoint(wall.start), scaledCenter, rotationDegrees.y * Math.PI / 180);
    const rotatedEnd = rotatePoint(scalePoint(wall.end), scaledCenter, rotationDegrees.y * Math.PI / 180);
    const verticalScale = positiveScaled(wall.height, scale.y) / wall.height;

    return {
      ...project,
      walls: project.walls.map((item) => item.id !== objectId ? item : {
        ...item,
        start: rotatedStart,
        end: rotatedEnd,
        thickness: positiveScaled(item.thickness, thicknessScale),
        height: positiveScaled(item.height, scale.y),
        openings: item.openings.map((opening) => ({
          ...opening,
          offset: opening.offset * lengthScale,
          width: positiveScaled(opening.width, lengthScale),
          height: positiveScaled(opening.height, scale.y),
          sillHeight: opening.sillHeight * verticalScale,
        })),
      }),
    };
  }

  if (objectType === "platform") {
    const platform = project.platforms.find((item) => item.id === objectId);
    if (!platform) return project;
    const oldWidth = platform.shape === "straight" ? platform.length : platform.lengthA;
    const oldDepth = platform.shape === "straight" ? platform.depth : platform.lengthB;
    const newWidth = positiveScaled(oldWidth, scale.x);
    const newDepth = positiveScaled(oldDepth, scale.z);

    return {
      ...project,
      platforms: project.platforms.map((item) => item.id !== objectId ? item : {
        ...item,
        position: {
          x: item.position.x + delta.x + (oldWidth - newWidth) / 2,
          z: item.position.z + delta.z + (oldDepth - newDepth) / 2,
        },
        length: positiveScaled(item.length, scale.x),
        depth: positiveScaled(item.depth, scale.z),
        lengthA: positiveScaled(item.lengthA, scale.x),
        depthA: positiveScaled(item.depthA, scale.z),
        lengthB: positiveScaled(item.lengthB, scale.z),
        depthB: positiveScaled(item.depthB, scale.x),
        rotation: rotationDegrees,
        cutouts: item.cutouts.map((cutout: Cutout) => ({
          ...cutout,
          x: cutout.x * scale.x,
          y: cutout.y * scale.z,
          width: positiveScaled(cutout.width, scale.x),
          depth: positiveScaled(cutout.depth, scale.z),
          radius: cutout.radius === undefined ? undefined : cutout.radius * Math.min(scale.x, scale.z),
          points: cutout.points?.map((point: Point2D) => ({ x: point.x * scale.x, z: point.z * scale.z })),
        })),
        overhang: {
          ...item.overhang,
          side: item.overhang.side * scale.x,
          front: item.overhang.front * scale.z,
          back: item.overhang.back * scale.z,
        },
      }),
    };
  }

  if (objectType === "cabinet") {
    return {
      ...project,
      cabinets: project.cabinets.map((item) => {
        if (item.id !== objectId) return item;
        const width = positiveScaled(item.width, scale.x);
        const height = positiveScaled(item.height, scale.y);
        const depth = positiveScaled(item.depth, scale.z);
        return {
          ...item,
          position: {
            x: item.position.x + delta.x + (item.width - width) / 2,
            y: item.position.y + delta.y + (item.height - height) / 2,
            z: item.position.z + delta.z + (item.depth - depth) / 2,
          },
          width,
          height,
          depth,
          plinthHeight: item.plinthHeight === undefined ? undefined : item.plinthHeight * scale.y,
          rotation: rotationDegrees,
        };
      }),
    };
  }

  if (objectType === "appliance") {
    return {
      ...project,
      appliances: project.appliances.map((item) => {
        if (item.id !== objectId) return item;
        const dimensions = {
          width: positiveScaled(item.dimensions.width, scale.x),
          height: positiveScaled(item.dimensions.height, scale.y),
          depth: positiveScaled(item.dimensions.depth, scale.z),
        };
        return {
          ...item,
          position: {
            x: item.position.x + delta.x + (item.dimensions.width - dimensions.width) / 2,
            y: item.position.y + delta.y + (item.dimensions.height - dimensions.height) / 2,
            z: item.position.z + delta.z + (item.dimensions.depth - dimensions.depth) / 2,
          },
          dimensions,
          rotation: rotationDegrees,
        };
      }),
    };
  }

  if (objectType === "sink" || objectType === "hob") {
    const objectList = objectType === "sink" ? project.sinks : project.hobs;
    const transformed = objectList.map((item) => {
      if (item.id !== objectId) return item;
      const width = positiveScaled(item.width, scale.x);
      const height = positiveScaled(item.height, scale.y);
      const depth = positiveScaled(item.depth, scale.z);
      return {
        ...item,
        position: {
          x: item.position.x + delta.x + (item.width - width) / 2,
          y: item.position.y + delta.y,
          z: item.position.z + delta.z + (item.depth - depth) / 2,
        },
        width,
        height,
        depth,
        cutoutWidth: positiveScaled(item.cutoutWidth, scale.x),
        cutoutDepth: positiveScaled(item.cutoutDepth, scale.z),
        rotation: rotationDegrees,
      };
    });
    return objectType === "sink"
      ? { ...project, sinks: transformed }
      : { ...project, hobs: transformed };
  }

  if (objectType === "utility") {
    return {
      ...project,
      utilityPoints: project.utilityPoints.map((item) => item.id !== objectId ? item : ({
        ...item,
        x: item.x + delta.x,
        y: item.y + delta.y,
        z: item.z + delta.z,
        rotation: rotationDegrees,
        scale: {
          x: (item.scale?.x ?? 1) * scale.x,
          y: (item.scale?.y ?? 1) * scale.y,
          z: (item.scale?.z ?? 1) * scale.z,
        },
      })),
    };
  }

  return project;
}