import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { BehaviourEditor } from "./BehaviourEditor";
import { FIXTURE_HOLD_TAP, FIXTURE_STICKY_KEY } from "./behaviourFixtures";
import { FIXTURE_LAYOUT } from "../combos/comboFixtures";

const meta = {
  title: "Behaviours/BehaviourEditor",
  component: BehaviourEditor,
  args: {
    onRename: fn(),
    onApplyField: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-base-300 p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BehaviourEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// A hold-tap with every field kind: int (TextField), enum (Select), bool
// (Checkbox), and a key-positions picker — all on the shared design-system
// controls so it lines up with the combo editor.
export const HoldTap: Story = {
  args: {
    behaviour: FIXTURE_HOLD_TAP,
    layoutKeys: FIXTURE_LAYOUT,
  },
};

// Fallback when the device hasn't reported a physical layout: key positions are
// typed as a comma/space-separated list instead of clicked.
export const NoLayoutTextFallback: Story = {
  args: {
    behaviour: FIXTURE_HOLD_TAP,
  },
};

export const StickyKey: Story = {
  args: {
    behaviour: FIXTURE_STICKY_KEY,
    layoutKeys: FIXTURE_LAYOUT,
  },
};
