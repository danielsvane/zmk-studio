import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { AppMenu } from "./AppMenu";

const meta = {
  title: "Application/AppMenu",
  component: AppMenu,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AppMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The resting state: a version number and a chevron. Small and quiet on purpose,
 * since it sits in the header permanently and nothing here is part of editing a
 * keymap.
 */
export const Closed: Story = {};

/**
 * Open. Both rows lead to modals that, until this menu existed, were mounted in
 * `App.tsx` behind state nothing ever set, so this story is the first thing that
 * can prove either is reachable.
 *
 * The menu is queried on `document.body`, not the canvas: react-aria renders the
 * popover in a portal, which is outside `canvasElement`.
 */
export const MenuOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", { name: /^Application menu, version / })
    );

    await expect(
      await body.findByRole("menuitem", { name: "About ZMK Studio" })
    ).toBeInTheDocument();
    await expect(
      body.getByRole("menuitem", { name: "License notice" })
    ).toBeInTheDocument();
  },
};

/**
 * The About modal, which carries the sponsor wall and is the app's only credit
 * screen. Reached the way a user reaches it, rather than by rendering
 * `AboutModal` directly, so the path itself is under test.
 */
export const AboutOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", { name: /^Application menu, version / })
    );
    await userEvent.click(
      await body.findByRole("menuitem", { name: "About ZMK Studio" })
    );

    await expect(
      await body.findByRole("dialog", { name: "About ZMK Studio" })
    ).toBeInTheDocument();
  },
};
