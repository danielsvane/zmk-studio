import type { Combos } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { HidUsageLabel } from "./HidUsageLabel";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface ComboListProps {
  combos: Combos;
  behaviors: BehaviorMap;
  selectedIndex?: number;
  onComboSelected?: (index: number) => void;
}

// Combo list. Rows are clickable to select a combo for editing (M2); the
// selected row is highlighted. Mirrors the keymap's behavior rendering: the
// behavior's display name plus a HID usage label for param1 where it applies.
export const ComboList = ({
  combos,
  behaviors,
  selectedIndex,
  onComboSelected,
}: ComboListProps) => {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-bold uppercase opacity-70">Combos</h2>
      {combos.combos.length === 0 ? (
        <p className="text-sm opacity-70">No combos defined.</p>
      ) : (
        <table className="text-sm border-collapse">
          <thead>
            <tr className="text-left opacity-70">
              <th className="pr-3 font-medium">#</th>
              <th className="pr-3 font-medium">Keys</th>
              <th className="pr-3 font-medium">Behavior</th>
              <th className="pr-3 font-medium">Timeout</th>
            </tr>
          </thead>
          <tbody>
            {combos.combos.map((entry) => {
              const combo = entry.combo;
              const binding = combo?.binding;
              const behaviorName = binding
                ? behaviors[binding.behaviorId]?.displayName || "Unknown"
                : "—";

              return (
                <tr
                  key={entry.index}
                  className={
                    "border-t border-base-300 cursor-pointer" +
                    (entry.index === selectedIndex ? " bg-base-300" : "")
                  }
                  onClick={() => onComboSelected?.(entry.index)}
                >
                  <td className="pr-3 align-top">{entry.index}</td>
                  <td className="pr-3 align-top">
                    {(combo?.keyPositions || []).join(", ")}
                  </td>
                  <td className="pr-3 align-top">
                    <span>{behaviorName}</span>
                    {binding ? (
                      <span className="ml-1 opacity-70 inline-flex">
                        <HidUsageLabel hid_usage={binding.param1} />
                      </span>
                    ) : null}
                  </td>
                  <td className="pr-3 align-top">{combo?.timeoutMs} ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
