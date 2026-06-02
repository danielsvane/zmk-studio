import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { hid_usage_page_and_id_from_usage } from "../hid-usages";

// The descriptor in `values` that `value` satisfies, if any. Lets callers tell
// what kind of thing a concrete param is (a key, a layer, a constant…) — the
// keymap uses this to render a layer-tap's layer by name instead of feeding a
// layer id to the HID usage label.
export function matchDescriptor(
  layerIds: number[],
  value: number,
  values?: BehaviorParameterValueDescription[]
): BehaviorParameterValueDescription | undefined {
  return values?.find((v) => {
    if (v.constant !== undefined) {
      return v.constant == value;
    } else if (v.range) {
      return value >= v.range.min && value <= v.range.max;
    } else if (v.hidUsage) {
      const [page, id] = hid_usage_page_and_id_from_usage(value);
      return page !== 0 && id !== 0;
    } else if (v.layerId) {
      return layerIds.includes(value);
    } else if (v.nil) {
      return value === 0;
    } else {
      console.error("Unknown check type!");
      return false;
    }
  });
}

export function validateValue(
  layerIds: number[],
  value?: number,
  values?: BehaviorParameterValueDescription[]
): boolean {
  if (value === undefined) {
    return values === undefined || values?.length === 0 || !!values[0].nil;
  }

  const matchingValue = matchDescriptor(layerIds, value, values);

  return !!matchingValue || (value === 0 && (!values || values.length === 0));
}
