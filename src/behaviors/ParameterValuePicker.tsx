import { useMemo } from "react";
import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { HidUsagePicker } from "./HidUsagePicker";
import { usagePagesFor } from "../hid-usages";
import { Select } from "../misc/Select";

export interface ParameterValuePickerProps {
  value?: number;
  values: BehaviorParameterValueDescription[];
  layers: { id: number; name: string }[];
  onValueChanged: (value?: number) => void;
}

export const ParameterValuePicker = ({
  value,
  values,
  layers,
  onValueChanged,
}: ParameterValuePickerProps) => {
  // Stable identity for the HID usage pages so HidUsagePicker doesn't re-flatten
  // the full keyboard + consumer usage tables on every render/keystroke. Hooks
  // must run unconditionally, so compute it here even though only the hidUsage
  // branch below consumes it.
  const hidUsage = values[0]?.hidUsage;
  const usagePages = useMemo(
    () => (hidUsage ? usagePagesFor(hidUsage) : []),
    [hidUsage]
  );

  if (values.length == 0) {
    return <></>;
  } else if (values.every((v) => v.constant !== undefined)) {
    return (
      <Select
        aria-label="Value"
        items={values}
        selectedKey={value}
        itemKey={(v) => v.constant!}
        itemText={(v) => v.name}
        onSelectionChange={(key) => onValueChanged(Number(key))}
      />
    );
  } else if (values.length == 1) {
    if (values[0].range) {
      return (
        <div>
          <label>{values[0].name}: </label>
          <input
            type="number"
            min={values[0].range.min}
            max={values[0].range.max}
            value={value}
            onChange={(e) => onValueChanged(parseInt(e.target.value))}
          />
        </div>
      );
    } else if (values[0].hidUsage) {
      return (
        <HidUsagePicker
          onValueChanged={onValueChanged}
          label={values[0].name}
          value={value}
          usagePages={usagePages}
        />
      );
    } else if (values[0].layerId) {
      return (
        <Select
          label={values[0].name}
          items={layers}
          selectedKey={value}
          itemKey={(l) => l.id}
          itemText={(l) => l.name}
          onSelectionChange={(key) => onValueChanged(Number(key))}
        />
      );
    }
  } else {
    console.log("Not sure how to handle", values);
    return (
      <>
        <p>Some composite?</p>
      </>
    );
  }

  return <></>;
};
