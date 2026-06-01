import React, {
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Request } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "../rpc/logging";
import {
  PhysicalLayout,
  Keymap,
  SetLayerBindingResponse,
  SetLayerPropsResponse,
  BehaviorBinding,
  Layer,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import {
  type GetBehaviorDetailsResponse,
  type CustomBehaviors,
  type CustomBehavior,
  type ConfigValue,
  SetCustomBehaviorResponse,
  AddCustomBehaviorErrorCode,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import {
  type Combo,
  type Combos,
  SetComboResponse,
  AddComboErrorCode,
} from "@zmkfirmware/zmk-studio-ts-client/combos";

import { LayerPicker } from "./LayerPicker";
import { PhysicalLayoutPicker } from "./PhysicalLayoutPicker";
import { Keymap as KeymapComp } from "./Keymap";
import { ComboList } from "./ComboList";
import { ComboEditor } from "../combos/ComboEditor";
import { useConnectedDeviceData } from "../rpc/useConnectedDeviceData";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { UndoRedoContext } from "../undoRedo";
import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { produce, type Draft } from "immer";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { deserializeLayoutZoom, type LayoutZoom } from "./layoutZoom";
import { Select } from "../misc/Select";
import { Button } from "../misc/Button";
import { ConfigFieldEdit } from "../behaviours/ConfigFieldEditor";
import { BehaviourNameEditor } from "../behaviours/BehaviourNameEditor";

// useConnectedDeviceData state is `T | undefined` until the device responds.
// These mutation handlers only fire once data is loaded, so this wraps an immer
// recipe to give it a non-null draft (and safely no-ops if state is still
// undefined), keeping every call site free of repeated null guards.
function editData<T>(recipe: (draft: Draft<T>) => void) {
  return produce((draft: Draft<T> | undefined) => {
    if (draft) recipe(draft);
  });
}

// Keymap zoom levels for the overlay picker. Keys are the serialized zoom value
// (see deserializeLayoutZoom); "auto" fits the layout to the available space.
const SCALE_ITEMS = [
  { id: "auto", name: "Auto" },
  { id: "0.25", name: "25%" },
  { id: "0.5", name: "50%" },
  { id: "0.75", name: "75%" },
  { id: "1", name: "100%" },
  { id: "1.25", name: "125%" },
  { id: "1.5", name: "150%" },
  { id: "2", name: "200%" },
];
import { useLocalStorageState } from "../misc/useLocalStorageState";

/** Top-level sections selectable from the header navigation. */
export type Page = "layers" | "combos" | "behaviours";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

// Returns the behaviour map plus a `refresh` callback. The map is fetched on
// connect/unlock; `refresh` re-fetches it so a behaviour claimed at runtime
// (add_custom_behavior) shows up in the binding pickers without a reconnect.
function useBehaviors(): [BehaviorMap, () => Promise<void>] {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);

  const [behaviors, setBehaviors] = useState<BehaviorMap>({});

  const fetchBehaviorMap = useCallback(async (): Promise<BehaviorMap> => {
    const conn = connection.conn;
    if (!conn || lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
      return {};
    }

    const get_behaviors: Request = {
      behaviors: { listAllBehaviors: true },
      requestId: 0,
    };

    const behavior_list = await call_rpc(conn, get_behaviors);
    const behavior_map: BehaviorMap = {};
    for (const behaviorId of behavior_list.behaviors?.listAllBehaviors
      ?.behaviors || []) {
      const details_req = {
        behaviors: { getBehaviorDetails: { behaviorId } },
        requestId: 0,
      };
      const behavior_details = await call_rpc(conn, details_req);
      const dets: GetBehaviorDetailsResponse | undefined =
        behavior_details?.behaviors?.getBehaviorDetails;

      if (dets) {
        behavior_map[dets.id] = dets;
      }
    }
    return behavior_map;
  }, [connection, lockState]);

  const refresh = useCallback(async () => {
    setBehaviors(await fetchBehaviorMap());
  }, [fetchBehaviorMap]);

  useEffect(() => {
    let ignore = false;
    setBehaviors({});
    fetchBehaviorMap().then((map) => {
      if (!ignore) {
        setBehaviors(map);
      }
    });

    return () => {
      ignore = true;
    };
  }, [fetchBehaviorMap]);

  return [behaviors, refresh];
}

function useLayouts(): [
  PhysicalLayout[] | undefined,
  React.Dispatch<SetStateAction<PhysicalLayout[] | undefined>>,
  number,
  React.Dispatch<SetStateAction<number>>
] {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);

  const [layouts, setLayouts] = useState<PhysicalLayout[] | undefined>(
    undefined
  );
  const [selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex] =
    useState<number>(0);

  useEffect(() => {
    if (
      !connection.conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setLayouts(undefined);
      return;
    }

    async function startRequest() {
      setLayouts(undefined);

      if (!connection.conn) {
        return;
      }

      const response = await call_rpc(connection.conn, {
        keymap: { getPhysicalLayouts: true },
      });

      if (!ignore) {
        setLayouts(response?.keymap?.getPhysicalLayouts?.layouts);
        setSelectedPhysicalLayoutIndex(
          response?.keymap?.getPhysicalLayouts?.activeLayoutIndex || 0
        );
      }
    }

    let ignore = false;
    startRequest();

    return () => {
      ignore = true;
    };
  }, [connection, lockState]);

  return [
    layouts,
    setLayouts,
    selectedPhysicalLayoutIndex,
    setSelectedPhysicalLayoutIndex,
  ];
}

