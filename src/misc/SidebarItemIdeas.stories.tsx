import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight } from "lucide-react";

import { cx } from "./controlStyles";
import { HidUsageLabel } from "../keyboard/HidUsageLabel";
import { PhysicalLayout } from "../keyboard/PhysicalLayout";
import { keyPhysicalAttrsToPositions } from "../keyboard/layoutKeyPositions";
import {
  FIXTURE_BEHAVIOR_MAP,
  FIXTURE_COMBOS,
  FIXTURE_LAYOUT,
} from "../combos/comboFixtures";

// Ideation / decision-record story (not a production component). Renders all
// three sidebars — Layers, Combos (with the mini-keyboard preview), Behaviours —
// with the pre-redesign "Current (old)" treatment next to the nav-style
// alternatives that were weighed, so the choice can be revisited later. Variant
// B ("Filled pill") was chosen and is what the shared `selectableCard` /
// `SidebarCard` now render; the "Current"/"D" columns are frozen to the old
// filled-tile look via the local LEGACY_CARD below so this comparison still
// shows what changed. Kept on purpose — see DESIGN-SYSTEM.md (selectableCard).

const LAYERS = ["0", "Nav", "Num", "Sym"];
const SELECTED_LAYER = 1; // "Nav"
const SELECTED_COMBO = 0;
const SELECTED_BEHAVIOUR = 1;

const BEHAVIOURS = [
  { id: 0, displayName: "Key Press", kind: "key_press" },
  { id: 1, displayName: "Mod-Tap", kind: "mod_tap" },
  { id: 2, displayName: "Layer-Tap", kind: "layer_tap" },
];

const previewPositions = keyPhysicalAttrsToPositions(FIXTURE_LAYOUT);

// The ORIGINAL filled-tile card, inlined (frozen) so the "Current"/"D" columns
// keep showing the pre-redesign look for comparison even after the shared
// `selectableCard` token moved to the chosen borderless pill (variant B).
const LEGACY_CARD = {
  base: "cursor-pointer rounded border p-3 text-left transition-[background-color,border-color,filter]",
  resting:
    "border-base-line bg-base-100 hover:border-base-content/25 hover:brightness-125",
  selected: "border-primary bg-primary/15",
};

// --- Variant definitions: each is just the row "chrome" (wrapper classes +
// whether it shows a left accent rail / a right drill-in chevron). The row
// *content* is shared, so every treatment is judged on identical data. --------

interface Variant {
  title: string;
  note: string;
  /** classes for the <ul> */
  list: string;
  /** classes for the row <button>, given its selected state */
  item: (selected: boolean) => string;
  rail?: boolean;
  chevron?: boolean;
}

const VARIANTS: Variant[] = [
  {
    title: "Current (old)",
    note: "card + border + chevron = looks like a Select",
    list: "flex flex-col gap-2",
    item: (s) =>
      cx(
        LEGACY_CARD.base,
        "flex w-full items-center gap-2",
        s ? LEGACY_CARD.selected : LEGACY_CARD.resting,
      ),
    chevron: true,
  },
  {
    title: "A · Nav rail",
    note: "borderless + accent rail + tint, no chevron",
    list: "flex flex-col gap-0.5",
    item: (s) =>
      cx(
        "flex w-full items-center gap-2.5 rounded px-2.5 py-2.5 text-left transition-colors",
        s
          ? "bg-primary/15 text-primary"
          : "text-base-content/80 hover:bg-base-content/10",
      ),
    rail: true,
  },
  {
    title: "B · Filled pill ✓",
    note: "CHOSEN — borderless, tinted fill on select",
    list: "flex flex-col gap-0.5",
    item: (s) =>
      cx(
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors",
        s
          ? "bg-primary/15 text-primary"
          : "text-base-content/80 hover:bg-base-content/10",
      ),
  },
  {
    title: "C · Divider list",
    note: "hairline rows, no per-item box",
    list: "-mx-3 flex flex-col divide-y divide-base-line border-y border-base-line",
    item: (s) =>
      cx(
        "flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors",
        s ? "bg-primary/10 text-primary" : "hover:bg-base-content/8",
      ),
    rail: true,
  },
  {
    title: "D · Card, no chevron",
    note: "rejected — border alone still reads input-ish",
    list: "flex flex-col gap-2",
    item: (s) =>
      cx(
        LEGACY_CARD.base,
        "flex w-full items-center gap-2",
        s ? LEGACY_CARD.selected : LEGACY_CARD.resting,
      ),
  },
];

function Row({
  variant,
  selected,
  children,
}: {
  variant: Variant;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <button type="button" className={variant.item(selected)}>
        {variant.rail ? (
          <span
            aria-hidden
            className={cx(
              "w-0.5 shrink-0 self-stretch rounded-full",
              selected ? "bg-primary" : "bg-transparent",
            )}
          />
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
        {variant.chevron ? (
          <ChevronRight
            aria-hidden
            className={cx(
              "size-4 shrink-0",
              selected ? "text-primary" : "opacity-40",
            )}
          />
        ) : null}
      </button>
    </li>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-base-content/50 first:mt-0">
      {children}
    </div>
  );
}

function VariantColumn({ variant }: { variant: Variant }) {
  return (
    <div className="w-64 shrink-0">
      <div className="mb-2">
        <div className="text-sm font-bold text-base-content">{variant.title}</div>
        <div className="text-xs text-base-content/60">{variant.note}</div>
      </div>
      {/* base-200 = the real sidebar surface these rows sit on */}
      <div className="rounded-lg bg-base-200 p-3">
        <SectionHeading>Layers</SectionHeading>
        <ul className={variant.list}>
          {LAYERS.map((name, i) => (
            <Row key={i} variant={variant} selected={i === SELECTED_LAYER}>
              <span className="block truncate text-base font-medium">{name}</span>
            </Row>
          ))}
        </ul>

        <SectionHeading>Combos</SectionHeading>
        <ul className={variant.list}>
          {FIXTURE_COMBOS.combos.map((entry) => {
            const binding = entry.combo?.binding;
            const behaviorName = binding
              ? FIXTURE_BEHAVIOR_MAP[binding.behaviorId]?.displayName || "Unknown"
              : "—";
            const positions = entry.combo?.keyPositions || [];
            return (
              <Row
                key={entry.index}
                variant={variant}
                selected={entry.index === SELECTED_COMBO}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium opacity-50">
                    #{entry.index}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {behaviorName}
                  </span>
                  {binding ? (
                    <span className="ml-auto inline-flex shrink-0 text-xs opacity-70 [&_svg]:size-3.5">
                      <HidUsageLabel hid_usage={binding.param1} />
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 flex justify-center">
                  <PhysicalLayout
                    positions={previewPositions}
                    oneU={11}
                    keyVariant="preview"
                    selectedPositions={positions}
                  />
                </div>
              </Row>
            );
          })}
        </ul>

        <SectionHeading>Behaviors</SectionHeading>
        <ul className={variant.list}>
          {BEHAVIOURS.map((beh, i) => (
            <Row key={beh.id} variant={variant} selected={i === SELECTED_BEHAVIOUR}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {beh.displayName}
                </span>
                <span className="ml-auto shrink-0 text-xs opacity-60">
                  {beh.kind}
                </span>
              </div>
            </Row>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div className="flex gap-5 bg-base-300 p-6">
      {VARIANTS.map((v) => (
        <VariantColumn key={v.title} variant={v} />
      ))}
    </div>
  );
}

const meta = {
  title: "Ideation/SidebarItemIdeas",
  component: Gallery,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compare: Story = {};
