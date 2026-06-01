import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import { Keyboard, ArrowRightLeft, Layers, ToggleLeft } from "lucide-react";
import { Select, Combobox, SelectItemContent } from "./Select";
import type { Key } from "react-aria-components";

const meta = {
  title: "Misc/Select",
  component: Select,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    isDisabled: { control: "boolean" },
  },
  args: { onSelectionChange: fn(), items: [] },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const behaviors = [
  { id: "kp", name: "Key Press" },
  { id: "mt", name: "Mod-Tap" },
  { id: "lt", name: "Layer-Tap" },
  { id: "mo", name: "Momentary Layer" },
  { id: "trans", name: "Transparent" },
];

/** Playground driven by the Controls panel. */
export const Playground: Story = {
  args: {
    label: "Behavior",
    items: behaviors,
    triggerClassName: "min-w-48",
    defaultSelectedKey: "kp",
  },
};

/** The behavior picker (BehaviorBindingPicker) — a plain labelled select. */
export const Basic: Story = {
  render: () => (
    <Select
      label="Behavior"
      items={behaviors}
      defaultSelectedKey="mt"
      triggerClassName="min-w-48"
    />
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Select
        label="Medium"
        size="md"
        items={behaviors}
        defaultSelectedKey="kp"
        triggerClassName="min-w-40"
      />
      <Select
        label="Small"
        size="sm"
        items={behaviors}
        defaultSelectedKey="kp"
        triggerClassName="min-w-40"
      />
    </div>
  ),
};

/** The zoom/scale picker (Keyboard.tsx) — defaults to "Auto". */
export const ScalePicker: Story = {
  render: () => {
    const scales = [
      { id: "auto", name: "Auto" },
      { id: "0.25", name: "25%" },
      { id: "0.5", name: "50%" },
      { id: "1", name: "100%" },
      { id: "1.5", name: "150%" },
      { id: "2", name: "200%" },
    ];
    const [key, setKey] = useState<Key>("auto");
    return (
      <Select
        aria-label="Scale"
        items={scales}
        selectedKey={key}
        onSelectionChange={setKey}
        size="sm"
        triggerClassName="w-28"
      />
    );
  },
};

/**
 * A Combobox — a text field that filters the list as you type (the combobox
 * pattern). Focus stays on the input, so hovering an option only highlights it.
 * For long lists (e.g. the HID usage picker).
 */
export const Searchable: Story = {
  render: () => {
    const keys = [
      { id: 4, name: "A" },
      { id: 5, name: "B" },
      { id: 6, name: "C" },
      { id: 40, name: "Enter" },
      { id: 41, name: "Escape" },
      { id: 42, name: "Backspace" },
      { id: 43, name: "Tab" },
      { id: 44, name: "Spacebar" },
      { id: 79, name: "Right Arrow" },
      { id: 80, name: "Left Arrow" },
      { id: 81, name: "Down Arrow" },
      { id: 82, name: "Up Arrow" },
      { id: 128, name: "Volume Up" },
      { id: 129, name: "Volume Down" },
    ];
    return (
      <Combobox
        label="Key"
        items={keys}
        placeholder="Search keys…"
        triggerClassName="min-w-56"
      />
    );
  },
};

/** A description + validation error attached to the field. */
export const WithDescriptionAndError: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Select
        label="Behavior"
        description="Determines what this binding does when pressed."
        items={behaviors}
        defaultSelectedKey="lt"
        triggerClassName="min-w-56"
      />
      <Select
        label="Behavior"
        items={behaviors}
        placeholder="Pick one…"
        isRequired
        isInvalid
        errorMessage="A behavior is required."
        triggerClassName="min-w-56"
      />
    </div>
  ),
};

/**
 * Templateable options — `renderItem` puts an icon + title + description in
 * each row via the SelectItemContent helper. The trigger shows just the icon +
 * title (`renderValue`).
 */
export const TemplatedOptions: Story = {
  render: () => {
    const richBehaviors = [
      {
        id: "kp",
        name: "Key Press",
        icon: <Keyboard />,
        desc: "Send a single key code",
      },
      {
        id: "mt",
        name: "Mod-Tap",
        icon: <ArrowRightLeft />,
        desc: "Modifier when held, key when tapped",
      },
      {
        id: "mo",
        name: "Momentary Layer",
        icon: <Layers />,
        desc: "Activate a layer while held",
      },
      {
        id: "tog",
        name: "Toggle Layer",
        icon: <ToggleLeft />,
        desc: "Flip a layer on or off",
      },
    ];
    return (
      <Select
        label="Behavior"
        items={richBehaviors}
        defaultSelectedKey="mt"
        triggerClassName="min-w-72"
        renderItem={(b) => (
          <SelectItemContent icon={b.icon} title={b.name} description={b.desc} />
        )}
        renderValue={(b) => (
          <SelectItemContent icon={b.icon} title={b.name} />
        )}
      />
    );
  },
};
