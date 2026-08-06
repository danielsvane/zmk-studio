import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import type { Combos } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { HidUsageLabel } from "./HidUsageLabel";
import { PhysicalLayout } from "./PhysicalLayout";
import { keyPhysicalAttrsToPositions } from "./layoutKeyPositions";
import { Button } from "../misc/Button";
import { SidebarCard } from "../misc/SidebarCard";

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
  /** A new combo is being filled in but doesn't exist on the device yet; shown
   * as a trailing placeholder row so the list still reflects what's being edited. */
  draftSelected?: boolean;
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
  draftSelected,
  canAdd,
}: ComboListProps) => {
  // The preview keyboard is the same for every row (only the highlight differs),
  // so build the bare positions once.
  const previewPositions = useMemo(
    () => (layoutKeys ? keyPhysicalAttrsToPositions(layoutKeys) : undefined),
    [layoutKeys],
  );

  // The preview is laid out at `oneU` px per key-unit with no auto-zoom, so to
  // fill the card width we size `oneU` from the measured row width: a board that
  // is `columns` units wide should span the full card, and its height follows
  // proportionally. Measured off the first row's preview slot (all rows share
  // the same card width); falls back to the old fixed size until measured.
  const columns = useMemo(
    () =>
      previewPositions
        ? previewPositions.reduce((m, p) => Math.max(m, p.x + p.width), 0)
        : 0,
    [previewPositions],
  );
  const slotRef = useRef<HTMLDivElement>(null);
  const [oneU, setOneU] = useState(11);
  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el || !columns) return;
    const update = () => {
      if (el.clientWidth > 0) setOneU(el.clientWidth / columns);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase opacity-70">Combos</h2>
      {combos.combos.length === 0 && !draftSelected ? (
        <p className="text-sm opacity-70">No combos defined.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {combos.combos.map((entry, i) => {
            const combo = entry.combo;
            const binding = combo?.binding;
            const behaviorName = binding
              ? behaviors[binding.behaviorId]?.displayName || "Unknown"
              : "—";
            const positions = combo?.keyPositions || [];
            const selected = entry.index === selectedIndex;

            return (
              <SidebarCard
                key={entry.index}
                selected={selected}
                onSelect={() => onComboSelected?.(entry.index)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-base font-medium">
                    {behaviorName}
                  </span>
                  {binding ? (
                    <span className="inline-flex text-base opacity-70 [&_svg]:size-4">
                      <HidUsageLabel hid_usage={binding.param1} verbose />
                    </span>
                  ) : null}
                </div>
                {previewPositions ? (
                  <div
                    ref={i === 0 ? slotRef : undefined}
                    className="mt-1.5 flex justify-start"
                  >
                    <PhysicalLayout
                      positions={previewPositions}
                      oneU={oneU}
                      keyVariant="preview"
                      selectedPositions={positions}
                    />
                  </div>
                ) : (
                  <div className="mt-1 font-mono text-xs opacity-60">
                    {positions.join(", ") || "no keys"}
                  </div>
                )}
              </SidebarCard>
            );
          })}
          {draftSelected && (
            <SidebarCard selected>
              {/* Same two-line shape as a real row: name on top, detail below. */}
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-base font-medium">
                  New combo
                </span>
                <span className="text-base opacity-70">Not saved yet</span>
              </div>
            </SidebarCard>
          )}
        </ul>
      )}
      <Button
        className="w-full justify-center"
        variant="ghost"
        icon={<Plus />}
        isDisabled={!canAdd || !onAddCombo}
        onPress={() => onAddCombo?.()}
      >
        Add combo
      </Button>
    </div>
  );
};
