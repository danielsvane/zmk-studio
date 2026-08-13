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
  Download,
} from "lucide-react";
import { Button, ToggleButton, ButtonGroup, LinkButton } from "./Button";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "Misc/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "ghost", "link"],
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

/** Every variant in `controlStyles.ts`; add one there and both stories pick it up. */
const VARIANTS = [
  "primary",
  "secondary",
  "tertiary",
  "ghost",
  "link",
  "danger",
] as const;

export const Variants: Story = {
  render: () => (
    <Row>
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant[0].toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </Row>
  ),
};

/**
 * Why `tertiary` exists: `secondary`'s fill *is* `base-200`, the modal/sidebar/
 * header surface, so on one of those panels it reads as bare text. Tertiary's
 * hairline gives it an edge without promoting it to the primary action. Each
 * column below is one surface; compare down it, not across.
 */
export const OnPanelSurfaces: Story = {
  render: () => (
    <div className="flex gap-4">
      {(
        [
          ["bg-base-100", "base-100 (popover)"],
          ["bg-base-200", "base-200 (modal/sidebar)"],
          ["bg-base-300", "base-300 (app bg)"],
        ] as const
      ).map(([surface, label]) => (
        <div
          key={surface}
          className={`flex flex-col items-start gap-3 rounded p-4 ${surface}`}
        >
          <p className="text-xs font-bold uppercase opacity-60">{label}</p>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
        </div>
      ))}
    </div>
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

/**
 * Every variant, since `controlDisabled` sits in `buttonStyles`' shared `base`
 * — `opacity-50` + `cursor-not-allowed`, no per-variant opt-in. Enabled row on
 * top for comparison.
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {[false, true].map((isDisabled) => (
        <Row key={String(isDisabled)}>
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} isDisabled={isDisabled}>
              {variant[0].toUpperCase() + variant.slice(1)}
            </Button>
          ))}
          <Button
            variant="ghost"
            isDisabled={isDisabled}
            icon={<Save />}
            aria-label="Save"
          />
        </Row>
      ))}
    </div>
  ),
};

/**
 * `isUnavailable` vs `isDisabled`. Both look the same, but the first renders
 * `aria-disabled` and stays focusable and hoverable, so a wrapping `Tooltip` can
 * say *why* — a truly `disabled` button fires no pointer events and leaves the
 * tab order, so its tooltip can never open. Use `isUnavailable` whenever the
 * reason is worth reading (the `ConnectModal` BLE button).
 */
export const Unavailable: Story = {
  render: () => (
    <Row>
      <Tooltip label="Needs Chrome or Edge on Linux." delay={300}>
        <Button variant="tertiary" isUnavailable>
          Unavailable
        </Button>
      </Tooltip>
      <Tooltip label="You will never read this." delay={300}>
        <Button variant="tertiary" isDisabled>
          Disabled
        </Button>
      </Tooltip>
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

/**
 * `LinkButton` — a button that navigates. Identical surface to `Button` (same
 * `buttonStyles`), but a real `<a>`, so Enter follows it, cmd/middle-click opens
 * a new tab, and "Copy link address" works. This is the DownloadPage CTA.
 *
 * Do *not* reach for `<a><Button/></a>` instead: `usePress` calls
 * `preventDefault()` on the Enter/Space keydown of a `type="button"` button, so
 * no click is ever dispatched to bubble to the anchor — mouse navigates,
 * keyboard doesn't, and nothing warns you. Tab through the row below: one stop
 * each, ring on the button itself. The wrapper version takes two.
 */
export const AsLink: Story = {
  render: () => (
    <Row>
      <LinkButton variant="primary" href="#" icon={<Download />}>
        Download for Linux
      </LinkButton>
      <LinkButton variant="tertiary" href="#" icon={<ArrowRight />} iconPosition="end">
        Release notes
      </LinkButton>
      <LinkButton variant="link" href="#">
        Inline link
      </LinkButton>
    </Row>
  ),
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
