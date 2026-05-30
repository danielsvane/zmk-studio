import { useEffect, useState } from "react";

import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { Combo } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";

export interface ComboEditorProps {
  index: number;
  combo: Combo;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  maxKeysPerCombo: number;
  onApply: (index: number, combo: Combo) => void;
  onDelete?: (index: number) => void;
}

// Parse a comma/space separated list of key positions into a number array,
// dropping anything that isn't a non-negative integer.
function parseKeyPositions(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => parseInt(t, 10))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// Edit a single combo in place (M2: RAM-only). Fields are kept in local state
// and pushed to the device only when "Apply" is pressed, so we don't fire an
// RPC on every keystroke. Mirrors the keymap edit panel's reuse of
// BehaviorBindingPicker for the behavior.
export const ComboEditor = ({
  index,
  combo,
  behaviors,
  layers,
  maxKeysPerCombo,
  onApply,
  onDelete,
}: ComboEditorProps) => {
  const [keyPositionsText, setKeyPositionsText] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(0);
  const [requirePriorIdleMs, setRequirePriorIdleMs] = useState(0);
  const [slowRelease, setSlowRelease] = useState(false);
  const [binding, setBinding] = useState<BehaviorBinding | undefined>(undefined);

  // Reload local state whenever a different combo (or a fresh copy) is selected.
  useEffect(() => {
    setKeyPositionsText((combo.keyPositions || []).join(", "));
    setTimeoutMs(combo.timeoutMs);
    setRequirePriorIdleMs(combo.requirePriorIdleMs);
    setSlowRelease(combo.slowRelease);
    setBinding(combo.binding);
  }, [index, combo]);

  const keyPositions = parseKeyPositions(keyPositionsText);
  const keyCountValid =
    keyPositions.length >= 1 && keyPositions.length <= maxKeysPerCombo;
  const canApply = keyCountValid && binding !== undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase opacity-70">
          Edit combo #{index}
        </h2>
        {onDelete && (
          <button
            className="h-6 rounded bg-error px-2 text-xs text-error-content"
            onClick={() => onDelete(index)}
          >
            Delete
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">
          Key positions (max {maxKeysPerCombo})
        </label>
        <input
          type="text"
          className="h-8 rounded px-2"
          value={keyPositionsText}
          onChange={(e) => setKeyPositionsText(e.target.value)}
        />
        {!keyCountValid && (
          <span className="text-xs text-error">
            Enter 1 to {maxKeysPerCombo} key positions.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">Timeout (ms)</label>
        <input
          type="number"
          min={0}
          className="h-8 rounded px-2"
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10) || 0)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">Require prior idle (ms)</label>
        <input
          type="number"
          min={0}
          className="h-8 rounded px-2"
          value={requirePriorIdleMs}
          onChange={(e) =>
            setRequirePriorIdleMs(parseInt(e.target.value, 10) || 0)
          }
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={slowRelease}
          onChange={(e) => setSlowRelease(e.target.checked)}
        />
        Slow release
      </label>

      {binding && (
        <BehaviorBindingPicker
          binding={binding}
          behaviors={behaviors}
          layers={layers}
          onBindingChanged={setBinding}
        />
      )}

      <button
        className="h-8 rounded bg-primary px-3 text-primary-content disabled:opacity-50"
        disabled={!canApply}
        onClick={() => {
          if (!binding) {
            return;
          }
          onApply(index, {
            keyPositions,
            layers: combo.layers,
            binding,
            timeoutMs,
            requirePriorIdleMs,
            slowRelease,
          });
        }}
      >
        Apply
      </button>
    </div>
  );
};
