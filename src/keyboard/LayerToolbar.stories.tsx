import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { LayerToolbar } from "./LayerToolbar";

// Rendered inside a relative box to stand in for the keymap canvas it overlays.
const meta = {
  title: "Keyboard/LayerToolbar",
  component: LayerToolbar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative h-40 bg-base-300">
        <Story />
      </div>
    ),
  ],
  args: {
    onRename: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof LayerToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Named: Story = {
  args: { name: "Nav", placeholder: "2", canDelete: true },
};

export const Unnamed: Story = {
  args: { name: "", placeholder: "3", canDelete: true },
};

export const LastLayer: Story = {
  args: { name: "Base", placeholder: "0", canDelete: false },
};
