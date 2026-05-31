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
import type {
  GetBehaviorDetailsResponse,
  CustomBehaviors,
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
import { produce } from "immer";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { deserializeLayoutZoom, LayoutZoom } from "./PhysicalLayout";
import { Select } from "../misc/Select";

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

function useBehaviors(): BehaviorMap {
  let connection = useContext(ConnectionContext);
  let lockState = useContext(LockStateContext);

  const [behaviors, setBehaviors] = useState<BehaviorMap>({});

  useEffect(() => {
    if (
      !connection.conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setBehaviors({});
      return;
    }

    async function startRequest() {
      setBehaviors({});

      if (!connection.conn) {
        return;
      }

      let get_behaviors: Request = {
        behaviors: { listAllBehaviors: true },
        requestId: 0,
      };

      let behavior_list = await call_rpc(connection.conn, get_behaviors);
      if (!ignore) {
        let behavior_map: BehaviorMap = {};
        for (let behaviorId of behavior_list.behaviors?.listAllBehaviors
          ?.behaviors || []) {
          if (ignore) {
            break;
          }
          let details_req = {
            behaviors: { getBehaviorDetails: { behaviorId } },
            requestId: 0,
          };
          let behavior_details = await call_rpc(connection.conn, details_req);
          let dets: GetBehaviorDetailsResponse | undefined =
            behavior_details?.behaviors?.getBehaviorDetails;

          if (dets) {
            behavior_map[dets.id] = dets;
          }
        }

        if (!ignore) {
          setBehaviors(behavior_map);
        }
      }
    }

    let ignore = false;
    startRequest();

    return () => {
      ignore = true;
    };
  }, [connection, lockState]);

  return behaviors;
}

function useLayouts(): [
  PhysicalLayout[] | undefined,
  React.Dispatch<SetStateAction<PhysicalLayout[] | undefined>>,
  number,
  React.Dispatch<SetStateAction<number>>
] {
  let connection = useContext(ConnectionContext);
  let lockState = useContext(LockStateContext);

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

      let response = await call_rpc(connection.conn, {
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

export default function Keyboard({ page }: { page: Page }) {
  const [
    layouts,
    _setLayouts,
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

  // M0 tracer: read the (currently empty) custom-behaviour pool. Later
  // milestones flesh this out with real slots + a generic config editor.
  const [customBehaviors] = useConnectedDeviceData<CustomBehaviors>(
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
  const behaviors = useBehaviors();

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

      let resp = await call_rpc(conn.conn, {
        keymap: { setActivePhysicalLayout: selectedPhysicalLayoutIndex },
      });

      let new_keymap = resp?.keymap?.setActivePhysicalLayout?.ok;
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

  let doSelectPhysicalLayout = useCallback(
    (i: number) => {
      let oldLayout = selectedPhysicalLayoutIndex;
      undoRedo?.(async () => {
        setSelectedPhysicalLayoutIndex(i);

        return async () => {
          setSelectedPhysicalLayoutIndex(oldLayout);
        };
      });
    },
    [undoRedo, selectedPhysicalLayoutIndex]
  );

  let doUpdateBinding = useCallback(
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

        let resp = await call_rpc(conn.conn, {
          keymap: { setLayerBinding: { layerId, keyPosition, binding } },
        });

        if (
          resp.keymap?.setLayerBinding ===
          SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
        ) {
          setKeymap(
            produce((draft: any) => {
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

          let resp = await call_rpc(conn.conn, {
            keymap: {
              setLayerBinding: { layerId, keyPosition, binding: oldBinding },
            },
          });
          if (
            resp.keymap?.setLayerBinding ===
            SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
          ) {
            setKeymap(
              produce((draft: any) => {
                draft.layers[layer].bindings[keyPosition] = oldBinding;
              })
            );
          } else {
          }
        };
      });
    },
    [conn, keymap, undoRedo, selectedLayerIndex, selectedKeyPosition]
  );

  let selectedBinding = useMemo(() => {
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
            produce((draft: any) => {
              const entry = draft.combos.find((e: any) => e.index === index);
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
          produce((draft: any) => {
            draft.combos.push({ index: ok.index, combo: ok.combo ?? newCombo });
            draft.combos.sort((a: any, b: any) => a.index - b.index);
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
          produce((draft: any) => {
            const i = draft.combos.findIndex((e: any) => e.index === index);
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
            produce((draft: any) => {
              const i = draft.combos.findIndex((e: any) => e.index === index);
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
            produce((draft: any) => {
              draft.combos.push({ index, combo });
              draft.combos.sort((a: any, b: any) => a.index - b.index);
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

        let resp = await call_rpc(conn.conn, {
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
          produce((draft: any) => {
            draft.layers.push(resp.keymap!.addLayer!.ok!.layer);
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
          produce((draft: any) => {
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
      let index = await doAdd();
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
          produce((draft: any) => {
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
          produce((draft: any) => {
            draft.layers.splice(atIndex, 0, resp!.keymap!.restoreLayer!.ok);
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

    let index = selectedLayerIndex;
    let layerId = keymap.layers[index].id;
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
            produce((draft: any) => {
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
    const count = customBehaviors?.behaviors?.length ?? 0;
    return (
      <div className="grid bg-base-300 max-w-full min-w-0 min-h-0 h-full place-items-center text-center text-base-content/60">
        <p>{count} custom behaviours</p>
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
