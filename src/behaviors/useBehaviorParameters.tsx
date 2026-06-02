import { useMemo } from "react";

import {
  BehaviorBindingParametersSet,
  BehaviorParameterValueDescription,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { ParameterValuePicker } from "./ParameterValuePicker";
import { KeyParamSlot, useKeyParamSlots } from "./useKeyParamSlots";
import type { PickerRegions } from "../misc/PickerShell";
import { usagePagesFor } from "../hid-usages";
import { validateValue } from "./parameters";

export interface BehaviorParametersOptions {
  param1?: number;
  param2?: number;
  metadata?: BehaviorBindingParametersSet[];
  layers: { id: number; name: string }[];
  onParam1Changed: (value?: number) => void;
  onParam2Changed: (value?: number) => void;
}

const EMPTY_METADATA: BehaviorBindingParametersSet[] = [];

// A descriptor list that is exactly one HID usage — the case the visual key
// grid can drive.
function hidUsageOf(values?: BehaviorParameterValueDescription[]) {
  return values?.length === 1 ? values[0].hidUsage : undefined;
}

/**
 * Resolves a behavior's editable parameters into {@link PickerRegions}. Every
 * key/HID-usage param is driven from one shared visual key grid (the CANVAS),
 * with its search + modifiers — and, for two key params, a slot selector — in
 * the CONTROLS. Non-key params (layer, constant, range) render as stacked
 * selects/inputs in the controls above the grid. A behavior can mix the two:
 * layer-tap pairs a layer select with a key grid, so the modifiers get the same
 * room they do for a plain key press. With no key param at all there's no
 * canvas and the shell collapses to a single column of stacked pickers.
 */
export function useBehaviorParameters({
  param1,
  param2,
  metadata,
  layers,
  onParam1Changed,
  onParam2Changed,
}: BehaviorParametersOptions): PickerRegions {
  const md = metadata ?? EMPTY_METADATA;
  const layerIds = layers.map((l) => l.id);

  // The set whose param1 the current value satisfies, falling back to the only
  // set when nothing is chosen yet — behaviors like mod-tap expose a single
  // set, so both params are known up front.
  const set =
    md.find((s) => validateValue(layerIds, param1, s.param1)) ??
    (md.length === 1 ? md[0] : undefined);

  const param1Usage = hidUsageOf(set?.param1);
  const param2Usage = hidUsageOf(set?.param2);
  const param2Present = (set?.param2?.length || 0) > 0;

  // Memoize per descriptor so the picker keeps a stable `usagePages` identity
  // across value changes (it re-flattens the full usage tables otherwise — see
  // ParameterValuePicker).
  const param1Pages = useMemo(
    () => (param1Usage ? usagePagesFor(param1Usage) : []),
    [param1Usage]
  );
  const param2Pages = useMemo(
    () => (param2Usage ? usagePagesFor(param2Usage) : []),
    [param2Usage]
  );

  // Key/HID-usage params drive the shared grid; collect them as slots, most-
  // significant first — matches how keys render their bound params (Keymap.tsx)
  // and puts the tap key before the hold for a mod-tap. A slot only appears once
  // its set is known, so a multi-set behavior reveals its key grid as param1
  // picks the set. useKeyParamSlots is called unconditionally (no-op when empty).
  const slots: KeyParamSlot[] = [];
  if (param2Usage) {
    slots.push({
      name: set!.param2![0].name,
      value: param2,
      usagePages: param2Pages,
      onChange: onParam2Changed,
    });
  }
  if (param1Usage) {
    slots.push({
      name: set!.param1![0].name,
      value: param1,
      usagePages: param1Pages,
      onChange: onParam1Changed,
    });
  }

  const slotRegions = useKeyParamSlots(slots);

  // Non-key params, stacked in display order (param1 → param2). param2 is
  // revealed only once param1 is set, since for multi-set behaviors param1
  // selects which set — and thus which param2 — applies.
  const nonKeyControls = (
    <>
      {!param1Usage && (
        <ParameterValuePicker
          values={md.flatMap((m) => m.param1)}
          value={param1}
          layers={layers}
          onValueChanged={onParam1Changed}
        />
      )}
      {param2Present && !param2Usage && param1 !== undefined && (
        <ParameterValuePicker
          values={set?.param2 ?? []}
          value={param2}
          layers={layers}
          onValueChanged={onParam2Changed}
        />
      )}
    </>
  );

  // At least one key param: drive it from the shared grid (the canvas), with any
  // non-key params stacked above the grid's own search + modifiers.
  if (slots.length > 0) {
    return {
      controls: (
        <>
          {nonKeyControls}
          {slotRegions.controls}
        </>
      ),
      canvas: slotRegions.canvas,
    };
  }

  // No key param: stacked value pickers, no canvas (single column).
  return { controls: nonKeyControls, canvas: null };
}
