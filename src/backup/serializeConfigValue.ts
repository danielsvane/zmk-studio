// The single home of the ConfigValue oneof ↔ JSON mapping, shared by export
// and import so the two can never drift. The JSON shape flattens the
// KeyPositions wrapper and enriches behaviorRef with the referenced
// behaviour's display name (ids aren't stable across firmware builds — see
// backupFormat.ts).

import type { ConfigValue } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { ExportedConfigValue } from "./backupFormat";

export function configValueToJson(
  value: ConfigValue,
  behaviorNameForId: (id: number) => string | undefined
): ExportedConfigValue {
  if (value.intValue !== undefined) return { intValue: value.intValue };
  if (value.boolValue !== undefined) return { boolValue: value.boolValue };
  if (value.enumValue !== undefined) return { enumValue: value.enumValue };
  if (value.positions !== undefined) {
    return { positions: [...value.positions.positions] };
  }
  if (value.behaviorRef !== undefined) {
    const id = value.behaviorRef.behaviorId;
    return {
      behaviorRef: { behaviorId: id, behaviorName: behaviorNameForId(id) ?? "" },
    };
  }
  if (value.hidUsage !== undefined) return { hidUsage: value.hidUsage };
  // An unset oneof shouldn't reach us, but exporting an empty object beats
  // throwing mid-export; import treats it the same way.
  return {};
}

/**
 * Rebuild a wire ConfigValue from its JSON form. behaviorRef values are
 * remapped through `resolveBehaviorId` (old id + exported name → live id);
 * returns null when the referenced behaviour can't be resolved, so the caller
 * can skip the field and report it.
 */
export function jsonToConfigValue(
  value: ExportedConfigValue,
  resolveBehaviorId: (id: number, name: string) => number | null
): ConfigValue | null {
  if (value.intValue !== undefined) return { intValue: value.intValue };
  if (value.boolValue !== undefined) return { boolValue: value.boolValue };
  if (value.enumValue !== undefined) return { enumValue: value.enumValue };
  if (value.positions !== undefined) {
    return { positions: { positions: [...value.positions] } };
  }
  if (value.behaviorRef !== undefined) {
    const id = resolveBehaviorId(
      value.behaviorRef.behaviorId,
      value.behaviorRef.behaviorName
    );
    if (id === null) return null;
    return { behaviorRef: { behaviorId: id } };
  }
  if (value.hidUsage !== undefined) return { hidUsage: value.hidUsage };
  return {};
}
