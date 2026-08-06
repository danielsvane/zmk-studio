import React, {
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import { LayerToolbar } from "./LayerToolbar";
// Layout picker temporarily hidden — not needed for now.
// import { PhysicalLayoutPicker } from "./PhysicalLayoutPicker";
import { Keymap as KeymapComp } from "./Keymap";
import { ComboList } from "./ComboList";
import { ComboEditor } from "../combos/ComboEditor";
import { useConnectedDeviceData } from "../rpc/useConnectedDeviceData";
import { fetchBehaviorMap } from "../rpc/fetchBehaviorMap";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { UndoRedoContext } from "../undoRedo";
import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { produce, type Draft } from "immer";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { BehaviourList } from "../behaviours/BehaviourList";
import { BehaviourEditor } from "../behaviours/BehaviourEditor";

// The left sidebar (master list) on every editor page — Layers, Combos,
// Behaviours. A fixed `w-72` so all three pages line up exactly; their `auto`
// grid column otherwise sizes to content, which would make the combo list (with
// its key previews) wider than the text-only lists. The keymap page appends
// `row-span-2` to span its keyboard + binding-drawer rows.
const SIDEBAR_REGION =
  "flex w-72 flex-col gap-2 bg-base-200 p-4 overflow-y-auto min-h-0 border-r border-base-line";

// useConnectedDeviceData state is `T | undefined` until the device responds.
// These mutation handlers only fire once data is loaded, so this wraps an immer
// recipe to give it a non-null draft (and safely no-ops if state is still
// undefined), keeping every call site free of repeated null guards.
function editData<T>(recipe: (draft: Draft<T>) => void) {
  return produce((draft: Draft<T> | undefined) => {
    if (draft) recipe(draft);
  });
}

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

  const doFetchBehaviorMap = useCallback(async (): Promise<BehaviorMap> => {
    const conn = connection.conn;
    if (!conn || lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
      return {};
    }

    return await fetchBehaviorMap(conn);
  }, [connection, lockState]);

  const refresh = useCallback(async () => {
    setBehaviors(await doFetchBehaviorMap());
  }, [doFetchBehaviorMap]);

  useEffect(() => {
    let ignore = false;
    setBehaviors({});
    doFetchBehaviorMap().then((map) => {
      if (!ignore) {
        setBehaviors(map);
      }
    });

    return () => {
      ignore = true;
    };
  }, [doFetchBehaviorMap]);

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
    // setSelectedPhysicalLayoutIndex — unused while layout picker is hidden
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

  // A combo being filled in that has no pool slot yet; see addCombo. Mutually
  // exclusive with selectedComboIndex — whichever is set is what the editor shows.
  const [draftCombo, setDraftCombo] = useState<Combo | null>(null);

  const [selectedBehaviourId, setSelectedBehaviourId] = useState<
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
    setSelectedBehaviourId(undefined);
  }, [conn]);

  // `conn`/`layouts` are read as guards only — this request must fire when the
  // user *picks* a different physical layout, not when the connection or the
  // layout list loads (that would push setActivePhysicalLayout on every connect
  // and clobber the freshly-loaded keymap). Hold them in refs so the effect sees
  // current values without taking them as triggers.
  const connRef = useRef(conn);
  connRef.current = conn;
  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;

  useEffect(() => {
    async function performSetRequest() {
      const c = connRef.current.conn;
      if (!c || !layoutsRef.current) {
        return;
      }

      const resp = await call_rpc(c, {
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
  }, [selectedPhysicalLayoutIndex, setKeymap]);

  // Layout picker temporarily hidden — see commented PhysicalLayoutPicker below.
  // const doSelectPhysicalLayout = useCallback(
  //   (i: number) => {
  //     const oldLayout = selectedPhysicalLayoutIndex;
  //     undoRedo?.(async () => {
  //       setSelectedPhysicalLayoutIndex(i);
  //
  //       return async () => {
  //         setSelectedPhysicalLayoutIndex(oldLayout);
  //       };
  //     });
  //   },
  //   [undoRedo, selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex]
  // );

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
    [conn, keymap, undoRedo, selectedLayerIndex, selectedKeyPosition, setKeymap]
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

  const doUpdateCombo = useCallback(
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
          console.error("Failed to set custom behavior field", result);
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
          console.error("Failed to rename custom behavior", result);
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
  // binding without reconnecting. Which spare pool to claim from is chosen by
  // the user in the "Add behavior" modal (see ADDABLE_KINDS); the firmware
  // rejects an unknown kind with NO_SPACE. Adding a kind to the firmware pool +
  // ADDABLE_KINDS is all it takes to offer it — the config form renders
  // generically (M10).
  const addCustomBehavior = useCallback(
    async (kind: string) => {
    if (!conn.conn) {
      return;
    }

    const name = window.prompt(
      `Name for the new ${kind} behavior:`,
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
      // Open the new behaviour in the editor right away.
      setSelectedBehaviourId(behavior.id);
      // Make the new behaviour selectable as a binding right away.
      await refreshBehaviors();
      return;
    }

    const err = resp.behaviors?.addCustomBehavior?.err;
    console.error("Add custom behavior error", err);
    // TODO: replace window.alert with a proper toast (matches App.tsx).
    if (err === AddCustomBehaviorErrorCode.ADD_CUSTOM_BEHAVIOR_ERR_NO_SPACE) {
      window.alert(`Can't add another behavior: the ${kind} pool is full.`);
    } else {
      window.alert("Failed to add the behavior.");
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
        console.error("Can't delete a behavior that isn't loaded", behaviorId);
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
          setSelectedBehaviourId(undefined);
          // Drop it from the binding-picker map too.
          await refreshBehaviors();
        } else {
          console.error(
            "Remove behavior error",
            resp.behaviors?.removeCustomBehavior?.err
          );
          throw new Error(
            "Failed to remove behavior: " +
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
          setSelectedBehaviourId(behavior.id);
          await refreshBehaviors();
        } else {
          console.error(
            "Restore behavior error",
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

  // Create a combo (M4) from what the user filled into the draft editor. The
  // firmware assigns the pool slot and returns its index, which we select for
  // editing. Undo deletes it.
  const doCreateCombo = useCallback(
    (newCombo: Combo) => {
      // Returns the assigned pool index, or -1 if the add failed (already
      // surfaced to the user). We never throw out of the undoRedo callback: a
      // throw there leaves the undo/redo system permanently locked.
      async function doAdd(): Promise<number> {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

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
          setDraftCombo(null);
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
    },
    [conn, undoRedo, setCombos]
  );

  // "Add combo" opens an empty draft rather than creating anything: the firmware
  // has no representation for a half-filled combo (it requires at least one key
  // position and a valid binding), and seeding defaults instead would silently
  // arm a live combo on keys the user never chose. Nothing reaches the device
  // until Create.
  const addCombo = useCallback(() => {
    setSelectedComboIndex(undefined);
    setDraftCombo({
      keyPositions: [],
      layers: 0,
      binding: undefined,
      timeoutMs: 50,
      requirePriorIdleMs: -1,
      slowRelease: false,
    });
  }, []);

  // Apply from the editor: create the draft, or update the selected combo.
  const doApplyCombo = useCallback(
    (combo: Combo) => {
      if (draftCombo) {
        doCreateCombo(combo);
      } else if (selectedComboIndex !== undefined) {
        doUpdateCombo(selectedComboIndex, combo);
      }
    },
    [draftCombo, selectedComboIndex, doCreateCombo, doUpdateCombo]
  );

  // Selecting an existing combo discards any in-progress draft (it holds nothing
  // the device knows about, so there is nothing to save).
  const selectCombo = useCallback((index: number) => {
    setDraftCombo(null);
    setSelectedComboIndex(index);
  }, []);

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
    [conn, undoRedo, setKeymap]
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
  }, [conn, undoRedo, keymap, setKeymap]);

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
  }, [conn, undoRedo, selectedLayerIndex, keymap, setKeymap]);

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
    [conn, undoRedo, setKeymap]
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
    const selectedBehaviour = behaviours.find(
      (b) => b.id === selectedBehaviourId
    );
    // Master-detail, mirroring the combos page: a sidebar list of behaviours on
    // the left and the editor for the selected one on the right.
    return (
      <div className="grid grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)] bg-base-300 max-w-full min-w-0 min-h-0">
        <div className={SIDEBAR_REGION}>
          <BehaviourList
            behaviours={behaviours}
            addableKinds={ADDABLE_KINDS}
            canAdd={!poolFull}
            selectedId={selectedBehaviourId}
            onSelect={setSelectedBehaviourId}
            onAdd={addCustomBehavior}
          />
        </div>
        <div className="px-6 pt-6 col-start-2 overflow-y-auto min-h-0 min-w-0">
          {/* min-h-full + flex-col so the empty-state can center vertically,
              while pb-6 lives on the *content* (not the scroll container, whose
              bottom padding gets dropped at the scroll end). Matches combos. */}
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col pb-6">
            {selectedBehaviour ? (
              <BehaviourEditor
                key={selectedBehaviour.id}
                behaviour={selectedBehaviour}
                layoutKeys={layoutKeys}
                onRename={(name) =>
                  doRenameBehavior(
                    selectedBehaviour.id,
                    name,
                    selectedBehaviour.displayName ?? ""
                  )
                }
                onApplyField={(fieldKey, value, oldValue) =>
                  doApplyConfigField(
                    selectedBehaviour.id,
                    fieldKey,
                    value,
                    oldValue
                  )
                }
                onDelete={() => removeCustomBehavior(selectedBehaviour.id)}
              />
            ) : (
              <div className="grid flex-1 place-items-center text-center text-base-content/60">
                <div>
                  <p>
                    {behaviours.length === 0
                      ? "No custom behaviors yet. Add one to get started."
                      : "Select a behavior to edit, or add a new one."}
                  </p>
                  <p className="mt-2 text-sm text-base-content/50">
                    Any factory behaviors that ship with this keyboard reload
                    after the board restarts — e.g. after restoring stock
                    settings, reset the board (or unplug and reconnect) to see
                    them again.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (page === "combos") {
    // Raw key positions aren't remapped across layouts, so any layout is just a
    // visual aid for the key-position picker; use the active/selected one.
    const comboLayoutKeys = layouts?.[selectedPhysicalLayoutIndex]?.keys;
    return (
      <div className="grid grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)] bg-base-300 max-w-full min-w-0 min-h-0">
        <div className={SIDEBAR_REGION}>
          {combos && (
            <ComboList
              combos={combos}
              behaviors={behaviors}
              layoutKeys={comboLayoutKeys}
              selectedIndex={selectedComboIndex}
              onComboSelected={selectCombo}
              onAddCombo={addCombo}
              draftSelected={draftCombo !== null}
              canAdd={Object.keys(behaviors).length > 0}
            />
          )}
        </div>
        <div className="px-6 pt-6 col-start-2 overflow-y-auto min-h-0 min-w-0">
          {/* min-h-full + flex-col so the empty-state can center vertically,
              while pb-6 lives on the *content* (not the scroll container, whose
              bottom padding gets dropped at the scroll end) to keep a gap below
              the Apply button. */}
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col pb-6">
            {keymap && combos && (draftCombo || selectedCombo?.combo) ? (
              <ComboEditor
                // Remount when switching between the draft and a real combo so
                // the editor's local field state reloads from the new source.
                key={draftCombo ? "draft" : selectedCombo!.index}
                index={draftCombo ? undefined : selectedCombo!.index}
                combo={draftCombo ?? selectedCombo!.combo!}
                behaviors={Object.values(behaviors)}
                layers={keymap.layers.map(({ id, name }, li) => ({
                  id,
                  name: name || li.toLocaleString(),
                }))}
                layoutKeys={comboLayoutKeys}
                maxKeysPerCombo={combos.maxKeysPerCombo}
                onApply={doApplyCombo}
                onDelete={doRemoveCombo}
              />
            ) : (
              <div className="grid flex-1 place-items-center text-center text-base-content/60">
                <p>Select a combo to edit, or add a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)_min(54vh,28rem)] bg-base-300 max-w-full min-w-0 min-h-0">
      <div className={`${SIDEBAR_REGION} row-span-2`}>
        {/* Layout picker temporarily hidden — not needed for now.
        {layouts && (
          <PhysicalLayoutPicker
            layouts={layouts}
            selectedPhysicalLayoutIndex={selectedPhysicalLayoutIndex}
            onPhysicalLayoutClicked={doSelectPhysicalLayout}
          />
        )}
        */}

        {keymap && (
          <LayerPicker
            layers={keymap.layers}
            selectedLayerIndex={selectedLayerIndex}
            onLayerClicked={setSelectedLayerIndex}
            onLayerMoved={moveLayer}
            canAdd={(keymap.availableLayers || 0) > 0}
            onAddClicked={addLayer}
          />
        )}
      </div>
      {layouts && keymap && behaviors && (
        <div className="p-2 col-start-2 row-start-1 grid items-center justify-center relative min-w-0">
          {keymap.layers[selectedLayerIndex] && (
            <LayerToolbar
              name={keymap.layers[selectedLayerIndex].name ?? ""}
              placeholder={selectedLayerIndex.toString()}
              canDelete={(keymap.layers?.length || 0) > 1}
              onRename={(newName) => {
                const layer = keymap.layers[selectedLayerIndex];
                changeLayerName(layer.id, layer.name ?? "", newName);
              }}
              onDelete={removeLayer}
            />
          )}
          <KeymapComp
            keymap={keymap}
            layout={layouts[selectedPhysicalLayoutIndex]}
            behaviors={behaviors}
            layers={keymap.layers.map(({ id, name }, li) => ({
              id,
              name: name || li.toLocaleString(),
            }))}
            selectedLayerIndex={selectedLayerIndex}
            selectedKeyPosition={selectedKeyPosition}
            onKeyPositionClicked={setSelectedKeyPosition}
          />
        </div>
      )}
      {/* The binding drawer keeps a fixed reserved height (the grid's second row)
          whether or not a key is selected, so the physical keyboard above stays
          one stable size — opening/closing the drawer or switching key-category
          tabs (which have different row counts) never reflows it. The row is
          min(54vh, 28rem): just over half the viewport on short screens, but
          capped at 28rem on tall ones. 28rem is tuned to the tallest the picker
          ever gets side-by-side (the 6-row Basic grid + p-6 padding ≈ 27.5rem),
          so the drawer fits its content exactly with no trailing empty space and
          the extra height goes to the keyboard above. Narrower widths where the
          picker stacks are taller and simply scroll, as before. */}
      {layouts && keymap && behaviors && (
        <div className="p-6 col-start-2 row-start-2 bg-base-200 overflow-y-auto min-h-0 border-t border-base-line">
          {selectedBinding ? (
            <BehaviorBindingPicker
              binding={selectedBinding}
              behaviors={Object.values(behaviors)}
              layers={keymap.layers.map(({ id, name }, li) => ({
                id,
                name: name || li.toLocaleString(),
              }))}
              onBindingChanged={doUpdateBinding}
            />
          ) : (
            <div className="h-full grid place-items-center text-center text-base-content/60">
              <p>Select a key to edit its binding.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
