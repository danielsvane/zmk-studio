// Full-replace restore of a BackupV1 onto the connected device, ending with
// save_changes on all three subsystems. Best-effort: anything that doesn't fit
// (fewer combo slots, a behaviour name that no longer exists, fewer layers…)
// is skipped and reported, never thrown.
//
// The order matters and is the heart of the algorithm:
//   1. custom behaviours are recreated FIRST (bindings reference them), which
//      yields the oldId→newId map for every custom behaviour in the file;
//   2. the behaviour registry is re-fetched so built-in references can be
//      resolved by display name (built-in ids aren't stable across builds);
//   3. custom behaviour configs are applied in a second pass, so behaviorRef
//      fields that point at other behaviours resolve against the complete map;
//   4. layers are reconciled by count, yielding the oldLayerId→newLayerId map
//      that layer-id params (mo/lt/to…) are remapped through;
//   5. every binding, then the whole combo pool, is written with both maps.
//
// This module talks RPC only — no React state. The caller refreshes the UI
// afterwards (reset undo/redo + re-probe the connection context).

import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import {
  SetLayerBindingResponse,
  SetLayerPropsResponse,
  type BehaviorBinding,
  type Keymap,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import {
  SetComboResponse,
  AddComboErrorCode,
  RemoveComboErrorCode,
  type Combo,
} from "@zmkfirmware/zmk-studio-ts-client/combos";
import {
  SetCustomBehaviorResponse,
  AddCustomBehaviorErrorCode,
  type ConfigField,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { call_rpc } from "../rpc/logging";
import { fetchBehaviorMap } from "../rpc/fetchBehaviorMap";
import type { BackupV1, ExportedBinding } from "./backupFormat";
import { jsonToConfigValue } from "./serializeConfigValue";
import { createReport, skip, type ImportReport } from "./importReport";

export async function importBackup(
  conn: RpcConnection,
  backup: BackupV1
): Promise<ImportReport> {
  const report = createReport();

  // ---- Phase 1: full-replace the custom behaviour pool -------------------
  const currentCustoms = (
    await call_rpc(conn, { behaviors: { getCustomBehaviors: true } })
  ).behaviors?.getCustomBehaviors;
  if (!currentCustoms) {
    report.fatal = "Could not read the device's custom behaviours";
    return report;
  }

  for (const existing of currentCustoms.behaviors) {
    const resp = await call_rpc(conn, {
      behaviors: { removeCustomBehavior: { id: existing.id } },
    });
    // NOT_FOUND just means it's already gone; anything else is worth a note,
    // because a stale slot may shadow a slot the file wants.
    if (!resp.behaviors?.removeCustomBehavior?.ok) {
      skip(
        report,
        "customBehavior",
        `existing "${existing.displayName}"`,
        `could not remove pre-existing slot (err ${resp.behaviors?.removeCustomBehavior?.err})`
      );
    }
  }

  // Re-add with empty config (firmware seeds DT defaults); the full config —
  // possibly containing behaviorRef fields that need the complete id map —
  // is applied in the second pass below.
  const oldToNewCustomId = new Map<number, number>();
  for (const cb of backup.customBehaviors) {
    const resp = await call_rpc(conn, {
      behaviors: {
        addCustomBehavior: {
          kind: cb.kind,
          displayName: cb.displayName,
          config: [],
        },
      },
    });
    const ok = resp.behaviors?.addCustomBehavior?.ok;
    if (ok) {
      oldToNewCustomId.set(cb.originalId, ok.id);
    } else {
      const err = resp.behaviors?.addCustomBehavior?.err;
      const reason =
        err === AddCustomBehaviorErrorCode.ADD_CUSTOM_BEHAVIOR_ERR_NO_SPACE
          ? "no free pool slot"
          : `add failed (err ${err})`;
      skip(report, "customBehavior", `"${cb.displayName}"`, reason);
    }
  }

  // ---- Phase 2: behaviour resolver ----------------------------------------
  // Fetched AFTER the adds so the registry includes the new custom slots.
  const liveMap = await fetchBehaviorMap(conn);
  const nameToLiveId = new Map<string, number>();
  for (const details of Object.values(liveMap)) {
    if (nameToLiveId.has(details.displayName)) {
      console.warn(
        "Duplicate behaviour display name; name-resolution will pick the first:",
        details.displayName
      );
    } else {
      nameToLiveId.set(details.displayName, details.id);
    }
  }

  const resolveBehaviorId = (id: number, name: string): number | null => {
    // Custom behaviours from the file got fresh ids above.
    const remapped = oldToNewCustomId.get(id);
    if (remapped !== undefined) return remapped;
    // Prefer the exported id when it still names the same behaviour (the
    // common no-firmware-change case), else fall back to name resolution.
    if (liveMap[id]?.displayName === name) return id;
    const byName = nameToLiveId.get(name);
    if (byName !== undefined) return byName;
    return null;
  };

  // ---- Phase 3: second pass — custom behaviour configs --------------------
  for (const cb of backup.customBehaviors) {
    const newId = oldToNewCustomId.get(cb.originalId);
    if (newId === undefined) continue; // add failed; already reported

    const config: ConfigField[] = [];
    for (const field of cb.config) {
      const value = jsonToConfigValue(field.value, resolveBehaviorId);
      if (value === null) {
        skip(
          report,
          "configField",
          `"${cb.displayName}" / ${field.key}`,
          `referenced behaviour "${field.value.behaviorRef?.behaviorName}" not found`
        );
        continue;
      }
      // schema is response-only; the firmware matches by key on a set.
      config.push({ key: field.key, displayName: "", value, schema: undefined });
    }

    const resp = await call_rpc(conn, {
      behaviors: { setCustomBehavior: { id: newId, config } },
    });
    if (
      resp.behaviors?.setCustomBehavior ===
      SetCustomBehaviorResponse.SET_CUSTOM_BEHAVIOR_RESP_OK
    ) {
      report.applied.customBehaviors++;
    } else {
      skip(
        report,
        "customBehavior",
        `"${cb.displayName}"`,
        `config rejected (${resp.behaviors?.setCustomBehavior})`
      );
    }
  }

  // ---- Phase 4: reconcile layers ------------------------------------------
  const readKeymap = async (): Promise<Keymap | undefined> =>
    (await call_rpc(conn, { keymap: { getKeymap: true } })).keymap?.getKeymap;

  let keymap = await readKeymap();
  if (!keymap) {
    report.fatal = "Could not read the device's keymap";
    return report;
  }

  const wanted = backup.keymap.layers.length;
  while (keymap.layers.length < wanted) {
    const resp = await call_rpc(conn, { keymap: { addLayer: {} } });
    const ok = resp.keymap?.addLayer?.ok;
    if (!ok?.layer) {
      skip(
        report,
        "layer",
        `layer ${keymap.layers.length}`,
        `device has no spare layers (err ${resp.keymap?.addLayer?.err}); this and later layers dropped`
      );
      break;
    }
    keymap.layers.push(ok.layer);
  }
  while (keymap.layers.length > wanted) {
    const resp = await call_rpc(conn, {
      keymap: { removeLayer: { layerIndex: keymap.layers.length - 1 } },
    });
    if (!resp.keymap?.removeLayer?.ok) {
      skip(
        report,
        "layer",
        `extra device layer ${keymap.layers.length - 1}`,
        `could not remove (err ${resp.keymap?.removeLayer?.err})`
      );
      break;
    }
    keymap.layers.pop();
  }

  // Re-read so layer ids are exactly what the device reports after the
  // add/remove churn, then map exported layer ids → live ids by position.
  keymap = await readKeymap();
  if (!keymap) {
    report.fatal = "Could not re-read the keymap after layer reconciliation";
    return report;
  }

  const layerCount = Math.min(wanted, keymap.layers.length);
  const oldToNewLayerId = new Map<number, number>();
  for (let i = 0; i < layerCount; i++) {
    oldToNewLayerId.set(backup.keymap.layers[i].originalId, keymap.layers[i].id);
  }

  for (let i = 0; i < layerCount; i++) {
    const live = keymap.layers[i];
    const wantedLayer = backup.keymap.layers[i];
    if (live.name !== wantedLayer.name) {
      const resp = await call_rpc(conn, {
        keymap: { setLayerProps: { layerId: live.id, name: wantedLayer.name } },
      });
      if (
        resp.keymap?.setLayerProps !==
        SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK
      ) {
        skip(
          report,
          "layer",
          `layer ${i} ("${wantedLayer.name}")`,
          `rename failed (${resp.keymap?.setLayerProps})`
        );
      }
    }
    report.applied.layers++;
  }

  // Resolve an exported binding to a live wire binding, remapping the
  // behaviour id and any layer-id params. Null (with a report entry) when
  // something doesn't resolve — the caller leaves that position untouched.
  const resolveBinding = (
    b: ExportedBinding,
    location: string,
    kind: "binding" | "combo"
  ): BehaviorBinding | null => {
    const behaviorId = resolveBehaviorId(b.behaviorId, b.behaviorName);
    if (behaviorId === null) {
      skip(report, kind, location, `behaviour "${b.behaviorName}" not found`);
      return null;
    }
    let { param1, param2 } = b;
    if (b.param1IsLayerId) {
      const mapped = oldToNewLayerId.get(param1);
      if (mapped === undefined) {
        skip(report, kind, location, `target layer of param1 was dropped`);
        return null;
      }
      param1 = mapped;
    }
    if (b.param2IsLayerId) {
      const mapped = oldToNewLayerId.get(param2);
      if (mapped === undefined) {
        skip(report, kind, location, `target layer of param2 was dropped`);
        return null;
      }
      param2 = mapped;
    }
    return { behaviorId, param1, param2 };
  };

  // ---- Phase 5: bindings ----------------------------------------------------
  for (let i = 0; i < layerCount; i++) {
    const live = keymap.layers[i];
    const wantedLayer = backup.keymap.layers[i];
    for (let pos = 0; pos < wantedLayer.bindings.length; pos++) {
      const location = `layer ${i} ("${wantedLayer.name}") / key ${pos}`;
      if (pos >= live.bindings.length) {
        skip(report, "binding", location, "key position not on this keyboard");
        continue;
      }
      const binding = resolveBinding(wantedLayer.bindings[pos], location, "binding");
      if (!binding) continue;

      const resp = await call_rpc(conn, {
        keymap: {
          setLayerBinding: { layerId: live.id, keyPosition: pos, binding },
        },
      });
      if (
        resp.keymap?.setLayerBinding ===
        SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
      ) {
        report.applied.bindings++;
      } else {
        skip(
          report,
          "binding",
          location,
          `device rejected binding (${resp.keymap?.setLayerBinding})`
        );
      }
    }
  }

  // ---- Phase 6: full-replace the combo pool ---------------------------------
  const currentCombos = (await call_rpc(conn, { combos: { getCombos: true } }))
    .combos?.getCombos;
  if (!currentCombos) {
    report.fatal = "Could not read the device's combos";
    return report;
  }

  for (const entry of currentCombos.combos) {
    const resp = await call_rpc(conn, {
      combos: { removeCombo: { index: entry.index } },
    });
    if (
      !resp.combos?.removeCombo?.ok &&
      resp.combos?.removeCombo?.err !==
        RemoveComboErrorCode.REMOVE_COMBO_ERR_INVALID_INDEX
    ) {
      skip(
        report,
        "combo",
        `existing combo #${entry.index}`,
        `could not remove (err ${resp.combos?.removeCombo?.err})`
      );
    }
  }

  for (const c of backup.combos) {
    const location = `combo #${c.originalIndex}`;

    if (c.keyPositions.length > currentCombos.maxKeysPerCombo) {
      skip(
        report,
        "combo",
        location,
        `${c.keyPositions.length} keys exceeds this firmware's limit of ${currentCombos.maxKeysPerCombo}`
      );
      continue;
    }

    const binding = resolveBinding(c.binding, location, "combo");
    if (!binding) continue;

    // Re-encode layer indices → bitmask against the layer count we ended up
    // with. Indices past the end are dropped with a note, the combo still
    // applies on the rest (an empty result would mean "all layers", which is
    // NOT what a now-unreachable selection meant — skip in that case).
    let layers = 0;
    if (c.activeLayerIndices !== null) {
      const inRange = c.activeLayerIndices.filter((i) => i < layerCount);
      if (inRange.length < c.activeLayerIndices.length) {
        skip(
          report,
          "combo",
          location,
          "some target layers were dropped; combo kept on the remaining ones"
        );
      }
      if (inRange.length === 0) {
        skip(report, "combo", location, "all target layers were dropped");
        continue;
      }
      for (const i of inRange) layers |= 1 << i;
    }

    const combo: Combo = {
      keyPositions: [...c.keyPositions],
      layers,
      binding,
      timeoutMs: c.timeoutMs,
      requirePriorIdleMs: c.requirePriorIdleMs,
      slowRelease: c.slowRelease,
    };

    // Prefer the original pool slot (set_combo doubles as create-at-index on a
    // freed slot); fall back to add_combo, which picks the lowest free slot.
    let applied = false;
    if (c.originalIndex < currentCombos.maxCombos) {
      const resp = await call_rpc(conn, {
        combos: { setCombo: { index: c.originalIndex, combo } },
      });
      applied = resp.combos?.setCombo === SetComboResponse.SET_COMBO_RESP_OK;
    }
    if (!applied) {
      const resp = await call_rpc(conn, { combos: { addCombo: { combo } } });
      if (resp.combos?.addCombo?.ok) {
        applied = true;
      } else {
        const err = resp.combos?.addCombo?.err;
        const reason =
          err === AddComboErrorCode.ADD_COMBO_ERR_NO_SPACE
            ? "no free combo slot"
            : `device rejected combo (err ${err})`;
        skip(report, "combo", location, reason);
      }
    }
    if (applied) {
      report.applied.combos++;
    }
  }

  // ---- Phase 7: persist -------------------------------------------------------
  const keymapSave = await call_rpc(conn, { keymap: { saveChanges: true } });
  if (!keymapSave.keymap?.saveChanges || keymapSave.keymap.saveChanges.err) {
    skip(report, "save", "keymap", `save failed (err ${keymapSave.keymap?.saveChanges?.err})`);
  }
  const combosSave = await call_rpc(conn, { combos: { saveChanges: true } });
  if (!combosSave.combos?.saveChanges || combosSave.combos.saveChanges.err) {
    skip(report, "save", "combos", `save failed (err ${combosSave.combos?.saveChanges?.err})`);
  }
  const behaviorsSave = await call_rpc(conn, {
    behaviors: { saveChanges: true },
  });
  if (
    !behaviorsSave.behaviors?.saveChanges ||
    behaviorsSave.behaviors.saveChanges.err
  ) {
    skip(
      report,
      "save",
      "behaviours",
      `save failed (err ${behaviorsSave.behaviors?.saveChanges?.err})`
    );
  }

  return report;
}
