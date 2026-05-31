import { useState } from "react";

import { HidUsageLabel } from "../keyboard/HidUsageLabel";
import { cx, controlFocusRing } from "../misc/Button";
import { HidUsagePage, HidUsagePicker } from "./HidUsagePicker";

export interface KeyParamSlot {
  /** Slot label, taken from the behavior's parameter metadata name. */
  name: string;
  /** Current value (full HID usage incl. modifier flags); 0/undefined = unset. */
  value?: number;
  /** Usage pages this slot may choose from. */
  usagePages: HidUsagePage[];
  onChange: (value?: number) => void;
}

export interface KeyParamSlotsProps {
  slots: KeyParamSlot[];
}

const segment = cx(
  "flex min-w-20 flex-1 flex-col items-center gap-0.5 px-3 py-1.5",
  "cursor-pointer select-none transition-[background-color,filter]",
  controlFocusRing
);

/**
 * Edits one or more key/HID-usage params from a single shared key picker. With
 * a single slot it's just the picker; with several it shows a segmented
 * selector on top — each segment displays its chosen key and, when active,
 * routes the grid below to that param. Picking a key for an empty slot
 * auto-advances to the next, so a mod-tap reads "pick the tap, then the hold".
 *
 * Callers should `key` this on the slot set so picking a different behavior
 * remounts it back to the first slot — cheaper and clearer than resetting
 * `active` from an effect.
 */
export const KeyParamSlots = ({ slots }: KeyParamSlotsProps) => {
  const [active, setActive] = useState(0);

  if (slots.length === 0) {
    return null;
  }

  const idx = Math.min(active, slots.length - 1);
  const current = slots[idx];

  const handlePick = (value?: number) => {
    const wasEmpty = !current.value;
    current.onChange(value);
    // The first time a slot gets a key, advance to the next empty-or-not slot.
    if (wasEmpty && value && idx < slots.length - 1) {
      setActive(idx + 1);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {slots.length > 1 && (
        <div
          role="group"
          aria-label="Parameters"
          className="flex divide-x divide-white/10 overflow-hidden rounded border border-white/10"
        >
          {slots.map((slot, i) => {
            const selected = i === idx;
            return (
              <button
                key={slot.name}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(i)}
                className={cx(
                  segment,
                  selected
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content rac-hover:brightness-110 hover:brightness-110"
                )}
              >
                <span className="text-xs opacity-60">{slot.name}</span>
                <span className="@container flex h-5 w-full items-center justify-center text-sm font-medium [&_svg]:size-4">
                  {slot.value ? (
                    <HidUsageLabel hid_usage={slot.value} />
                  ) : (
                    <span className="opacity-40">—</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <HidUsagePicker
        label={slots.length > 1 ? current.name : undefined}
        value={current.value}
        usagePages={current.usagePages}
        showGrid
        onValueChanged={handlePick}
      />
    </div>
  );
};
