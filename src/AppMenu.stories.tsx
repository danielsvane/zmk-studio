import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { AppMenuView } from "./AppMenu";

// A release *newer* than this build, in release-please's format. The version
// has to be one `__APP_VERSION__` isn't, or the trigger and the menu row show
// the same number and the story stops demonstrating anything: the trigger is
// what you're running, the row is what's on offer.
const UPDATE = {
  currentVersion: __APP_VERSION__,
  version: "0.5.0",
  body:
    "## [0.5.0](https://github.com/danielsvane/zmk-studio/compare/v0.4.1...v0.5.0) (2026-08-20)\n" +
    "\n\n### Features\n\n" +
    "* **header:** add an app menu showing the version " +
    "([a99c3e8](https://github.com/danielsvane/zmk-studio/commit/a99c3e8))\n" +
    "* **updater:** check for updates on launch and install them in app " +
    "([8301dfd](https://github.com/danielsvane/zmk-studio/commit/8301dfd))",
};

const meta = {
  title: "Application/AppMenu",
  component: AppMenuView,
  parameters: { layout: "centered" },
  args: {
    update: null,
    install: { phase: "idle" },
    onInstall: fn(),
  },
} satisfies Meta<typeof AppMenuView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens the menu, so the stories below show it rather than just its trigger. */
const openMenu = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(
    canvas.getByRole("button", { name: /^Application menu, version / })
  );
  // react-aria portals the popover, so it lands outside `canvasElement`.
  return within(canvasElement.ownerDocument.body);
};

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
 */
export const MenuOpen: Story = {
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);

    await expect(
      await body.findByRole("menuitem", { name: "About ZMK Studio" })
    ).toBeInTheDocument();
    await expect(
      body.getByRole("menuitem", { name: "License notice" })
    ).toBeInTheDocument();
    // Nothing to update, so no row for it.
    await expect(body.queryByRole("menuitem", { name: /^Update to/ })).toBeNull();
  },
};

/**
 * An update, announced by a dot next to the version. The number itself does not
 * change: it means "the version you are running", which is what a bug report
 * needs and what the About dialog will agree with. Swapping it for the version
 * on offer would make the header state something false about the running build
 * for as long as the user ignores the update. The dot carries the news, the menu
 * row names the new version.
 *
 * This is as loud as it gets. Nothing else on screen changes, and no dialog
 * opens on its own.
 */
export const UpdateAvailable: Story = {
  args: { update: UPDATE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The dot is decorative, so the label is where an update is announced.
    await expect(
      canvas.getByRole("button", {
        name: /^Application menu, version .*, update available$/,
      })
    ).toBeInTheDocument();
  },
};

/**
 * The update row, first in the menu because it's the only thing here anyone is
 * waiting for.
 */
export const UpdateAvailableMenuOpen: Story = {
  args: { update: UPDATE },
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);

    const items = await body.findAllByRole("menuitem");
    await expect(items[0]).toHaveTextContent("Update to 0.5.0");
    await expect(items).toHaveLength(3);
  },
};

/**
 * The whole path a user actually walks: notice the dot, open the menu, land in
 * the update dialog.
 */
export const UpdateModalFromMenu: Story = {
  args: { update: UPDATE },
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);

    await userEvent.click(
      await body.findByRole("menuitem", { name: "Update to 0.5.0" })
    );

    await expect(
      await body.findByRole("dialog", { name: "Update available" })
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
    const body = await openMenu(canvasElement);

    await userEvent.click(
      await body.findByRole("menuitem", { name: "About ZMK Studio" })
    );

    await expect(
      await body.findByRole("dialog", { name: "About ZMK Studio" })
    ).toBeInTheDocument();
  },
};

/** The license notice, the other thing that had no way to be opened before. */
export const LicenseNoticeOpen: Story = {
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);

    await userEvent.click(
      await body.findByRole("menuitem", { name: "License notice" })
    );

    await expect(
      await body.findByRole("dialog", { name: "License notice" })
    ).toBeInTheDocument();
  },
};
