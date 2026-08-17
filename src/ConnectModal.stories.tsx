import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useEffect } from "react";

import { ConnectModal, type TransportFactory } from "./ConnectModal";

// A transport with no `pick_and_connect` routes ConnectOptions to the simple
// picker (one button per transport) rather than the DeviceList — no RPC needed,
// so `connect` is never called in a story.
const SIMPLE_TRANSPORTS: TransportFactory[] = [
  { label: "USB", connect: fn() as never },
  { label: "BLE", isWireless: true, connect: fn() as never },
];

// Mirrors App.tsx's BLE_REQUIREMENTS — the copy lives there, with the platform
// check it explains; duplicated here only so the story is self-contained.
const BLE_UNAVAILABLE: TransportFactory = {
  label: "BLE",
  isWireless: true,
  unavailableReason:
    "Needs Web Bluetooth: Chrome or Edge on Linux, with " +
    "#experimental-web-platform-features enabled in chrome://flags.\n\n" +
    "The desktop app has no such limit. See the download link below.",
};

// Storybook runs in a browser, so every story below is a *web* build and shows
// the desktop-app button. The desktop stories opt out through this decorator —
// without it they'd advertise a download the real app never offers.
const asDesktopApp: Decorator = (Story) => {
  window.__TAURI_INTERNALS__ ??= {};
  useEffect(() => {
    return () => {
      delete window.__TAURI_INTERNALS__;
    };
  }, []);
  return <Story />;
};

// The desktop (Tauri) shape: transports enumerate devices themselves, so the
// modal lists every device instead of asking for a connection type first. A
// browser can't do this — Web Serial/Bluetooth own the chooser — which is why
// the two pickers differ in body while sharing the label/spacing/rows.
const device = (label: string, id: string) => ({ label, id });

// What a click does is the point of the desktop stories, so `connect` is the
// parameter and the device list is fixed. A bare `fn()` won't do: it resolves
// to `undefined`, which is neither a pending connect nor a failed one.
type Connect = NonNullable<TransportFactory["pick_and_connect"]>["connect"];
const HANGS: Connect = fn(() => new Promise<never>(() => {}));
const FAILS: Connect = fn(() =>
  Promise.reject(new Error("Failed to open the device: Not connected"))
);

const desktopTransports = (connect: Connect): TransportFactory[] => [
  {
    label: "USB",
    pick_and_connect: {
      list: async () => [device("Manicule54", "/dev/ttyACM0")],
      connect,
    },
  },
  {
    label: "BLE",
    isWireless: true,
    pick_and_connect: {
      // Deliberately repeats a name from the USB lister: the same keyboard shows
      // up under both, and the row icon is what tells them apart.
      list: async () => [
        device("Manicule54", "E1:22:B0:0B:14:5E"),
        device("Benjiboard", "CD:70:5A:F0:CE:6E"),
      ],
      connect,
    },
  },
];

const meta = {
  title: "Application/ConnectModal",
  component: ConnectModal,
  args: {
    open: true,
    transports: SIMPLE_TRANSPORTS,
    onTransportCreated: fn(),
  },
} satisfies Meta<typeof ConnectModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// The first thing anyone sees: one full-width button per thing you can do here,
// stacked. The two connect buttons are `primary`; the download is `tertiary`,
// which is the one step down that works on this surface — `secondary`'s fill is
// `base-200`, the same color as the modal panel, so it would render as bare
// centred text with no visible edge.
export const Open: Story = {};

/** Single transport — the shape a Chrome-on-desktop user gets (Web Serial only). */
export const OneTransport: Story = {
  args: { transports: [SIMPLE_TRANSPORTS[0]] },
};

/**
 * What most browsers actually show: USB usable, Bluetooth listed but
 * unavailable, its requirements on hover (or on Tab — the button is
 * `aria-disabled`, not `disabled`, so it keeps both). Previously it was simply
 * absent, leaving no way to tell "unsupported here" from "my keyboard isn't
 * wireless".
 */
