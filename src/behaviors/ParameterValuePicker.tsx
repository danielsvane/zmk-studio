import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { HidUsagePicker } from "./HidUsagePicker";
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
          usagePages={[
            { id: 7, min: 4, max: values[0].hidUsage.keyboardMax },
            { id: 12, max: values[0].hidUsage.consumerMax },
          ]}
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
