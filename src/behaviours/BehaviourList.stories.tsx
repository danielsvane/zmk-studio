import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";

import { BehaviourList } from "./BehaviourList";
import { FIXTURE_ADDABLE_KINDS, FIXTURE_BEHAVIOURS } from "./behaviourFixtures";

const meta = {
  title: "Behaviours/BehaviourList",
  component: BehaviourList,
  args: {
    addableKinds: FIXTURE_ADDABLE_KINDS,
    canAdd: true,
    onSelect: fn(),
    onAdd: fn(),
  },
} satisfies Meta<typeof BehaviourList>;

export default meta;
type Story = StoryObj<typeof meta>;

// The sidebar variant: clickable rows with a kind chip, mirroring the combo
// list. Selection is interactive; "Add behaviour" opens the kind-picker modal.
export const WithBehaviours: Story = {
  args: {
    behaviours: FIXTURE_BEHAVIOURS,
  },
  render: (args) => {
    const [selected, setSelected] = useState<number | undefined>(1);
    return (
      <div className="w-64 bg-base-200 p-4">
        <BehaviourList
          {...args}
          selectedId={selected}
          onSelect={(id) => {
            args.onSelect?.(id);
            setSelected(id);
          }}
        />
      </div>
    );
  },
};

export const Empty: Story = {
  args: {
    behaviours: [],
  },
  decorators: [
    (Story) => (
      <div className="w-64 bg-base-200 p-4">
        <Story />
      </div>
    ),
  ],
};
