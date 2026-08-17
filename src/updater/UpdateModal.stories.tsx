import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";

import { UpdateModal } from "./UpdateModal";

// The real v0.4.1 body from the published manifest, so the stories show what a
// release-please changelog actually looks like once parsed rather than prose
// written to flatter the layout.
const REAL_NOTES =
  "## [0.4.1](https://github.com/danielsvane/zmk-studio/compare/v0.4.0...v0.4.1) (2026-08-12)\n" +
  "\n\n### Bug Fixes\n\n" +
  "* **download:** address the rolling release by tag, not /releases/latest " +
  "([b79cb58](https://github.com/danielsvane/zmk-studio/commit/b79cb585ea9abd5ee8a5a4a25a7d184d977a5bd1))";

// A release with enough in it to make the notes region scroll, which is the
// case the fixed `max-h` exists for.
const LONG_NOTES =
  "## [0.6.0](https://example.invalid/compare) (2026-09-01)\n\n### Features\n\n" +
  Array.from(
    { length: 9 },
    (_, i) =>
      `* **combos:** feature number ${i + 1} with a subject long enough to wrap ` +
      `onto a second line ([abc${i}23f](https://example.invalid/commit/abc${i}23f))`
  ).join("\n") +
  "\n\n### Bug Fixes\n\n" +
  Array.from(
    { length: 6 },
    (_, i) => `* **rpc:** fix number ${i + 1} ([def${i}45a](https://example.invalid))`
  ).join("\n");

const meta = {
  title: "Application/UpdateModal",
  component: UpdateModal,
  args: {
    open: true,
    currentVersion: "0.4.0",
    version: "0.4.1",
    notes: REAL_NOTES,
    install: { phase: "idle" },
    onInstall: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof UpdateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The offer. Note what the notes region does to a release-please body: no URLs,
 * no `##`, no `**`, just the headings and bullets that carry the meaning.
 */
export const Available: Story = {};

/** Long enough to scroll, which is what the notes region's `max-h` is for. */
export const LongReleaseNotes: Story = {
  args: { version: "0.6.0", notes: LONG_NOTES },
};

/**
 * A release with no notes at all. The region is dropped rather than left as an
 * empty bordered box.
 */
export const NoReleaseNotes: Story = {
  args: { notes: undefined },
};

/**
 * Mid-download. Both buttons go disabled: closing here would leave the install
 * running with nothing watching it and nowhere to report a failure.
 */
export const Downloading: Story = {
  args: {
    install: { phase: "downloading", received: 34_000_000, total: 88_000_000 },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "39"
    );
    await expect(body.getByRole("button", { name: "Later" })).toBeDisabled();
  },
};

/**
 * Downloading before the server has said how big the file is. The bar is
 * present but announces no value, rather than claiming 0%.
 */
export const DownloadingUnknownSize: Story = {
  args: { install: { phase: "downloading", received: 0 } },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  },
};

/** Downloaded, being written into place. On some platforms this is the slow half. */
export const Installing: Story = {
  args: { install: { phase: "installing" } },
};

/**
 * The failure that will actually happen: a .deb install, where the check
 * succeeds and the install cannot, because the plugin only knows how to replace
 * an AppImage on Linux. The message is the plugin's own, and the copy beneath it
 * says what to do about it. The primary button becomes "Try again", since the
 * same press is still the right one after a transient network failure.
 */
export const InstallFailed: Story = {
  args: {
    install: {
      phase: "failed",
      message: "APPIMAGE environment variable was not found",
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole("alert")).toHaveTextContent(
      "APPIMAGE environment variable was not found"
    );
    await expect(
      body.getByRole("button", { name: "Try again" })
    ).toBeEnabled();
  },
};