// Behaviour kinds the "Add" button can claim from the spare pool. The `kind`
// string must match a runtime descriptor's `kind` in the firmware (see each
// driver's *_descriptor). The config form is rendered generically from the
// schema, so no per-kind UI is needed — adding a kind here + a firmware pool is
// the whole story (M10).
const ADDABLE_KINDS: { kind: string; label: string }[] = [
  { kind: "hold-tap", label: "hold-tap" },
  { kind: "sticky-key", label: "sticky-key" },
];

export default function Keyboard({ page }: { page: Page }) {
  const [
    layouts,
    ,
    selectedPhysicalLayoutIndex,
    setSelectedPhysicalLayoutIndex,
  ] = useLayouts();
  const [keymap, setKeymap] = useConnectedDeviceData<Keymap>(
    { keymap: { getKeymap: true } },
    (keymap) => {
      console.log("Got the keymap!");
      return keymap?.keymap?.getKeymap;
    },
    true
  );

  // Read the combos, now editable in place (M2: RAM-only, lost on reboot).
  const [combos, setCombos] = useConnectedDeviceData<Combos>(
    { combos: { getCombos: true } },
    (resp) => resp?.combos?.getCombos,
    true
  );

  const [selectedComboIndex, setSelectedComboIndex] = useState<
    number | undefined
  >(undefined);

  // Read the custom-behaviour pool, now editable in place (M3: RAM-only, lost
  // on reboot) via the generic schema-driven config editor.
  const [customBehaviors, setCustomBehaviors] =
    useConnectedDeviceData<CustomBehaviors>(
      { behaviors: { getCustomBehaviors: true } },
      (resp) => resp?.behaviors?.getCustomBehaviors,
      true
    );

  const [keymapScale, setKeymapScale] = useLocalStorageState<LayoutZoom>("keymapScale", "auto", {
    deserialize: deserializeLayoutZoom,
  });

  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [selectedKeyPosition, setSelectedKeyPosition] = useState<
    number | undefined
  >(undefined);
  const [behaviors, refreshBehaviors] = useBehaviors();

  const conn = useContext(ConnectionContext);
  const undoRedo = useContext(UndoRedoContext);

  useEffect(() => {
    setSelectedLayerIndex(0);
    setSelectedKeyPosition(undefined);
    setSelectedComboIndex(undefined);
  }, [conn]);

  useEffect(() => {
    async function performSetRequest() {
      if (!conn.conn || !layouts) {
        return;
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { setActivePhysicalLayout: selectedPhysicalLayoutIndex },
      });

      const new_keymap = resp?.keymap?.setActivePhysicalLayout?.ok;
      if (new_keymap) {
        setKeymap(new_keymap);
      } else {
        console.error(
          "Failed to set the active physical layout err:",
          resp?.keymap?.setActivePhysicalLayout?.err
        );
      }
    }

    performSetRequest();
  }, [selectedPhysicalLayoutIndex]);

  const doSelectPhysicalLayout = useCallback(
    (i: number) => {
      const oldLayout = selectedPhysicalLayoutIndex;
      undoRedo?.(async () => {
        setSelectedPhysicalLayoutIndex(i);

        return async () => {
          setSelectedPhysicalLayoutIndex(oldLayout);
        };
      });
    },
    [undoRedo, selectedPhysicalLayoutIndex]
  );

  const doUpdateBinding = useCallback(
    (binding: BehaviorBinding) => {
      if (!keymap || selectedKeyPosition === undefined) {
        console.error(
          "Can't update binding without a selected key position and loaded keymap"
        );
        return;
      }

      const layer = selectedLayerIndex;
      const layerId = keymap.layers[layer].id;
      const keyPosition = selectedKeyPosition;
      const oldBinding = keymap.layers[layer].bindings[keyPosition];
      undoRedo?.(async () => {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          keymap: { setLayerBinding: { layerId, keyPosition, binding } },
        });

        if (
          resp.keymap?.setLayerBinding ===
          SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
        ) {
          setKeymap(
            editData<Keymap>((draft) => {
              draft.layers[layer].bindings[keyPosition] = binding;
            })
          );
        } else {
          console.error("Failed to set binding", resp.keymap?.setLayerBinding);
        }

        return async () => {
          if (!conn.conn) {
            return;
          }

          const resp = await call_rpc(conn.conn, {
            keymap: {
              setLayerBinding: { layerId, keyPosition, binding: oldBinding },
            },
          });
          if (
            resp.keymap?.setLayerBinding ===
            SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
          ) {
            setKeymap(
              editData<Keymap>((draft) => {
                draft.layers[layer].bindings[keyPosition] = oldBinding;
              })
            );
          }
        };
      });
    },
    [conn, keymap, undoRedo, selectedLayerIndex, selectedKeyPosition]
  );

  const selectedBinding = useMemo(() => {
    if (keymap == null || selectedKeyPosition == null || !keymap.layers[selectedLayerIndex]) {
      return null;
    }

    return keymap.layers[selectedLayerIndex].bindings[selectedKeyPosition];
  }, [keymap, selectedLayerIndex, selectedKeyPosition]);

  const selectedCombo = useMemo(() => {
    if (!combos || selectedComboIndex === undefined) {
      return null;
    }
    return (
      combos.combos.find((entry) => entry.index === selectedComboIndex) ?? null
    );
  }, [combos, selectedComboIndex]);

  const doApplyCombo = useCallback(
    (index: number, combo: Combo) => {
      if (!combos) {
        return;
      }

      const oldEntry = combos.combos.find((entry) => entry.index === index);
      const oldCombo = oldEntry?.combo;
      if (!oldCombo) {
        console.error("Can't edit a combo that isn't loaded", index);
        return;
      }

      const setCombo = async (target: Combo) => {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          combos: { setCombo: { index, combo: target } },
        });

        const result = resp.combos?.setCombo;
        if (result === SetComboResponse.SET_COMBO_RESP_OK) {
          setCombos(
            editData<Combos>((draft) => {
              const entry = draft.combos.find((e) => e.index === index);
              if (entry) {
                entry.combo = target;
              }
            })
          );
        } else {
          console.error("Failed to set combo", result);
        }
      };

      undoRedo?.(async () => {
        await setCombo(combo);
        return async () => {
          await setCombo(oldCombo);
        };
      });
    },
    [combos, conn, undoRedo, setCombos]
  );

  // Edit one config field of a custom behaviour in place (M3: RAM-only). We send
  // only the changed field (matched by key in the firmware) and optimistically
  // update local state; undo restores the previous value via the same RPC.
  const doApplyConfigField = useCallback(
    (behaviorId: number, fieldKey: string, newValue: ConfigValue, oldValue: ConfigValue) => {
      const setField = async (value: ConfigValue) => {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          behaviors: {
            setCustomBehavior: {
              id: behaviorId,
              // schema is response-only; the firmware matches by key and ignores
              // it on a set, so we omit it to keep the request small.
              config: [{ key: fieldKey, displayName: "", value, schema: undefined }],
            },
          },
        });

        const result = resp.behaviors?.setCustomBehavior;
        if (result === SetCustomBehaviorResponse.SET_CUSTOM_BEHAVIOR_RESP_OK) {
          setCustomBehaviors(
            editData<CustomBehaviors>((draft) => {
              const beh = draft.behaviors.find((b) => b.id === behaviorId);
              const field = beh?.config.find((f) => f.key === fieldKey);
              if (field) {
                field.value = value;
              }
            })
          );
        } else {
          console.error("Failed to set custom behaviour field", result);
        }
      };

      undoRedo?.(async () => {
        await setField(newValue);
        return async () => {
          await setField(oldValue);
        };
      });
    },
    [conn, undoRedo, setCustomBehaviors]
  );

  // Rename a custom behaviour (M9). Reuses set_custom_behavior, which carries an
  // optional display_name; we send the name only (no config fields) and update
  // both the behaviours list and the binding-picker map so the new label shows
  // everywhere. Undo restores the previous name.
  const doRenameBehavior = useCallback(
    (behaviorId: number, newName: string, oldName: string) => {
      const setName = async (name: string) => {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          behaviors: {
            setCustomBehavior: { id: behaviorId, config: [], displayName: name },
          },
        });

        const result = resp.behaviors?.setCustomBehavior;
        if (result === SetCustomBehaviorResponse.SET_CUSTOM_BEHAVIOR_RESP_OK) {
          setCustomBehaviors(
            editData<CustomBehaviors>((draft) => {
              const beh = draft.behaviors.find((b) => b.id === behaviorId);
              if (beh) {
                beh.displayName = name;
              }
            })
          );
          // Keep the binding-picker label in sync without a reconnect.
          await refreshBehaviors();
        } else {
          console.error("Failed to rename custom behaviour", result);
        }
      };

      undoRedo?.(async () => {
        await setName(newName);
        return async () => {
          await setName(oldName);
        };
      });
    },
    [conn, undoRedo, setCustomBehaviors, refreshBehaviors]
  );

  // Claim a new custom behaviour from the spare pool (M4: RAM-only, lost on
  // reboot). `kind` selects which spare pool to draw from (M10 proves the path
  // is kind-agnostic — the firmware matches the kind string against each pool
  // slot's descriptor). The firmware seeds the slot with its DT defaults, which
  // the user then edits via the generic config form. The claimed behaviour
  // immediately appears in get_custom_behaviors AND in list_all_behaviors, so we
  // refresh the binding-picker map to make it selectable as a keymap/combo
  // binding without reconnecting.
  // Which spare pool the "Add" button claims from. Kinds are hardcoded here
  // (there's no list-available-kinds RPC); the firmware rejects an unknown kind
  // with NO_SPACE. Adding a kind to the firmware pool + this list is all it
  // takes to offer it — the config form renders generically (M10).
  const [newBehaviourKind, setNewBehaviourKind] = useState(ADDABLE_KINDS[0].kind);

  const addCustomBehavior = useCallback(
    async (kind: string) => {
    if (!conn.conn) {
      return;
    }

    const name = window.prompt(
      `Name for the new ${kind} behaviour:`,
      kind === "hold-tap" ? "hrml" : ""
    );
    if (name === null) {
      return; // cancelled
    }

    const resp = await call_rpc(conn.conn, {
      behaviors: {
        addCustomBehavior: { kind, displayName: name, config: [] },
      },
    });

    const ok = resp.behaviors?.addCustomBehavior?.ok;
    if (ok?.behavior) {
      const behavior = ok.behavior as CustomBehavior;
      setCustomBehaviors(
        editData<CustomBehaviors>((draft) => {
          if (!draft.behaviors) {
            draft.behaviors = [];
          }
          draft.behaviors.push(behavior);
        })
      );
      // Make the new behaviour selectable as a binding right away.
      await refreshBehaviors();
      return;
    }

    const err = resp.behaviors?.addCustomBehavior?.err;
    console.error("Add custom behaviour error", err);
    // TODO: replace window.alert with a proper toast (matches App.tsx).
    if (err === AddCustomBehaviorErrorCode.ADD_CUSTOM_BEHAVIOR_ERR_NO_SPACE) {
      window.alert(`Can't add another behaviour: the ${kind} pool is full.`);
    } else {
      window.alert("Failed to add the behaviour.");
    }
    },
    [conn, refreshBehaviors, setCustomBehaviors]
  );

  // Delete a custom behaviour (M8: RAM-only until saved). Frees the pool slot;
  // the behaviour vanishes from the list and from the binding picker. Undo
  // re-claims a slot of the same kind and re-seeds the captured config — in the
  // common case (deleting then immediately undoing) the freed slot is the first
  // free one, so the same physical slot and stable local_id come back, keeping
  // any existing bindings intact.
  const removeCustomBehavior = useCallback(
    (behaviorId: number) => {
      const oldBehaviour = customBehaviors?.behaviors.find(
        (b) => b.id === behaviorId
      );
      if (!oldBehaviour) {
        console.error("Can't delete a behaviour that isn't loaded", behaviorId);
        return;
      }

      async function remove() {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          behaviors: { removeCustomBehavior: { id: behaviorId } },
        });

        if (resp.behaviors?.removeCustomBehavior?.ok) {
          setCustomBehaviors(
            editData<CustomBehaviors>((draft) => {
              const i = draft.behaviors.findIndex(
                (b) => b.id === behaviorId
              );
              if (i >= 0) {
                draft.behaviors.splice(i, 1);
              }
            })
          );
          // Drop it from the binding-picker map too.
          await refreshBehaviors();
        } else {
          console.error(
            "Remove behaviour error",
            resp.behaviors?.removeCustomBehavior?.err
          );
          throw new Error(
            "Failed to remove behaviour: " +
              resp.behaviors?.removeCustomBehavior?.err
          );
        }
      }

      async function restore(behaviour: CustomBehavior) {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          behaviors: {
            addCustomBehavior: {
              kind: behaviour.kind,
              displayName: behaviour.displayName,
              // Re-seed every field so the restored slot matches what was
              // deleted (schema is response-only; the firmware matches by key).
              config: behaviour.config.map((f) => ({
                key: f.key,
                displayName: "",
                value: f.value,
                schema: undefined,
              })),
            },
          },
        });

        const ok = resp.behaviors?.addCustomBehavior?.ok;
        if (ok?.behavior) {
          const behavior = ok.behavior;
          setCustomBehaviors(
            editData<CustomBehaviors>((draft) => {
              if (!draft.behaviors) {
                draft.behaviors = [];
              }
              draft.behaviors.push(behavior);
            })
          );
          await refreshBehaviors();
        } else {
          console.error(
            "Restore behaviour error",
            resp.behaviors?.addCustomBehavior?.err
          );
        }
      }

      undoRedo?.(async () => {
        await remove();
        return async () => {
          await restore(oldBehaviour);
        };
      });
    },
    [conn, customBehaviors, refreshBehaviors, setCustomBehaviors, undoRedo]
  );

  // Add a brand-new combo (M4). Seeds sensible defaults (keys 0,1 -> the first
  // available behavior) so the new combo is valid the moment it's created; the
  // user then refines it in the editor. The firmware assigns the pool slot and
  // returns its index, which we select for editing. Undo deletes it.
  const addCombo = useCallback(() => {
    // Returns the assigned pool index, or -1 if the add failed (already
    // surfaced to the user). We never throw out of the undoRedo callback: a
    // throw there leaves the undo/redo system permanently locked.
    async function doAdd(): Promise<number> {
      if (!conn.conn) {
        throw new Error("Not connected");
      }

      const behaviorList = Object.values(behaviors);
      if (behaviorList.length === 0) {
        throw new Error("No behaviors available to seed a new combo");
      }

      const newCombo: Combo = {
        keyPositions: [0, 1],
        layers: 0,
        binding: { behaviorId: behaviorList[0].id, param1: 0, param2: 0 },
        timeoutMs: 50,
        requirePriorIdleMs: -1,
        slowRelease: false,
      };

      const resp = await call_rpc(conn.conn, {
        combos: { addCombo: { combo: newCombo } },
      });

      const ok = resp.combos?.addCombo?.ok;
      if (ok) {
        setCombos(
          editData<Combos>((draft) => {
            draft.combos.push({ index: ok.index, combo: ok.combo ?? newCombo });
            draft.combos.sort((a, b) => a.index - b.index);
          })
        );
        setSelectedComboIndex(ok.index);
        return ok.index;
      }

      const err = resp.combos?.addCombo?.err;
      console.error("Add combo error", err);
      // TODO: replace window.alert with a proper toast (matches App.tsx).
      if (err === AddComboErrorCode.ADD_COMBO_ERR_NO_SPACE) {
        window.alert(
          "Can't add another combo: the combo pool is full. Delete an existing combo to make room."
        );
      } else {
        window.alert("Failed to add the combo.");
      }
      return -1;
    }

    async function doRemove(index: number) {
      if (!conn.conn) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        combos: { removeCombo: { index } },
      });

      if (resp.combos?.removeCombo?.ok) {
        setCombos(
          editData<Combos>((draft) => {
            const i = draft.combos.findIndex((e) => e.index === index);
            if (i >= 0) {
              draft.combos.splice(i, 1);
            }
          })
        );
        setSelectedComboIndex(undefined);
      } else {
        console.error("Remove combo error", resp.combos?.removeCombo?.err);
        throw new Error(
          "Failed to remove combo: " + resp.combos?.removeCombo?.err
        );
      }
    }

    undoRedo?.(async () => {
      const index = await doAdd();
      if (index < 0) {
        // Nothing was created (e.g. pool full) — undo is a no-op.
        return async () => {};
      }
      return () => doRemove(index);
    });
  }, [conn, undoRedo, behaviors, setCombos]);

  // Delete an existing combo (M4). The pool index is stable, so undo re-creates
  // it at the same slot via setCombo (which doubles as "create at index").
  const doRemoveCombo = useCallback(
    (index: number) => {
      if (!combos) {
        return;
      }

      const oldEntry = combos.combos.find((entry) => entry.index === index);
      const oldCombo = oldEntry?.combo;
      if (!oldCombo) {
        console.error("Can't delete a combo that isn't loaded", index);
        return;
      }

      async function remove() {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          combos: { removeCombo: { index } },
        });

        if (resp.combos?.removeCombo?.ok) {
          setCombos(
            editData<Combos>((draft) => {
              const i = draft.combos.findIndex((e) => e.index === index);
              if (i >= 0) {
                draft.combos.splice(i, 1);
              }
            })
          );
          setSelectedComboIndex(undefined);
        } else {
          console.error("Remove combo error", resp.combos?.removeCombo?.err);
          throw new Error(
            "Failed to remove combo: " + resp.combos?.removeCombo?.err
          );
        }
      }

      async function restore(combo: Combo) {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          combos: { setCombo: { index, combo } },
        });

        if (resp.combos?.setCombo === SetComboResponse.SET_COMBO_RESP_OK) {
          setCombos(
            editData<Combos>((draft) => {
              draft.combos.push({ index, combo });
              draft.combos.sort((a, b) => a.index - b.index);
            })
          );
          setSelectedComboIndex(index);
        } else {
          console.error("Restore combo error", resp.combos?.setCombo);
        }
      }

      undoRedo?.(async () => {
        await remove();
        return async () => {
          await restore(oldCombo);
        };
      });
    },
    [combos, conn, undoRedo, setCombos]
  );

  const moveLayer = useCallback(
    (start: number, end: number) => {
      const doMove = async (startIndex: number, destIndex: number) => {
        if (!conn.conn) {
          return;
        }

        const resp = await call_rpc(conn.conn, {
          keymap: { moveLayer: { startIndex, destIndex } },
        });

        if (resp.keymap?.moveLayer?.ok) {
          setKeymap(resp.keymap?.moveLayer?.ok);
          setSelectedLayerIndex(destIndex);
        } else {
          console.error("Error moving", resp);
        }
      };

      undoRedo?.(async () => {
        await doMove(start, end);
        return () => doMove(end, start);
      });
    },
    [undoRedo]
  );

  const addLayer = useCallback(() => {
    async function doAdd(): Promise<number> {
      if (!conn.conn || !keymap) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, { keymap: { addLayer: {} } });

      if (resp.keymap?.addLayer?.ok) {
        const newSelection = keymap.layers.length;
        setKeymap(
          editData<Keymap>((draft) => {
            draft.layers.push(resp.keymap!.addLayer!.ok!.layer!);
            draft.availableLayers--;
          })
        );

        setSelectedLayerIndex(newSelection);

        return resp.keymap.addLayer.ok.index;
      } else {
        console.error("Add error", resp.keymap?.addLayer?.err);
        throw new Error("Failed to add layer:" + resp.keymap?.addLayer?.err);
      }
    }

    async function doRemove(layerIndex: number) {
      if (!conn.conn) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { removeLayer: { layerIndex } },
      });

      console.log(resp);
      if (resp.keymap?.removeLayer?.ok) {
        setKeymap(
          editData<Keymap>((draft) => {
            draft.layers.splice(layerIndex, 1);
            draft.availableLayers++;
          })
        );
      } else {
        console.error("Remove error", resp.keymap?.removeLayer?.err);
        throw new Error(
          "Failed to remove layer:" + resp.keymap?.removeLayer?.err
        );
      }
    }

    undoRedo?.(async () => {
      const index = await doAdd();
      return () => doRemove(index);
    });
  }, [conn, undoRedo, keymap]);

  const removeLayer = useCallback(() => {
    async function doRemove(layerIndex: number): Promise<void> {
      if (!conn.conn || !keymap) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { removeLayer: { layerIndex } },
      });

      if (resp.keymap?.removeLayer?.ok) {
        if (layerIndex == keymap.layers.length - 1) {
          setSelectedLayerIndex(layerIndex - 1);
        }
        setKeymap(
          editData<Keymap>((draft) => {
            draft.layers.splice(layerIndex, 1);
            draft.availableLayers++;
          })
        );
      } else {
        console.error("Remove error", resp.keymap?.removeLayer?.err);
        throw new Error(
          "Failed to remove layer:" + resp.keymap?.removeLayer?.err
        );
      }
    }

    async function doRestore(layerId: number, atIndex: number) {
      if (!conn.conn) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { restoreLayer: { layerId, atIndex } },
      });

      console.log(resp);
      if (resp.keymap?.restoreLayer?.ok) {
        setKeymap(
          editData<Keymap>((draft) => {
            draft.layers.splice(atIndex, 0, resp!.keymap!.restoreLayer!.ok!);
            draft.availableLayers--;
          })
        );
        setSelectedLayerIndex(atIndex);
      } else {
        console.error("Remove error", resp.keymap?.restoreLayer?.err);
        throw new Error(
          "Failed to restore layer:" + resp.keymap?.restoreLayer?.err
        );
      }
    }

    if (!keymap) {
      throw new Error("No keymap loaded");
    }

    const index = selectedLayerIndex;
    const layerId = keymap.layers[index].id;
    undoRedo?.(async () => {
      await doRemove(index);
      return () => doRestore(layerId, index);
    });
  }, [conn, undoRedo, selectedLayerIndex]);

  const changeLayerName = useCallback(
    (id: number, oldName: string, newName: string) => {
      async function changeName(layerId: number, name: string) {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          keymap: { setLayerProps: { layerId, name } },
        });

        if (
          resp.keymap?.setLayerProps ==
          SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK
        ) {
          setKeymap(
            editData<Keymap>((draft) => {
              const layer_index = draft.layers.findIndex(
                (l: Layer) => l.id == layerId
              );
              draft.layers[layer_index].name = name;
            })
          );
        } else {
          throw new Error(
            "Failed to change layer name:" + resp.keymap?.setLayerProps
          );
        }
      }

      undoRedo?.(async () => {
        await changeName(id, newName);
        return async () => {
          await changeName(id, oldName);
        };
      });
    },
    [conn, undoRedo, keymap]
  );

  useEffect(() => {
    if (!keymap?.layers) return;

    const layers = keymap.layers.length - 1;

    if (selectedLayerIndex > layers) {
      setSelectedLayerIndex(layers);
    }
  }, [keymap, selectedLayerIndex]);

  if (page === "behaviours") {
    const behaviours = customBehaviors?.behaviors ?? [];
    const poolFull =
      customBehaviors?.max !== undefined &&
      behaviours.length >= customBehaviors.max;
    // Raw key positions aren't remapped across layouts, so any layout is just a
    // visual aid for the key-position picker; use the active/selected one.
    const layoutKeys = layouts?.[selectedPhysicalLayoutIndex]?.keys;
    return (
      <div className="bg-base-300 max-w-full min-w-0 min-h-0 h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium text-base-content">
            Custom behaviours
          </h1>
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded px-2 bg-base-100 border border-white/15"
              value={newBehaviourKind}
              onChange={(e) => setNewBehaviourKind(e.target.value)}
              aria-label="Behaviour kind to add"
            >
              {ADDABLE_KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              isDisabled={poolFull}
              onPress={() => addCustomBehavior(newBehaviourKind)}
            >
              Add
            </Button>
          </div>
        </div>
        {behaviours.length === 0 ? (
          <p className="text-base-content/60">
            No custom behaviours yet. Add one to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {behaviours.map((beh) => (
            <div
              key={beh.id}
              className="rounded bg-base-200 p-4 flex flex-col gap-3"
            >
              <div className="flex items-baseline gap-2">
                <BehaviourNameEditor
                  name={beh.displayName ?? ""}
                  placeholder={`Behaviour #${beh.id}`}
                  onCommit={(name) =>
                    doRenameBehavior(beh.id, name, beh.displayName ?? "")
                  }
                />
                <span className="text-xs text-base-content/60">{beh.kind}</span>
                <Button
                  variant="danger"
                  size="sm"
                  className="ml-auto"
                  onPress={() => removeCustomBehavior(beh.id)}
                >
                  Delete
                </Button>
              </div>
                <div className="flex flex-col gap-3">
                  {beh.config.map((field) => (
                    <ConfigFieldEdit
                      key={field.key}
                      field={field}
                      layoutKeys={layoutKeys}
                      onCommit={(value) =>
                        doApplyConfigField(
                          beh.id,
                          field.key,
                          value,
                          field.value ?? {}
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (page === "combos") {
    return (
      <div className="grid grid-cols-[auto_1fr] bg-base-300 max-w-full min-w-0 min-h-0 h-full">
        <div className="p-2 flex flex-col gap-2 bg-base-200 overflow-y-auto min-h-0">
          {combos && (
            <ComboList
              combos={combos}
              behaviors={behaviors}
              selectedIndex={selectedComboIndex}
              onComboSelected={setSelectedComboIndex}
              onAddCombo={addCombo}
              canAdd={Object.keys(behaviors).length > 0}
            />
          )}
        </div>
        <div className="p-2 col-start-2 overflow-y-auto min-h-0">
          {keymap && combos && selectedCombo?.combo ? (
            <ComboEditor
              index={selectedCombo.index}
              combo={selectedCombo.combo}
              behaviors={Object.values(behaviors)}
              layers={keymap.layers.map(({ id, name }, li) => ({
                id,
                name: name || li.toLocaleString(),
              }))}
              maxKeysPerCombo={combos.maxKeysPerCombo}
              onApply={doApplyCombo}
              onDelete={doRemoveCombo}
            />
          ) : (
            <div className="h-full grid place-items-center text-center text-base-content/60">
              <p>Select a combo to edit, or add a new one.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[1fr_minmax(10em,45vh)] bg-base-300 max-w-full min-w-0 min-h-0">
      <div className="p-2 flex flex-col gap-2 bg-base-200 row-span-2">
        {layouts && (
          <PhysicalLayoutPicker
            layouts={layouts}
            selectedPhysicalLayoutIndex={selectedPhysicalLayoutIndex}
            onPhysicalLayoutClicked={doSelectPhysicalLayout}
          />
        )}

        {keymap && (
          <LayerPicker
            layers={keymap.layers}
            selectedLayerIndex={selectedLayerIndex}
            onLayerClicked={setSelectedLayerIndex}
            onLayerMoved={moveLayer}
            canAdd={(keymap.availableLayers || 0) > 0}
            canRemove={(keymap.layers?.length || 0) > 1}
            onAddClicked={addLayer}
            onRemoveClicked={removeLayer}
            onLayerNameChanged={changeLayerName}
          />
        )}
      </div>
      {layouts && keymap && behaviors && (
        <div className="p-2 col-start-2 row-start-1 grid items-center justify-center relative min-w-0">
          <KeymapComp
            keymap={keymap}
            layout={layouts[selectedPhysicalLayoutIndex]}
            behaviors={behaviors}
            scale={keymapScale}
            selectedLayerIndex={selectedLayerIndex}
            selectedKeyPosition={selectedKeyPosition}
            onKeyPositionClicked={setSelectedKeyPosition}
          />
          <Select
            aria-label="Zoom"
            className="absolute top-2 right-2"
            triggerClassName="w-28"
            size="sm"
            items={SCALE_ITEMS}
            selectedKey={String(keymapScale)}
            onSelectionChange={(key) =>
              setKeymapScale(deserializeLayoutZoom(String(key)))
            }
          />
        </div>
      )}
      {keymap && selectedBinding && (
        <div className="p-2 col-start-2 row-start-2 bg-base-200 overflow-y-auto min-h-0">
          <BehaviorBindingPicker
            binding={selectedBinding}
            behaviors={Object.values(behaviors)}
            layers={keymap.layers.map(({ id, name }, li) => ({
              id,
              name: name || li.toLocaleString(),
            }))}
            onBindingChanged={doUpdateBinding}
          />
        </div>
      )}
    </div>
  );
}
