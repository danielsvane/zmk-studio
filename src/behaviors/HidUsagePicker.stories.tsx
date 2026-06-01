import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import { HidUsagePicker } from "./HidUsagePicker";
import { hid_usage_from_page_and_id } from "../hid-usages";

// Sample values for the "editing an existing binding" stories.
const LEFT_CTRL = 0x01 << 24;
const LEFT_SHIFT = 0x02 << 24;
// `{` = Left Bracket (id 47) + Shift — picked from the Symbols tab.
const CURLY_OPEN = hid_usage_from_page_and_id(7, 47) | LEFT_SHIFT;
// Ctrl + `{` — the Shift is intrinsic to the symbol, the Ctrl is residual.
const CTRL_CURLY_OPEN = CURLY_OPEN | LEFT_CTRL;
// Play/Pause on the consumer page (12) — lives in the Media tab.
const PLAY_PAUSE = hid_usage_from_page_and_id(12, 205);

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
  initialValue,
  onValueChanged,
}: {
  width: number;
  showGrid?: boolean;
  initialValue?: number;
  onValueChanged: (value?: number) => void;
}) {
  const [value, setValue] = useState<number | undefined>(initialValue);
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

/**
 * Editing an existing `{` binding (Left Bracket + Shift). It opens on the
 * Symbols tab with `{` highlighted; the Shift is intrinsic to the symbol, so
 * the modifier row stays empty.
 */
export const EditingSymbol: Story = {
  render: (args) => (
    <PickerAt
      width={340}
      showGrid
      initialValue={CURLY_OPEN}
      onValueChanged={args.onValueChanged}
    />
  ),
};

/**
 * Editing `Ctrl + {`. Most-specific match wins: the Symbols tab shows `{`
 * highlighted, and only the residual `Ctrl` is lit in the modifier row (the
 * symbol's Shift is not surfaced).
 */
export const SymbolWithResidualModifier: Story = {
  render: (args) => (
    <PickerAt
      width={340}
      showGrid
      initialValue={CTRL_CURLY_OPEN}
      onValueChanged={args.onValueChanged}
    />
  ),
};

/** Editing a consumer-page binding — opens on the Media tab. */
export const EditingMedia: Story = {
  render: (args) => (
    <PickerAt
      width={340}
      showGrid
      initialValue={PLAY_PAUSE}
      onValueChanged={args.onValueChanged}
    />
  ),
};
