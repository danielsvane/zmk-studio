import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import { HidUsagePicker } from "./HidUsagePicker";

// The same usage pages a "Key Press" param exposes: keyboard codes (page 7)
// plus consumer codes (page 12). Searching spans both pages.
const usagePages = [
  { id: 7, min: 4, max: 0xff },
  { id: 12, max: 0x29c },
];

const meta = {
  title: "Behaviors/HidUsagePicker",
  component: HidUsagePicker,
  args: { onValueChanged: fn(), usagePages },
} satisfies Meta<typeof HidUsagePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Stateful wrapper at a fixed container width — the picker's two-region shell
// flips to side-by-side via a container query, so the width here is what
// decides stacked vs side-by-side.
function PickerAt({
  width,
  showGrid,
  onValueChanged,
}: {
  width: number;
  showGrid?: boolean;
  onValueChanged: (value?: number) => void;
}) {
  const [value, setValue] = useState<number | undefined>(undefined);
  return (
    <div style={{ width }} className="bg-base-300 p-2">
      <HidUsagePicker
        label="Key"
        showGrid={showGrid}
        usagePages={usagePages}
        value={value}
        onValueChanged={(v) => {
          onValueChanged(v);
          setValue(v);
        }}
      />
    </div>
  );
}

/** Pick a HID usage by searching, with implicit modifiers as toggle groups. */
export const Default: Story = {
  render: (args) => <PickerAt width={320} onValueChanged={args.onValueChanged} />,
};

/**
 * The key-press variant with the visual keyboard grid. Narrow enough to stay
 * stacked — controls on top, grid below. A single click picks a key (keeping
 * any toggled modifiers); rarer keys stay in the dropdown.
 */
export const WithGrid: Story = {
  render: (args) => (
    <PickerAt width={340} showGrid onValueChanged={args.onValueChanged} />
  ),
};

/**
 * The same key-press variant in a wide container: past ~36rem the shell flips
 * to side-by-side — controls on the left, the key grid on the right.
 */
export const WithGridSideBySide: Story = {
  render: (args) => (
    <PickerAt width={720} showGrid onValueChanged={args.onValueChanged} />
  ),
};
