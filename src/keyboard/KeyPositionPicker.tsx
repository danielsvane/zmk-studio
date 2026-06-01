import { useMemo } from "react";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { PhysicalLayout } from "./PhysicalLayout";
import { keyPhysicalAttrsToPositions } from "./layoutKeyPositions";

/**
 * Click-to-toggle picker for a raw key-position list — used both by a hold-tap's
 * hold_trigger_key_positions and by a combo's key positions. Renders the
 * keyboard's physical layout and highlights every selected position; clicking a
 * key adds/removes it. The position number is shown on each key so the list
 * stays legible.
 *
 * These are RAW physical key positions — they are not remapped across physical
 * layouts, so any layout is only a visual aid for picking the same underlying
 * positions. The caller passes the keys of whichever layout is active; if no
 * layout is available the parent falls back to a text editor.
 */
export interface KeyPositionPickerProps {
  /** Physical-layout keys; the array index is the key position number. */
  layoutKeys: KeyPhysicalAttrs[];
  /** Currently-selected positions. */
  value: number[];
  /** Maximum number of positions allowed (from the schema / combo limit). */
  max?: number;
  /** 1u size in pixels. Smaller (~36) suits an inline form; larger (~48) suits
   * a primary editor surface. */
  oneU?: number;
  onChange: (positions: number[]) => void;
}

export function KeyPositionPicker({
  layoutKeys,
  value,
  max,
  oneU = 36,
  onChange,
}: KeyPositionPickerProps) {
  const positions = useMemo(
    () => keyPhysicalAttrsToPositions(layoutKeys, (i) => ({ header: String(i) })),
    [layoutKeys],
  );

  const selected = new Set(value);

  const toggle = (position: number) => {
    const next = new Set(selected);
    if (next.has(position)) {
      next.delete(position);
    } else {
      if (max !== undefined && next.size >= max) {
        return; // at capacity — ignore further additions
      }
      next.add(position);
    }
    // Keep the list sorted + de-duplicated for a stable wire/display order.
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-center overflow-auto rounded bg-base-300 p-2">
        <PhysicalLayout
          positions={positions}
          oneU={oneU}
          selectedPositions={value}
          onPositionClicked={toggle}
        />
      </div>
      <div className="flex items-baseline gap-2 text-xs text-base-content/70">
        <span>
          {value.length} selected
          {max !== undefined ? ` / ${max} max` : ""}
        </span>
        {value.length > 0 && (
          <>
            <span className="text-base-content/40">·</span>
            <span className="font-mono">{value.join(", ")}</span>
            <button
              type="button"
              className="ml-auto underline hover:no-underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
