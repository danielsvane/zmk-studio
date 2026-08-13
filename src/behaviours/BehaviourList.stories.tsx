import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
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

/**
 * The read failed, which is *not* the same list as {@link Empty} — the keyboard
 * may well have behaviours we couldn't see. Add is disabled too: with the pool
 * state unknown, claiming a slot would be a guess.
 */
export const ReadFailed: Story = {
  args: {
    behaviours: [],
    error: "Couldn't read the behaviors from the keyboard (No response).",
    canAdd: false,
  },
  decorators: [
    (Story) => (
      <div className="w-64 bg-base-200 p-4">
        <Story />
      </div>
    ),
  ],
};
