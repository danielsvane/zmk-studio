// Pure construction of a BackupV1 from already-fetched device state — no RPC,
// so it's trivially unit-testable and the export UI just feeds it the reads.

import type {
  Keymap,
  BehaviorBinding,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { Combos } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { CustomBehaviors } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import type { BehaviorMap } from "../rpc/fetchBehaviorMap";
import { matchDescriptor, validateValue } from "../behaviors/parameters";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupV1,
  type ExportedBinding,
  type ExportedCombo,
  type ExportedCustomBehavior,
} from "./backupFormat";
import { configValueToJson } from "./serializeConfigValue";

export interface BuildBackupArgs {
  keymap: Keymap;
  combos: Combos;
  customBehaviors: CustomBehaviors;
  behaviorMap: BehaviorMap;
  deviceInfo: { name: string; serialNumber: Uint8Array };
  exportedAt?: Date;
}

export function buildBackup({
  keymap,
  combos,
  customBehaviors,
  behaviorMap,
  deviceInfo,
  exportedAt,
}: BuildBackupArgs): BackupV1 {
  const layerIds = keymap.layers.map((l) => l.id);
  const behaviorName = (id: number) => behaviorMap[id]?.displayName;

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: (exportedAt ?? new Date()).toISOString(),
    device: {
      name: deviceInfo.name,
      serialNumberHex: bytesToHex(deviceInfo.serialNumber),
      keyPositionCount: keymap.layers[0]?.bindings.length ?? 0,
      maxLayerNameLength: keymap.maxLayerNameLength,
    },
    keymap: {
      layers: keymap.layers.map((layer) => ({
        name: layer.name,
        originalId: layer.id,
        bindings: layer.bindings.map((b) =>
          exportBinding(b, behaviorMap, layerIds)
        ),
      })),
    },
    combos: combos.combos.flatMap<ExportedCombo>((entry) =>
      entry.combo
        ? [
            {
              originalIndex: entry.index,
              keyPositions: [...entry.combo.keyPositions],
              activeLayerIndices: decodeLayerMask(entry.combo.layers),
              binding: exportBinding(
                // A combo without a binding can't exist (the editor requires
                // one); fall back to an empty binding rather than crash.
                entry.combo.binding ?? { behaviorId: 0, param1: 0, param2: 0 },
                behaviorMap,
                layerIds
              ),
              timeoutMs: entry.combo.timeoutMs,
              requirePriorIdleMs: entry.combo.requirePriorIdleMs,
              slowRelease: entry.combo.slowRelease,
            },
          ]
        : []
    ),
    customBehaviors: customBehaviors.behaviors.map<ExportedCustomBehavior>(
      (cb) => ({
        originalId: cb.id,
        displayName: cb.displayName,
        kind: cb.kind,
        config: cb.config.flatMap((field) =>
          field.value !== undefined
            ? [{ key: field.key, value: configValueToJson(field.value, behaviorName) }]
            : []
        ),
      })
    ),
  };
}

// A binding's params are opaque numbers on the wire; whether one is a layer id
// is only knowable from the behaviour's metadata. Mirror the keymap renderer's
// classification (Keymap.tsx) so what export marks as a layer id is exactly
// what the UI renders as a layer name — and what import must remap.
function exportBinding(
  binding: BehaviorBinding,
  behaviorMap: BehaviorMap,
  layerIds: number[]
): ExportedBinding {
  const behavior = behaviorMap[binding.behaviorId];
  const md = behavior?.metadata ?? [];
  const set =
    md.find((s) => validateValue(layerIds, binding.param1, s.param1)) ??
    (md.length === 1 ? md[0] : undefined);

  return {
    behaviorId: binding.behaviorId,
    behaviorName: behavior?.displayName ?? "",
    param1: binding.param1,
    param2: binding.param2,
    param1IsLayerId: !!matchDescriptor(layerIds, binding.param1, set?.param1)
      ?.layerId,
    param2IsLayerId: !!matchDescriptor(layerIds, binding.param2, set?.param2)
      ?.layerId,
  };
}

// Firmware semantics: mask 0 = active on all layers (see ComboEditor).
function decodeLayerMask(mask: number): number[] | null {
  if (mask === 0) return null;
  const indices: number[] = [];
  for (let i = 0; i < 32; i++) {
    if (mask & (1 << i)) indices.push(i);
  }
  return indices;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
