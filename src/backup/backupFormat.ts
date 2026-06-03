// The versioned JSON document "Export backup…" downloads and "Import backup…"
// restores. The format is deliberately self-describing rather than a raw dump
// of the RPC messages, because the numeric ids the device uses are not stable
// across firmware builds:
//
//  - Every behaviour reference carries the behaviour's display name next to its
//    id, so import can resolve built-in behaviours by name when ids shifted.
//  - Layers are identified by their position in the `layers` array; the
//    original device layer id is kept only so layer-id params (mo/lt/to…) can
//    be remapped onto the ids the device assigns after import.
//  - Combo layer masks are decoded to arrays of layer indices, so import never
//    has to reason about the firmware's `layer_mask & BIT(i)` encoding.

export const BACKUP_FORMAT = "zmk-studio-backup";
export const BACKUP_VERSION = 1;

/** A behaviour reference inside a custom behaviour's config (hold/tap sub-binding). */
export interface ExportedBehaviorRef {
  behaviorId: number;
  behaviorName: string;
}

export interface ExportedBinding {
  behaviorId: number;
  /** Display name from the live behaviour registry — the resolution key on import. */
  behaviorName: string;
  param1: number;
  param2: number;
  /** Whether paramN holds a layer *id* (per the behaviour's metadata), so import can remap it. */
  param1IsLayerId: boolean;
  param2IsLayerId: boolean;
}

export interface ExportedLayer {
  name: string;
  /** Original device layer id — only used to remap layer-id params on import. */
  originalId: number;
  bindings: ExportedBinding[];
}

export interface ExportedCombo {
  /** Pool slot the combo occupied — import tries to re-create it at the same index. */
  originalIndex: number;
  keyPositions: number[];
  /** Layer *indices* the combo is active on; null = all layers (mask 0). */
  activeLayerIndices: number[] | null;
  binding: ExportedBinding;
  timeoutMs: number;
  requirePriorIdleMs: number;
  slowRelease: boolean;
}

/** Mirrors the ConfigValue oneof: exactly one member is set. Schema is never exported. */
export interface ExportedConfigValue {
  intValue?: number;
  boolValue?: boolean;
  enumValue?: number;
  positions?: number[];
  behaviorRef?: ExportedBehaviorRef;
  hidUsage?: number;
}

export interface ExportedConfigField {
  key: string;
  value: ExportedConfigValue;
}

export interface ExportedCustomBehavior {
  /** Original pool local_id — only used to build the oldId→newId map on import. */
  originalId: number;
  displayName: string;
  kind: string;
  config: ExportedConfigField[];
}

export interface BackupV1 {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  device: {
    name: string;
    serialNumberHex: string;
    /** bindings-per-layer at export time — sanity check against layout mismatches. */
    keyPositionCount: number;
    maxLayerNameLength: number;
  };
  keymap: {
    layers: ExportedLayer[];
  };
  combos: ExportedCombo[];
  customBehaviors: ExportedCustomBehavior[];
}

export type ParseBackupResult = { ok: BackupV1 } | { error: string };

// Structural validation of a user-picked file. Deliberately checks shape, not
// content (unknown behaviour names etc. are import's job to report) — but
// everything the import algorithm indexes into must be present and typed.
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "Not a valid JSON file" };
  }

  if (typeof raw !== "object" || raw === null) {
    return { error: "Not a JSON object" };
  }
  const doc = raw as Record<string, unknown>;

  if (doc.format !== BACKUP_FORMAT) {
    return { error: "Not a ZMK Studio backup file" };
  }
  if (doc.version !== BACKUP_VERSION) {
    return { error: `Unsupported backup version ${doc.version}` };
  }

  const device = doc.device as Record<string, unknown> | undefined;
  if (typeof device !== "object" || device === null) {
    return { error: "Missing device info" };
  }

  const keymap = doc.keymap as Record<string, unknown> | undefined;
  if (
    typeof keymap !== "object" ||
    keymap === null ||
    !Array.isArray(keymap.layers)
  ) {
    return { error: "Missing keymap layers" };
  }
  for (const layer of keymap.layers as unknown[]) {
    const l = layer as Record<string, unknown>;
    if (
      typeof l?.name !== "string" ||
      typeof l?.originalId !== "number" ||
      !Array.isArray(l?.bindings)
    ) {
      return { error: "Malformed layer entry" };
    }
    for (const binding of l.bindings as unknown[]) {
      if (!isExportedBinding(binding)) {
        return { error: `Malformed binding in layer "${l.name}"` };
      }
    }
  }

  if (!Array.isArray(doc.combos)) {
    return { error: "Missing combos" };
  }
  for (const combo of doc.combos as unknown[]) {
    const c = combo as Record<string, unknown>;
    if (
      typeof c?.originalIndex !== "number" ||
      !Array.isArray(c?.keyPositions) ||
      !(c?.activeLayerIndices === null || Array.isArray(c?.activeLayerIndices)) ||
      !isExportedBinding(c?.binding)
    ) {
      return { error: `Malformed combo entry #${c?.originalIndex}` };
    }
  }

  if (!Array.isArray(doc.customBehaviors)) {
    return { error: "Missing custom behaviours" };
  }
  for (const cb of doc.customBehaviors as unknown[]) {
    const b = cb as Record<string, unknown>;
    if (
      typeof b?.originalId !== "number" ||
      typeof b?.displayName !== "string" ||
      typeof b?.kind !== "string" ||
      !Array.isArray(b?.config)
    ) {
      return { error: "Malformed custom behaviour entry" };
    }
  }

  return { ok: doc as unknown as BackupV1 };
}

function isExportedBinding(value: unknown): value is ExportedBinding {
  const b = value as Record<string, unknown> | undefined;
  return (
    typeof b === "object" &&
    b !== null &&
    typeof b.behaviorId === "number" &&
    typeof b.behaviorName === "string" &&
    typeof b.param1 === "number" &&
    typeof b.param2 === "number"
  );
}
