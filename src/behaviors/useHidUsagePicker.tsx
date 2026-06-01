import { Key } from "react-aria-components";
import { useCallback, useMemo } from "react";

import { ToggleGroup, ToggleGroupItem } from "../misc/ToggleGroup";
import { Combobox, SelectItemContent } from "../misc/Select";
import { KeyTabs } from "./KeyTabs";
import { resolveCell, tabsForUsagePages } from "./keyGridTabs";
import type { PickerRegions } from "../misc/PickerShell";
import {
  hid_usage_from_page_and_id,
  hid_usage_page_get_ids,
  type HidUsagePage,
} from "../hid-usages";

export interface HidUsagePickerOptions {
  label?: string;
  value?: number;
  usagePages: HidUsagePage[];
  onValueChanged: (value?: number) => void;
}

interface UsageItem {
  /** Full HID usage value (page + id), used as the Select key. */
  id: number;
  name: string;
  /** Source page name (e.g. "Keyboard", "Consumer"), shown as a hint. */
  page: string;
}

// Flatten a usage page into selectable items. The page's usages are filtered to
// the requested min/max range (the keyboard page also always keeps the modifier
// usages 0xE0–0xE7).
function getPageUsages({ id, min, max }: HidUsagePage): UsageItem[] {
  const info = hid_usage_page_get_ids(id);
  let usages = info?.UsageIds || [];
  if (max || min) {
    usages = usages.filter(
      (i) =>
        (i.Id <= (max || Number.MAX_SAFE_INTEGER) && i.Id >= (min || 0)) ||
        (id === 7 && i.Id >= 0xe0 && i.Id <= 0xe7)
    );
  }

  return usages.map((i) => ({
    id: hid_usage_from_page_and_id(id, i.Id),
    name: i.Name,
    page: info?.Name ?? "",
  }));
}

enum Mods {
  LeftControl = 0x01,
  LeftShift = 0x02,
  LeftAlt = 0x04,
  LeftGUI = 0x08,
  RightControl = 0x10,
  RightShift = 0x20,
  RightAlt = 0x40,
  RightGUI = 0x80,
}

const mod_labels: Record<Mods, string> = {
  [Mods.LeftControl]: "L Ctrl",
  [Mods.LeftShift]: "L Shift",
  [Mods.LeftAlt]: "L Alt",
  [Mods.LeftGUI]: "L GUI",
  [Mods.RightControl]: "R Ctrl",
  [Mods.RightShift]: "R Shift",
  [Mods.RightAlt]: "R Alt",
  [Mods.RightGUI]: "R GUI",
};

// Left modifiers first, then right — the order the eight toggles appear in the
// single segmented row.
const left_mods = [
  Mods.LeftControl,
  Mods.LeftShift,
  Mods.LeftAlt,
  Mods.LeftGUI,
];
const right_mods = [
  Mods.RightControl,
  Mods.RightShift,
  Mods.RightAlt,
  Mods.RightGUI,
];
const all_mods = [...left_mods, ...right_mods];

function mods_to_flags(mods: Mods[]): number {
  return mods.reduce((a, v) => a + v, 0);
}

function mask_mods(value: number) {
  return value & ~(mods_to_flags(all_mods) << 24);
}

/**
 * Shared logic + UI for picking a HID usage: a searchable dropdown plus an
 * implicit-modifier toggle grid (the CONTROLS), and a visual keyboard grid (the
 * CANVAS). Returns the two regions separately so a {@link PickerShell} can lay
 * them out stacked or side-by-side. The grid and the search share one selection
 * path, so toggled modifiers ride along with whichever way you pick the key.
 */
export function useHidUsagePicker({
  label,
  value,
  usagePages,
  onValueChanged,
}: HidUsagePickerOptions): PickerRegions {
  const usageItems = useMemo(
    () => usagePages.flatMap(getPageUsages),
    [usagePages]
  );

  // More than one page means names alone can be ambiguous, so show the source
  // page as a hint under each option.
  const multiPage = usagePages.length > 1;

  const tabs = useMemo(() => tabsForUsagePages(usagePages), [usagePages]);

  // A symbol cell (e.g. `{`) owns its Shift, so that bit is *intrinsic*, not a
  // user modifier. The toggle row shows only the residual modifiers layered on
  // top, and picks/edits must preserve the intrinsic bit without surfacing it.
  const valueFlags = value ? (value >> 24) & 0xff : 0;
  const intrinsicFlags = resolveCell(value, tabs)?.intrinsicFlags ?? 0;
  const residualFlags = valueFlags & ~intrinsicFlags;

  const activeMods = useMemo(
    () => all_mods.filter((m) => m & residualFlags),
    [residualFlags]
  );

  const selectionChanged = useCallback(
    (e: Key | null) => {
      // `e` is a full cell usage (grid, may carry an intrinsic shift) or a base
      // usage (combobox). Either way the residual modifiers ride along.
      let value = typeof e == "number" ? e : undefined;
      if (value !== undefined) {
        value = value | (residualFlags << 24);
      }

      onValueChanged(value);
    },
    [onValueChanged, residualFlags]
  );

  const modifiersChanged = useCallback(
    (keys: Set<Key>) => {
      if (!value) {
        return;
      }

      const mod_flags = mods_to_flags([...keys].map(Number));
      const new_value = mask_mods(value) | ((intrinsicFlags | mod_flags) << 24);
      onValueChanged(new_value);
    },
    [value, onValueChanged, intrinsicFlags]
  );

  const maskedValue = value ? mask_mods(value) : undefined;

  const controls = (
    <>
      <Combobox<UsageItem>
        label={label ?? "Key"}
        placeholder="Search keys…"
        items={usageItems}
        selectedKey={maskedValue ?? null}
        onSelectionChange={selectionChanged}
        triggerClassName="w-full"
        // Virtualize: this list runs to ~600 entries. Row height tracks the
        // template — title+page (multiPage) is taller than a single name.
        rowHeight={multiPage ? 48 : 32}
        renderItem={
          multiPage
            ? (u) => <SelectItemContent title={u.name} description={u.page} />
            : undefined
        }
      />
      {/* Modifiers ride along with whichever key is picked. They only make sense
          on top of a base key, so the row is disabled until one is chosen. */}
      <ToggleGroup
        label="Modifiers"
        fill={false}
        selectionMode="multiple"
        selectedKeys={new Set(activeMods)}
        onSelectionChange={modifiersChanged}
        isDisabled={!value}
      >
        {all_mods.map((m) => (
          <ToggleGroupItem key={m} id={m}>
            {mod_labels[m]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );

  const canvas = (
    <KeyTabs value={value} onPick={selectionChanged} tabs={tabs} />
  );

  return { controls, canvas };
}
