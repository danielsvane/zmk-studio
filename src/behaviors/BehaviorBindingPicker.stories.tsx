import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";

import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorBindingPicker } from "./BehaviorBindingPicker";
import { FIXTURE_BEHAVIORS, FIXTURE_LAYERS } from "../combos/comboFixtures";

const meta = {
  title: "Behaviors/BehaviorBindingPicker",
  component: BehaviorBindingPicker,
  args: {
    behaviors: FIXTURE_BEHAVIORS,
    layers: FIXTURE_LAYERS,
    onBindingChanged: fn(),
  },
} satisfies Meta<typeof BehaviorBindingPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Stateful wrapper at a fixed container width — the behaviour picker's two-region
// shell flips to side-by-side via a container query, so this width decides
// stacked vs side-by-side.
function PickerAt({
  width,
  initial,
  onBindingChanged,
}: {
  width: number;
  initial: BehaviorBinding;
  onBindingChanged: (binding: BehaviorBinding) => void;
}) {
  const [binding, setBinding] = useState<BehaviorBinding>(initial);
  return (
    <div style={{ width }} className="bg-base-200 p-6">
      <BehaviorBindingPicker
        binding={binding}
        behaviors={FIXTURE_BEHAVIORS}
        layers={FIXTURE_LAYERS}
        onBindingChanged={(b) => {
          onBindingChanged(b);
          setBinding(b);
        }}
      />
    </div>
  );
}

const KEY_PRESS: BehaviorBinding = { behaviorId: 0, param1: 0, param2: 0 };
const MOD_TAP: BehaviorBinding = { behaviorId: 1, param1: 0, param2: 0 };

/** A single key/HID param: behaviour select + search + modifiers stack in the
 * controls column, the key grid sits beside them once there's room. */
export const KeyPress: Story = {
  render: (args) => (
    <PickerAt
      width={720}
      initial={KEY_PRESS}
      onBindingChanged={args.onBindingChanged}
    />
  ),
};

/** Two key params (tap + hold): the slot tabs join the controls column and route
 * the shared grid to the active slot. Wide enough (past the 88rem flip) to sit
 * side-by-side. */
export const ModTapSideBySide: Story = {
  render: (args) => (
    <PickerAt
      width={1500}
      initial={MOD_TAP}
      onBindingChanged={args.onBindingChanged}
    />
  ),
};

/** The same mod-tap in a narrow container stays stacked — controls (with the
 * slot tabs) on top, grid below. */
export const ModTapStacked: Story = {
  render: (args) => (
    <PickerAt
      width={340}
      initial={MOD_TAP}
      onBindingChanged={args.onBindingChanged}
    />
  ),
};

// A ladder of widths so one screenshot shows exactly where the shell flips from
// stacked to side-by-side — for tuning the breakpoint.
export const WidthLadder: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {[1280, 1408, 1456, 1560].map((w) => (
        <div key={w}>
          <div className="text-xs opacity-60">{w}px</div>
          <PickerAt
            width={w}
            initial={MOD_TAP}
            onBindingChanged={args.onBindingChanged}
          />
        </div>
      ))}
    </div>
  ),
};
