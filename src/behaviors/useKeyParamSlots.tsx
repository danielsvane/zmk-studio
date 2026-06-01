import { useState } from "react";

import { HidUsageLabel } from "../keyboard/HidUsageLabel";
import { LabeledGroup } from "../misc/Field";
import { cx, controlFocusRing } from "../misc/controlStyles";
import type { PickerRegions } from "../misc/PickerShell";
import { HidUsagePage } from "./HidUsagePicker";
import { useHidUsagePicker } from "./useHidUsagePicker";

export interface KeyParamSlot {
  /** Slot label, taken from the behavior's parameter metadata name. */
  name: string;
  /** Current value (full HID usage incl. modifier flags); 0/undefined = unset. */
  value?: number;
  /** Usage pages this slot may choose from. */
  usagePages: HidUsagePage[];
  onChange: (value?: number) => void;
}

const EMPTY_PAGES: HidUsagePage[] = [];

const segment = cx(
  "flex min-w-20 flex-1 flex-col items-center gap-0.5 px-3 py-1.5",
  "cursor-pointer select-none transition-[background-color,filter]",
  controlFocusRing
);

/**
 * Edits one or more key/HID-usage params from a single shared key picker.
 * Returns {@link PickerRegions} so a {@link PickerShell} can place the big key
 * grid (CANVAS) beside the controls. With several slots it adds a segmented
 * selector to the controls — each segment shows its chosen key and, when
 * active, routes the grid to that param. Picking a key for an empty slot
 * auto-advances to the next, so a mod-tap reads "pick the tap, then the hold".
 */
export function useKeyParamSlots(slots: KeyParamSlot[]): PickerRegions {
  const [active, setActive] = useState(0);

  // Reset to the first slot whenever the slot set changes (e.g. switching
  // behavior). Done by comparing the previous slot key during render — the
  // React-sanctioned alternative to the remount-via-`key` trick this replaced,
  // and to a sync effect (derive, don't effect).
  const slotKey = slots.map((s) => s.name).join("|");
  const [prevSlotKey, setPrevSlotKey] = useState(slotKey);
  if (slotKey !== prevSlotKey) {
    setPrevSlotKey(slotKey);
    setActive(0);
  }

  const idx = slots.length ? Math.min(active, slots.length - 1) : 0;
  const current = slots[idx];

  const hid = useHidUsagePicker({
    label: slots.length > 1 ? current?.name : undefined,
    value: current?.value,
    usagePages: current?.usagePages ?? EMPTY_PAGES,
    onValueChanged: (value) => {
      if (!current) {
        return;
      }
      const wasEmpty = !current.value;
      current.onChange(value);
      // The first time a slot gets a key, advance to the next slot.
      if (wasEmpty && value && idx < slots.length - 1) {
        setActive(idx + 1);
      }
    },
  });

  if (slots.length === 0) {
    return { controls: null, canvas: null };
  }

  const tabs =
    slots.length > 1 ? (
      <LabeledGroup
        label="Parameters"
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
      </LabeledGroup>
    ) : null;

  return {
    controls: (
      <>
        {tabs}
        {hid.controls}
      </>
    ),
    canvas: hid.canvas,
  };
}
