/**
 * Pure domain module for project serialization, validation, and schema migration.
 *
 * ZERO React / ZERO Babylon dependencies.
 */

import { ProjectSchema, type Project } from "@/types/project";

export const CURRENT_SCHEMA_VERSION = 1;

export interface MigrationResult {
  success: boolean;
  project?: Project;
  error?: string;
}

/**
 * Validates untrusted imported JSON and migrates older schema versions to current version.
 */
export function validateAndMigrateProject(rawData: unknown): MigrationResult {
  if (!rawData || typeof rawData !== "object") {
    return { success: false, error: "Invalid project file: expected a JSON object." };
  }

  const obj = rawData as Record<string, unknown>;

  // Check schema version
  const version = typeof obj.schemaVersion === "number" ? obj.schemaVersion : 1;

  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      success: false,
      error: `Project was created with a newer schema version (${version}). Please update your application.`,
    };
  }

  // Schema migrations (from v0/legacy to v1)
  let migrated = { ...obj };
  if (version < 1) {
    migrated = migrateV0ToV1(migrated);
  }

  // Ensure mandatory arrays exist
  if (!Array.isArray(migrated.platforms)) migrated.platforms = [];
  if (!Array.isArray(migrated.walls)) migrated.walls = [];
  if (!Array.isArray(migrated.sinks)) migrated.sinks = [];
  if (!Array.isArray(migrated.hobs)) migrated.hobs = [];
  if (!Array.isArray(migrated.cabinets)) migrated.cabinets = [];
  if (!Array.isArray(migrated.appliances)) migrated.appliances = [];
  if (!Array.isArray(migrated.utilityPoints)) migrated.utilityPoints = [];
  if (!Array.isArray(migrated.measurements)) migrated.measurements = [];

  // Validate with Zod
  const parseResult = ProjectSchema.safeParse(migrated);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    return { success: false, error: `Project validation failed: ${errorDetails}` };
  }

  return { success: true, project: parseResult.data as Project };
}

/**
 * Serializes a project into a clean JSON string with current schemaVersion and timestamp.
 */
export function serializeProject(project: Project): string {
  const payload: Project = {
    ...project,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

function migrateV0ToV1(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    schemaVersion: 1,
    measurements: data.measurements || [],
    settings: data.settings || {
      snapStep: 10,
      snapEnabled: true,
      gridVisible: true,
      gridSize: 100,
      showDimensions: true,
    },
  };
}
