import { useEffect, useState } from "react";
import type { Key } from "react-aria-components";

import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { Combo } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { KeyPositionPicker } from "../keyboard/KeyPositionPicker";
import { Button } from "../misc/Button";
import { Checkbox } from "../misc/Checkbox";
import { TextField } from "../misc/TextField";
import { ToggleGroup, ToggleGroupItem } from "../misc/ToggleGroup";

export interface ComboEditorProps {
  index: number;
  combo: Combo;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  /** Physical-layout keys for the click-to-toggle key picker; array index is the
   * key position. When absent, key positions are entered as text instead. */
  layoutKeys?: KeyPhysicalAttrs[];
  maxKeysPerCombo: number;
  onApply: (index: number, combo: Combo) => void;
  onDelete?: (index: number) => void;
}

// Parse a comma/space separated list of key positions into a number array,
// dropping anything that isn't a non-negative integer.
function parseKeyPositions(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => parseInt(t, 10))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// Text fallback for entering key positions when no physical layout is available
// to click on. Keeps its own raw-text buffer (so typing "1, 2," doesn't get
// reformatted mid-edit) and emits the parsed list upward. Seeded once from the
// initial value; the caller remounts it (via `key`) when a different combo is
// loaded, so it never has to sync the buffer back down from props.
function KeyPositionsTextInput({
  initialValue,
  onChange,
}: {
  initialValue: number[];
  onChange: (positions: number[]) => void;
}) {
  const [text, setText] = useState(initialValue.join(", "));

  return (
    <TextField
      aria-label="Key positions"
      value={text}
      onChange={(v) => {
        setText(v);
        onChange(parseKeyPositions(v));
      }}
    />
  );
}

// Edit a single combo in place. Fields are kept in local state and pushed to the
// device only when "Apply" is pressed, so we don't fire an RPC on every
// keystroke. Mirrors the keymap edit panel's reuse of BehaviorBindingPicker for
// the behavior. The layers bitmask is edited as one checkbox per layer (bit i ==
// layer index i, matching the firmware's `layer_mask & BIT(layer)` test);
// selecting none == mask 0 == active on all layers.
export const ComboEditor = ({
  index,
  combo,
  behaviors,
  layers,
  layoutKeys,
  maxKeysPerCombo,
  onApply,
  onDelete,
}: ComboEditorProps) => {
  const [keyPositions, setKeyPositions] = useState<number[]>([]);
  const [timeoutMs, setTimeoutMs] = useState(0);
  const [requirePriorIdleMs, setRequirePriorIdleMs] = useState(0);
  const [layersMask, setLayersMask] = useState(0);
  const [slowRelease, setSlowRelease] = useState(false);
  const [binding, setBinding] = useState<BehaviorBinding | undefined>(undefined);

  // Reload local state whenever a different combo (or a fresh copy) is selected.
  useEffect(() => {
    setKeyPositions(combo.keyPositions || []);
    setTimeoutMs(combo.timeoutMs);
    setRequirePriorIdleMs(combo.requirePriorIdleMs);
    setLayersMask(combo.layers);
    setSlowRelease(combo.slowRelease);
    setBinding(combo.binding);
  }, [index, combo]);

  const keyCountValid =
    keyPositions.length >= 1 && keyPositions.length <= maxKeysPerCombo;
  const canApply = keyCountValid && binding !== undefined;

  // The layer toggle group selects layer *indices* by key; fold the selected
  // set back into the firmware's `layer_mask & BIT(layer)` bitmask.
  const selectedLayerKeys = layers
    .map((_, i) => i)
    .filter((i) => (layersMask & (1 << i)) !== 0)
    .map(String);

  const setLayersFromKeys = (keys: Set<Key>) => {
    let mask = 0;
    for (const key of keys) {
      mask |= 1 << Number(key);
    }
    setLayersMask(mask);
  };

  return (
    // gap-4 between every field — matches the layers editor's binding drawer
    // (PickerShell's controls column), incl. the embedded BehaviorBindingPicker.
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase opacity-70">
          Edit combo #{index}
        </h2>
        {onDelete && (
          <Button variant="danger" size="sm" onPress={() => onDelete(index)}>
            Delete
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">
          Key positions (max {maxKeysPerCombo})
        </label>
        {layoutKeys ? (
          <KeyPositionPicker
            layoutKeys={layoutKeys}
            value={keyPositions}
            max={maxKeysPerCombo}
            oneU={48}
            onChange={setKeyPositions}
          />
        ) : (
          <KeyPositionsTextInput
            key={index}
            initialValue={combo.keyPositions || []}
            onChange={setKeyPositions}
          />
        )}
        {!keyCountValid && (
          <span className="text-xs text-error">
            Select 1 to {maxKeysPerCombo} key positions.
          </span>
        )}
        <span className="text-xs opacity-70">
          Raw key positions — combos are not remapped across physical layouts, so
          these refer to the same physical keys regardless of the layout you have
          selected.
        </span>
      </div>

      <TextField
        label="Timeout (ms)"
        type="number"
        inputProps={{ min: 1 }}
        value={String(timeoutMs)}
        onChange={(v) => setTimeoutMs(parseInt(v, 10) || 0)}
      />

      <TextField
        label="Require prior idle (ms)"
        description="-1 = disabled"
        type="number"
        inputProps={{ min: -1 }}
        value={String(requirePriorIdleMs)}
        onChange={(v) => {
          const n = parseInt(v, 10);
          setRequirePriorIdleMs(Number.isNaN(n) ? -1 : n);
        }}
      />

      <ToggleGroup
        label="Active on layers"
        description="None selected = active on all layers."
        selectionMode="multiple"
        selectedKeys={selectedLayerKeys}
        onSelectionChange={setLayersFromKeys}
        fill={false}
      >
        {layers.map((layer, i) => (
          <ToggleGroupItem key={layer.id} id={String(i)}>
            {layer.name || i}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Checkbox isSelected={slowRelease} onChange={setSlowRelease}>
        Slow release
      </Checkbox>

      {binding && (
        <BehaviorBindingPicker
          binding={binding}
          behaviors={behaviors}
          layers={layers}
          onBindingChanged={setBinding}
        />
      )}

      <Button
        variant="primary"
        isDisabled={!canApply}
        onPress={() => {
          if (!binding) {
            return;
          }
          onApply(index, {
            keyPositions,
            layers: layersMask,
            binding,
            timeoutMs,
            requirePriorIdleMs,
            slowRelease,
          });
        }}
      >
        Apply
      </Button>
    </div>
  );
};
