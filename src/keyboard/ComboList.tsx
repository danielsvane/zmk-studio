import { useMemo } from "react";
import { Plus } from "lucide-react";

import type { Combos } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { HidUsageLabel } from "./HidUsageLabel";
import { PhysicalLayout } from "./PhysicalLayout";
import { keyPhysicalAttrsToPositions } from "./layoutKeyPositions";
import { Button } from "../misc/Button";
import { cx } from "../misc/controlStyles";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface ComboListProps {
  combos: Combos;
  behaviors: BehaviorMap;
  /** Physical-layout keys for the mini keyboard preview; array index is the key
   * position. When absent the preview falls back to a plain list of positions. */
  layoutKeys?: KeyPhysicalAttrs[];
  selectedIndex?: number;
  onComboSelected?: (index: number) => void;
  onAddCombo?: () => void;
  canAdd?: boolean;
}

// Combo list. Rows are clickable cards, mirroring the layer picker on the left of
// the keymap editor. Each card shows a small physical-keyboard preview with the
// combo's key positions highlighted so the list stays scannable at a glance, plus
// the bound behavior. The "Add" button creates a new combo and selects it.
export const ComboList = ({
  combos,
  behaviors,
  layoutKeys,
  selectedIndex,
  onComboSelected,
  onAddCombo,
  canAdd,
}: ComboListProps) => {
  // The preview keyboard is the same for every row (only the highlight differs),
  // so build the bare positions once.
  const previewPositions = useMemo(
    () => (layoutKeys ? keyPhysicalAttrsToPositions(layoutKeys) : undefined),
    [layoutKeys],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase opacity-70">Combos</h2>
        <Button
          variant="secondary"
          icon={<Plus />}
          isDisabled={!canAdd || !onAddCombo}
          onPress={() => onAddCombo?.()}
        >
          Add
        </Button>
      </div>
      {combos.combos.length === 0 ? (
        <p className="text-sm opacity-70">No combos defined.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {combos.combos.map((entry) => {
            const combo = entry.combo;
            const binding = combo?.binding;
            const behaviorName = binding
              ? behaviors[binding.behaviorId]?.displayName || "Unknown"
              : "—";
            const positions = combo?.keyPositions || [];
            const selected = entry.index === selectedIndex;

            return (
              <li key={entry.index}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onComboSelected?.(entry.index)}
                  className={cx(
                    "w-full rounded border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-base-300"
                      : "border-transparent hover:bg-base-300",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium opacity-50">
                      #{entry.index}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium">
                      {behaviorName}
                    </span>
                    {binding ? (
                      <span className="ml-auto inline-flex shrink-0 text-xs opacity-70 [&_svg]:size-3.5">
                        <HidUsageLabel hid_usage={binding.param1} />
                      </span>
                    ) : null}
                  </div>
                  {previewPositions ? (
                    <div className="mt-1.5 flex justify-center">
                      <PhysicalLayout
                        positions={previewPositions}
                        oneU={11}
                        keyVariant="preview"
                        selectedPositions={positions}
                      />
                    </div>
                  ) : (
                    <div className="mt-1 font-mono text-xs opacity-60">
                      {positions.join(", ") || "no keys"}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