export const WirelessUnavailable: Story = {
  args: { transports: [SIMPLE_TRANSPORTS[0], BLE_UNAVAILABLE] },
};

/**
 * The same story with the tooltip open, because that bubble is the only place
 * the requirements are written down and it is invisible in every other story.
 * Worth a screenshot of its own: it's a paragraph of copy in a `max-w-xs`
 * bubble containing a 35-character flag name, so this is where an edit that
 * overflows or badly wraps it shows up.
 */
export const WirelessUnavailableTooltip: Story = {
  args: { transports: [SIMPLE_TRANSPORTS[0], BLE_UNAVAILABLE] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Tab, not hover. react-aria opens a tooltip on hover from its
    // `onPointerEnter`, and neither `userEvent.hover` nor a hand-dispatched
    // PointerEvent gets there — only a real (trusted) pointer does, which a play
    // function has no way to produce. Keyboard focus is the other trigger and it
    // does work: the keydown sets react-aria's interaction modality, so the
    // focus that follows counts as focus-visible and opens the bubble. It's also
    // the path that most needs a test — `isUnavailable` renders `aria-disabled`
    // rather than `disabled` precisely so this button stays in the tab order.
    //
    // Focus the button before it explicitly, rather than assuming where the
    // dialog's initial focus landed.
    canvas.getByRole("button", { name: "Connect using USB" }).focus();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Connect using Bluetooth" })
    ).toHaveFocus();

    await expect(await canvas.findByRole("tooltip")).toHaveTextContent(
      "#experimental-web-platform-features"
    );
  },
};

/** The `status` line, shown while probing serial ports during auto-reconnect. */
export const WithStatus: Story = {
  args: { status: "Probing serial ports…" },
};

/** No Web Serial / Web Bluetooth — the unsupported-browser prompt instead. */
export const NoTransports: Story = {
  args: { transports: [] },
};

/**
 * The desktop app's picker: one row per device per transport, on the same 48px
 * `menuItem` rows the DropdownMenu uses, framed as a control so they don't read
 * as static text. Clicking a row connects — there's no selection to confirm.
 * The two states a click leads to are the stories below.
 */
export const DeviceList: Story = {
  decorators: [asDesktopApp],
  args: { transports: desktopTransports(HANGS) },
};

/**
 * A connect in flight. The row keeps its place and takes a spinner — no caption,
 * so the row doesn't reflow around it — and the others go unavailable, because
 * the native side holds one transport at a time and a second attempt would race
 * the first.
 *
 * Left alone this story becomes the timeout after 20s — neither transport
 * bounds its own wait, and a BLE link that BlueZ still calls connected can
 * swallow a connect for two minutes before erroring.
 */
export const Connecting: Story = {
  decorators: [asDesktopApp],
  args: { transports: desktopTransports(HANGS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("option", { name: "Benjiboard" }));

    await expect(
      await canvas.findByRole("img", { name: "Connecting" })
    ).toBeInTheDocument();
    // The rows that aren't being connected to.
    for (const row of canvas.getAllByRole("option", { name: "Manicule54" })) {
      await expect(row).toHaveAttribute("aria-disabled", "true");
    }
  },
};

/**
 * A failed connect. The message goes inline under the list rather than to
 * `alert()`: on the desktop that's a blocking OS dialog stacked on a modal, and
 * it can't say which device failed. The list stays live so the next row is one
 * click away.
 */
export const ConnectFailed: Story = {
  decorators: [asDesktopApp],
  args: { transports: desktopTransports(FAILS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("option", { name: "Benjiboard" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Failed to open the device: Not connected"
    );
  },
};

/** Nothing found — a keyboard that's unplugged or powered off looks like this. */
export const NoDevices: Story = {
  decorators: [asDesktopApp],
  args: {
    transports: [
      { label: "USB", pick_and_connect: { list: async () => [], connect: HANGS } },
    ],
  },
};
