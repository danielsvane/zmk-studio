import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";

import { ComboList } from "./ComboList";
import {
  FIXTURE_BEHAVIOR_MAP,
  FIXTURE_COMBOS,
  FIXTURE_LAYOUT,
} from "../combos/comboFixtures";

const meta = {
  title: "Combos/ComboList",
  component: ComboList,
  args: {
    onComboSelected: fn(),
    onAddCombo: fn(),
    canAdd: true,
  },
} satisfies Meta<typeof ComboList>;

export default meta;
type Story = StoryObj<typeof meta>;

// The sidebar variant: each combo shows a mini keyboard with its positions
// highlighted, mirroring the layer picker. Selection is interactive.
export const WithLayoutPreview: Story = {
  args: {
    combos: FIXTURE_COMBOS,
    behaviors: FIXTURE_BEHAVIOR_MAP,
    layoutKeys: FIXTURE_LAYOUT,
  },
  render: (args) => {
    const [selected, setSelected] = useState<number | undefined>(0);
    return (
      <div className="w-60 bg-base-200 p-2">
        <ComboList
          {...args}
          combos={FIXTURE_COMBOS}
          behaviors={FIXTURE_BEHAVIOR_MAP}
          layoutKeys={FIXTURE_LAYOUT}
          selectedIndex={selected}
          onComboSelected={(i) => {
            args.onComboSelected?.(i);
            setSelected(i);
          }}
        />
      </div>
    );
  },
};

// Fallback when the device hasn't reported a physical layout: positions render
// as a plain list.
export const NoLayout: Story = {
  args: {
    combos: FIXTURE_COMBOS,
    behaviors: FIXTURE_BEHAVIOR_MAP,
    selectedIndex: 1,
  },
  decorators: [
    (Story) => (
      <div className="w-60 bg-base-200 p-2">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: {
    combos: { ...FIXTURE_COMBOS, combos: [] },
    behaviors: FIXTURE_BEHAVIOR_MAP,
    layoutKeys: FIXTURE_LAYOUT,
  },
  decorators: [
    (Story) => (
      <div className="w-60 bg-base-200 p-2">
        <Story />
      </div>
    ),
  ],
};
