import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ComboEditor } from "./ComboEditor";
import {
  FIXTURE_BEHAVIORS,
  FIXTURE_COMBOS,
  FIXTURE_LAYERS,
  FIXTURE_LAYOUT,
} from "./comboFixtures";

const meta = {
  title: "Combos/ComboEditor",
  component: ComboEditor,
  args: {
    behaviors: FIXTURE_BEHAVIORS,
    layers: FIXTURE_LAYERS,
    maxKeysPerCombo: FIXTURE_COMBOS.maxKeysPerCombo,
    onApply: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-base-300 p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComboEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// The primary editor: a large click-to-toggle keyboard (clicking a highlighted
// key removes it) with the combo's settings below.
export const WithLayout: Story = {
  args: {
    index: 0,
    combo: FIXTURE_COMBOS.combos[0].combo!,
    layoutKeys: FIXTURE_LAYOUT,
  },
};

// Fallback when the device hasn't reported a physical layout: positions are
// typed as a comma/space separated list.
export const NoLayoutTextFallback: Story = {
  args: {
    index: 1,
    combo: FIXTURE_COMBOS.combos[1].combo!,
  },
};
