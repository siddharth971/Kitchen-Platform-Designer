import { v4 as uuidv4 } from "uuid";

export function generateId(prefix: string = "id"): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}
