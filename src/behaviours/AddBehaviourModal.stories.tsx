import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { AddBehaviourModal } from "./AddBehaviourModal";
import { FIXTURE_ADDABLE_KINDS } from "./behaviourFixtures";

const meta = {
  title: "Behaviours/AddBehaviourModal",
  component: AddBehaviourModal,
  args: {
    open: true,
    kinds: FIXTURE_ADDABLE_KINDS,
    onClose: fn(),
    onAdd: fn(),
  },
} satisfies Meta<typeof AddBehaviourModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// The kind picker shown when "Add behaviour" is pressed: an inline ToggleGroup
// (single-select) over the addable kinds, with Cancel / Add.
export const Open: Story = {};
