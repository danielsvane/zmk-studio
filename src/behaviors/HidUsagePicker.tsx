import { Key } from "react-aria-components";
import { ButtonGroup, ToggleButton } from "../misc/Button";
import { Select, SelectItemContent } from "../misc/Select";
import { KeyGrid } from "./KeyGrid";
import {
  hid_usage_from_page_and_id,
  hid_usage_page_get_ids,
  type HidUsagePage,
} from "../hid-usages";
import { useCallback, useMemo } from "react";

// `usagePagesFor` and `HidUsagePage` now live in hid-usages.ts (they're plain
// domain helpers, not components — keeping them here broke Fast Refresh). Re-
// exported so existing importers of this module keep working.
export type { HidUsagePage };

export interface HidUsagePickerProps {
  label?: string;
  value?: number;
  usagePages: HidUsagePage[];
  /** Show the visual keyboard grid above the search dropdown (key-press only). */
  showGrid?: boolean;
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

const all_mods = [
  Mods.LeftControl,
  Mods.LeftShift,
  Mods.LeftAlt,
  Mods.LeftGUI,
  Mods.RightControl,
  Mods.RightShift,
  Mods.RightAlt,
  Mods.RightGUI,
];

function mods_to_flags(mods: Mods[]): number {
  return mods.reduce((a, v) => a + v, 0);
}

function mask_mods(value: number) {
  return value & ~(mods_to_flags(all_mods) << 24);
}

export const HidUsagePicker = ({
  label,
  value,
  usagePages,
  showGrid = false,
  onValueChanged,
}: HidUsagePickerProps) => {
  const usageItems = useMemo(
    () => usagePages.flatMap(getPageUsages),
    [usagePages]
  );

  // More than one page means names alone can be ambiguous, so show the source
  // page as a hint under each option.
  const multiPage = usagePages.length > 1;

  const mods = useMemo(() => {
    const flags = value ? value >> 24 : 0;

    return all_mods.filter((m) => m & flags).map((m) => m.toLocaleString());
  }, [value]);

  const selectionChanged = useCallback(
    (e: Key | null) => {
      let value = typeof e == "number" ? e : undefined;
      if (value !== undefined) {
        const mod_flags = mods_to_flags(mods.map((m) => parseInt(m)));
        value = value | (mod_flags << 24);
      }

      onValueChanged(value);
    },
    [onValueChanged, mods]
  );

  const modifiersChanged = useCallback(
    (m: string[]) => {
      if (!value) {
        return;
      }

      const mod_flags = mods_to_flags(m.map((m) => parseInt(m)));
      const new_value = mask_mods(value) | (mod_flags << 24);
      onValueChanged(new_value);
    },
    [value]
  );

  return (
    <div className="flex flex-col gap-2">
      {showGrid && (
        <KeyGrid
          value={value ? mask_mods(value) : undefined}
          onPick={selectionChanged}
        />
      )}
      <div className="flex items-end gap-2">
        <Select<UsageItem>
        label={label}
        aria-label={label ? undefined : "HID usage"}
        searchable
        searchPlaceholder="Search keys…"
        placeholder="Select a key…"
        items={usageItems}
        selectedKey={value ? mask_mods(value) : null}
        onSelectionChange={selectionChanged}
        triggerClassName="min-w-48"
        renderItem={
          multiPage
            ? (u) => <SelectItemContent title={u.name} description={u.page} />
            : undefined
        }
        renderValue={multiPage ? (u) => u.name : undefined}
      />
      <ButtonGroup>
        {all_mods.map((m) => {
          const key = m.toLocaleString();
          return (
            <ToggleButton
              key={m}
              size="sm"
              isSelected={mods.includes(key)}
              onChange={(isSelected) =>
                modifiersChanged(
                  isSelected
                    ? [...mods, key]
                    : mods.filter((existing) => existing !== key)
                )
              }
            >
              {mod_labels[m]}
            </ToggleButton>
          );
        })}
      </ButtonGroup>
      </div>
    </div>
  );
};
