import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader } from "./AppHeader";

const meta = {
  title: "Application/AppHeader",
  component: AppHeader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: {},
};

// Connected, full-width, sitting above a stand-in `w-72` sidebar (the real
// SIDEBAR_REGION width). Verifies the header layout decision: the logo fills the
// sidebar-width column and the nav tabs begin exactly at the sidebar's right
// divider — tabs over the editor, logo over the sidebar, one continuous left
// edge. (No mock RPC transport, so the live editor can't render here — this stub
// body just makes the alignment checkable.)
export const ConnectedWithSidebar: Story = {
  parameters: { layout: "fullscreen" },
  args: { connectedDeviceLabel: "Engrammer", page: "layers" },
  render: (args) => (
    <div className="grid h-80 grid-rows-[auto_1fr] bg-base-100">
      <AppHeader {...args} />
      <div className="grid grid-cols-[auto_1fr] bg-base-300">
        <div className="flex w-72 flex-col gap-4 border-r border-base-line bg-base-200 p-4">
          <h2 className="text-sm font-bold uppercase opacity-70">Layers</h2>
          <div className="rounded bg-primary/15 p-3 text-primary">0</div>
          <div className="p-3">Nav</div>
        </div>
        <div className="p-6 text-base-content/60">editor…</div>
      </div>
    </div>
  ),
};
