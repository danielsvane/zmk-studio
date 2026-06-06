import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import {
  ChevronDown,
  Unplug,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";

import { Button } from "./Button";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";
import { cx, menuItem, popoverSurface } from "./controlStyles";

// DropdownMenu is a react-aria MenuTrigger: it only renders its popover once the
// trigger is pressed, which a static screenshot can't do. So this story shows
// two things — the LIVE component (open it in the running Storybook to check
// keyboard nav / hover) and a STATIC panel built from the same `popoverSurface`
// + `menuItem` tokens so `shoot` captures the open look (same approach as
// SidebarItemIdeas.stories.tsx).

// No `component` — these stories render the menu manually (a MenuTrigger can't
// be driven by the Controls panel), so we don't want its required props forced
// onto every story as args.
const meta = {
  title: "Misc/DropdownMenu",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const ITEMS = [
  { label: "Disconnect", icon: <Unplug /> },
  { label: "Restore Stock Settings", icon: <RotateCcw /> },
  { label: "Export Backup…", icon: <Download /> },
  { label: "Import Backup…", icon: <Upload /> },
];

// A non-interactive mock of one open menu, rendered from the real tokens. The
// second row carries the lighten overlay manually so the hover/focus state is
// visible in a static screenshot (the live `rac-hover`/`rac-focus` can't fire
// without pointer/keyboard).
function StaticPanel() {
  return (
    <div className={cx(popoverSurface, "p-1", "w-64")}>
      {ITEMS.map((item, i) => (
        <button
          key={item.label}
          type="button"
          className={cx(menuItem, i === 1 && "bg-base-content/10")}
        >
          <span aria-hidden className="flex shrink-0 items-center">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex items-start gap-12 bg-base-300 p-10">
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-base-content/50">
          Live (click to open)
        </div>
        <DropdownMenu
          trigger={
            <Button variant="ghost" icon={<ChevronDown />} iconPosition="end">
              Engrammer
            </Button>
          }
        >
          <DropdownMenuItem icon={<Unplug />} onAction={fn()}>
            Disconnect
          </DropdownMenuItem>
          <DropdownMenuItem icon={<RotateCcw />} onAction={fn()}>
            Restore Stock Settings
          </DropdownMenuItem>
          <DropdownMenuItem icon={<Download />} onAction={fn()}>
            Export Backup…
          </DropdownMenuItem>
          <DropdownMenuItem icon={<Upload />} onAction={fn()}>
            Import Backup…
          </DropdownMenuItem>
        </DropdownMenu>
      </div>

      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-base-content/50">
          Open panel (2nd row = hover)
        </div>
        <StaticPanel />
      </div>
    </div>
  ),
};
