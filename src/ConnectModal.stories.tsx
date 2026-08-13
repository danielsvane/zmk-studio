import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

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
  unavailableReason:
    "Needs Web Bluetooth: Linux only, in Chrome or Edge.\n\n" +
    "The desktop app has no such limit, but builds of this version aren't " +
    "published yet.",
};

// The desktop (Tauri) shape: transports enumerate devices themselves, so the
// modal lists every device instead of asking for a connection type first. A
// browser can't do this — Web Serial/Bluetooth own the chooser — which is why
// the two pickers differ in body while sharing the label/spacing/rows.
const device = (label: string, id: string) => ({ label, id });
const PICK_AND_CONNECT_TRANSPORTS: TransportFactory[] = [
  {
    label: "USB",
    pick_and_connect: {
      list: async () => [device("Manicule54", "/dev/ttyACM0")],
      connect: fn() as never,
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
        device("Engrammer", "C4:19:D1:7A:03:9F"),
      ],
      connect: fn() as never,
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

// The first thing anyone sees. The transport buttons are `variant="tertiary"`:
// `secondary`'s fill is `base-200`, the same color as the modal panel, so a
// secondary button here rendered as bare text with no visible edge.
export const Open: Story = {};

/** Single transport — the shape a Chrome-on-desktop user gets (Web Serial only). */
export const OneTransport: Story = {
  args: { transports: [SIMPLE_TRANSPORTS[0]] },
};

/**
 * What most browsers actually show: USB usable, BLE listed but unavailable, its
 * requirements on hover (or on Tab — the button is `aria-disabled`, not
 * `disabled`, so it keeps both). Previously BLE was simply absent, leaving no
 * way to tell "unsupported here" from "my keyboard isn't wireless".
 */
export const WirelessUnavailable: Story = {
  args: { transports: [SIMPLE_TRANSPORTS[0], BLE_UNAVAILABLE] },
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
 */
export const DeviceList: Story = {
  args: { transports: PICK_AND_CONNECT_TRANSPORTS },
};

/** Nothing found — a keyboard that's unplugged or powered off looks like this. */
export const NoDevices: Story = {
  args: {
    transports: [
      { label: "USB", pick_and_connect: { list: async () => [], connect: fn() as never } },
    ],
  },
};
