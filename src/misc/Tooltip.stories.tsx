import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info, Save } from "lucide-react";

import { Tooltip } from "./Tooltip";
import { Button } from "./Button";

// The bubble at both ends of its range: a toolbar icon's one-word label and a
// wrapped paragraph. `InfoTip` shares the surface (`tooltipSurface`) but is a
// click-to-open popover, so it shows nothing in a static shot — see
// Behaviours/BehaviourEditor for it in place. The header's own tooltips can't be
// reached from a story either, since their enabled state comes from live RPC
// data.
const meta = {
  title: "Misc/Tooltip",
  component: Tooltip,
  decorators: [
    (Story) => (
      <div className="flex min-h-64 items-end bg-base-300 p-16">
        <Story />
      </div>
    ),
  ],
  // `defaultOpen` puts the bubble on screen without driving a hover; `delay={0}`
  // keeps the 1s warmup from gating a re-open.
  args: { defaultOpen: true, delay: 0 },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShortLabel: Story = {
  args: {
    label: "Save",
    children: <Button variant="ghost" icon={<Save />} aria-label="Save" />,
  },
};

// The long end: help copy wrapped at `max-w-xs` with its newlines kept — what
// `InfoTip` shows for a setting like the hold-tap flavor.
export const LongLabel: Story = {
  args: {
    label:
      "How the key decides between hold and tap when you press another key before the tapping term is up.\n\n" +
      "hold-preferred: any other key press gives you the hold.\n" +
      "balanced: you get the hold if you press and release another key.",
    children: (
      <Button variant="ghost" icon={<Info />} aria-label="About Flavor" />
    ),
  },
};
