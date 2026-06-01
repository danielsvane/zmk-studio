import { PickerShell } from "../misc/PickerShell";
import { useHidUsagePicker, type HidUsagePickerOptions } from "./useHidUsagePicker";
import type { HidUsagePage } from "../hid-usages";

// `usagePagesFor` and `HidUsagePage` now live in hid-usages.ts (they're plain
// domain helpers, not components — keeping them here broke Fast Refresh). Re-
// exported so existing importers of this module keep working.
export type { HidUsagePage };

export interface HidUsagePickerProps extends HidUsagePickerOptions {
  /** Show the visual keyboard grid beside (or above) the search dropdown. */
  showGrid?: boolean;
}

/**
 * Standalone HID-usage picker: a searchable dropdown with implicit modifiers,
 * optionally paired with the visual keyboard grid. The two-region {@link
 * PickerShell} keeps the grid and the controls in one container so they reflow
 * to side-by-side when there's room. Composite pickers (slots, behavior params)
 * use {@link useHidUsagePicker} directly so they can fold their own controls in.
 */
export const HidUsagePicker = ({
  showGrid = false,
  ...options
}: HidUsagePickerProps) => {
  const { controls, canvas } = useHidUsagePicker(options);
  return <PickerShell controls={controls} canvas={showGrid ? canvas : null} />;
};
