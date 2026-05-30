import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import { HidUsagePicker } from "./HidUsagePicker";

const meta = {
  title: "Behaviors/HidUsagePicker",
  component: HidUsagePicker,
  parameters: { layout: "centered" },
  args: { onValueChanged: fn() },
} satisfies Meta<typeof HidUsagePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// The same usage pages a "Key Press" param exposes: keyboard codes (page 7)
// plus consumer codes (page 12). Searching spans both pages.
const usagePages = [
  { id: 7, min: 4, max: 0xff },
  { id: 12, max: 0x29c },
];

/** Pick a HID usage by searching, with implicit modifiers as a button group. */
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | undefined>(undefined);
    return (
      <HidUsagePicker
        {...args}
        label="Key"
        usagePages={usagePages}
        value={value}
        onValueChanged={(v) => {
          args.onValueChanged(v);
          setValue(v);
        }}
      />
    );
  },
};
