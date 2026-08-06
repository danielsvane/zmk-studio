import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import {
  Undo2,
  Redo2,
  Save,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";
import { Button, ToggleButton, ButtonGroup } from "./Button";

const meta = {
  title: "Misc/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "link"],
    },
    size: { control: "inline-radio", options: ["sm", "md"] },
    iconPosition: { control: "inline-radio", options: ["start", "end"] },
    isDisabled: { control: "boolean" },
  },
  args: { onPress: fn(), children: "Button" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <p className="text-xs font-bold uppercase opacity-60">{title}</p>
    {children}
  </div>
);

/** Interactive playground driven by the Controls panel. */
export const Playground: Story = {
  args: { variant: "primary" },
};

export const Variants: Story = {
  render: () => (
    <Row>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </Row>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Row>
      <Button variant="primary" size="md">
        Medium
      </Button>
      <Button variant="primary" size="sm">
        Small
      </Button>
    </Row>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Row>
      <Button variant="primary" isDisabled>
        Primary
      </Button>
      <Button variant="secondary" isDisabled>
        Secondary
      </Button>
      <Button variant="ghost" isDisabled>
        Ghost
      </Button>
      <Button variant="ghost" isDisabled icon={<Save />} aria-label="Save" />
    </Row>
  ),
};

/** Icon can sit before or after the label. Mirrors the combo "Add" button. */
export const WithIcon: Story = {
  render: () => (
    <Row>
      <Button variant="primary" icon={<Plus />}>
        Add
      </Button>
      <Button variant="secondary" icon={<ArrowRight />} iconPosition="end">
        Next
      </Button>
      <Button variant="primary" size="sm" icon={<Plus />}>
        Add
      </Button>
    </Row>
  ),
};

/**
 * Icon-only buttons require an `aria-label`. This is the AppHeader toolbar
 * (undo/redo/save/discard) and the LayerPicker +/- controls.
 */
export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Section title="AppHeader toolbar (ghost)">
        <Row>
          <Button variant="ghost" icon={<Undo2 />} aria-label="Undo" />
          <Button variant="ghost" icon={<Redo2 />} aria-label="Redo" />
          <Button variant="ghost" icon={<Save />} aria-label="Save" />
          <Button variant="ghost" icon={<Trash2 />} aria-label="Discard" />
        </Row>
      </Section>
      <Section title="LayerPicker controls (small)">
        <Row>
          <Button
            variant="ghost"
            size="sm"
            icon={<Minus />}
            aria-label="Remove layer"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus />}
            aria-label="Add layer"
          />
        </Row>
      </Section>
    </div>
  ),
};

/** Single toggle — the pressed/active state. */
export const Toggle: Story = {
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <ToggleButton isSelected={on} onChange={setOn}>
        {on ? "On" : "Off"}
      </ToggleButton>
    );
  },
};

/**
 * Segmented toggle group — the HidUsagePicker implicit-modifier row
 * (L Ctrl / L Shift / …). Each item is a ToggleButton inside a ButtonGroup.
 */
export const ToggleGroup: Story = {
  render: () => {
    const mods = ["L Ctrl", "L Shift", "L Alt", "L GUI"];
    const [selected, setSelected] = useState<Record<string, boolean>>({
      "L Shift": true,
    });
    return (
      <ButtonGroup>
        {mods.map((m) => (
          <ToggleButton
            key={m}
            isSelected={!!selected[m]}
            onChange={(v) => setSelected((s) => ({ ...s, [m]: v }))}
          >
            {m}
          </ToggleButton>
        ))}
      </ButtonGroup>
    );
  },
};

/**
 * The header section tabs (Layers / Combos / Behaviours) — ghost `ToggleButton`s
 * used as nav. The selected tab shows the *quiet* active-nav tint
 * (`bg-primary/15 text-primary`), matching the selected sidebar row rather than
 * the loud solid `bg-primary` used for in-content selection. See the
 * Interaction-states note in DESIGN-SYSTEM.md.
 */
export const NavTabs: Story = {
  render: () => {
    const tabs = ["Layers", "Combos", "Behaviors"];
    const [active, setActive] = useState("Combos");
    return (
      <nav className="flex items-center gap-1 rounded bg-base-200 p-2">
        {tabs.map((t) => (
          <ToggleButton
            key={t}
            variant="ghost"
            isSelected={active === t}
            onChange={() => setActive(t)}
          >
            {t}
          </ToggleButton>
        ))}
      </nav>
    );
  },
};

/** A non-toggle group, e.g. clustered actions sharing one surface. */
export const ActionGroup: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="secondary" icon={<Undo2 />} aria-label="Undo" />
      <Button variant="secondary" icon={<Redo2 />} aria-label="Redo" />
    </ButtonGroup>
  ),
};
