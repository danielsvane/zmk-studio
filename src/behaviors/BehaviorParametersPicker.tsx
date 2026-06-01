import { useMemo } from "react";

import {
  BehaviorBindingParametersSet,
  BehaviorParameterValueDescription,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { ParameterValuePicker } from "./ParameterValuePicker";
import { KeyParamSlot, KeyParamSlots } from "./KeyParamSlots";
import { usagePagesFor } from "../hid-usages";
import { validateValue } from "./parameters";

export interface BehaviorParametersPickerProps {
  param1?: number;
  param2?: number;
  metadata: BehaviorBindingParametersSet[];
  layers: { id: number; name: string }[];
  onParam1Changed: (value?: number) => void;
  onParam2Changed: (value?: number) => void;
}

// A descriptor list that is exactly one HID usage — the case the visual key
// grid can drive.
function hidUsageOf(values?: BehaviorParameterValueDescription[]) {
  return values?.length === 1 ? values[0].hidUsage : undefined;
}

export const BehaviorParametersPicker = ({
  param1,
  param2,
  metadata,
  layers,
  onParam1Changed,
  onParam2Changed,
}: BehaviorParametersPickerProps) => {
  const layerIds = layers.map((l) => l.id);

  // The set whose param1 the current value satisfies, falling back to the only
  // set when nothing is chosen yet — behaviors like mod-tap expose a single
  // set, so both params are known up front.
  const set =
    metadata.find((s) => validateValue(layerIds, param1, s.param1)) ??
    (metadata.length === 1 ? metadata[0] : undefined);

  const param1Usage = hidUsageOf(set?.param1);
  const param2Usage = hidUsageOf(set?.param2);
  const param2Present = (set?.param2?.length || 0) > 0;

  // Memoize per descriptor so HidUsagePicker keeps a stable `usagePages`
  // identity across value changes (it re-flattens the full usage tables
  // otherwise — see ParameterValuePicker).
  const param1Pages = useMemo(
    () => (param1Usage ? usagePagesFor(param1Usage) : []),
    [param1Usage]
  );
  const param2Pages = useMemo(
    () => (param2Usage ? usagePagesFor(param2Usage) : []),
    [param2Usage]
  );

  // When every editable param is a key/HID usage, drive them all from one
  // shared key grid via a slot selector (key press = 1 slot, mod-tap = 2).
  if (set && param1Usage && (!param2Present || param2Usage)) {
    const slots: KeyParamSlot[] = [];
    // Most-significant param first — matches how keys render their bound
    // params (Keymap.tsx) and puts the tap key before the hold for a mod-tap.
    if (param2Usage) {
      slots.push({
        name: set.param2![0].name,
        value: param2,
        usagePages: param2Pages,
        onChange: onParam2Changed,
      });
    }
    slots.push({
      name: set.param1![0].name,
      value: param1,
      usagePages: param1Pages,
      onChange: onParam1Changed,
    });
    // Key on the slot set so switching behaviors remounts back to slot 0
    // instead of resetting `active` from an effect (derive-don't-effect).
    return <KeyParamSlots key={slots.map((s) => s.name).join("|")} slots={slots} />;
  }

  // Fallback: stack the individual pickers, revealing param2 only once param1
  // selects a set that defines it.
  if (param1 === undefined) {
    return (
      <ParameterValuePicker
        values={metadata.flatMap((m) => m.param1)}
        onValueChanged={onParam1Changed}
        layers={layers}
      />
    );
  }
  return (
    <>
      <ParameterValuePicker
        values={metadata.flatMap((m) => m.param1)}
        value={param1}
        layers={layers}
        onValueChanged={onParam1Changed}
      />
      {param2Present && (
        <ParameterValuePicker
          values={set?.param2 ?? []}
          value={param2}
          layers={layers}
          onValueChanged={onParam2Changed}
        />
      )}
    </>
  );
};
