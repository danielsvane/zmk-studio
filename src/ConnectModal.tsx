import { useCallback, useEffect, useId, useMemo, useState } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";
import type { AvailableDevice } from "./tauri/index";
import { Bluetooth, Loader2, Plug, RefreshCw } from "lucide-react";
import { ListBox, ListBoxItem } from "react-aria-components";
import { useModalRef } from "./misc/useModalRef";
import { ExternalLink } from "./misc/ExternalLink";
import { GenericModal } from "./GenericModal";
import { Button } from "./misc/Button";
import { Tooltip } from "./misc/Tooltip";
import { fieldColumn, GroupLabel } from "./misc/Field";
import { controlSurface, cx, menuItem } from "./misc/controlStyles";
import { valueAfter } from "./misc/async";

export type TransportFactory = {
  label: string;
  isWireless?: boolean;
  // Why this transport can't be used here (browser/platform requirements it
  // doesn't meet). Set it and the picker still lists the transport, as an
  // unavailable button whose tooltip carries this text — an option that's simply
  // absent leaves the user with nothing to act on. Plain text; newlines kept.
  unavailableReason?: string;
  connect?: () => Promise<RpcTransport>;
  // Fully establishes the connection itself (including device selection and any
  // probing), rather than returning a single transport for the app to drive.
  // Used by web USB serial, where a composite device exposes several ports and
  // we must probe to find the ZMK Studio endpoint.
  establish?: () => Promise<void>;
  pick_and_connect?: {
    list: () => Promise<Array<AvailableDevice>>;
    connect: (dev: AvailableDevice) => Promise<RpcTransport>;
  };
};

export interface ConnectModalProps {
  open?: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
  // Optional status line shown at the bottom of the modal, e.g. while probing
  // serial ports during an auto-reconnect.
  status?: string | null;
}

// One row of the desktop picker: the device, plus the transport that found it —
// clicking a row connects over *that* transport. The key is transport-qualified
// because the listers run independently, so a keyboard reachable both ways is
// listed once per transport and the two rows would otherwise collide in the
// react-aria collection.
type DeviceEntry = {
  id: string;
  transport: TransportFactory;
  device: AvailableDevice;
};

// Connecting has to be able to give up. The desktop transports can hang for as
// long as the OS lets them — the BLE path opens the device, waits for the
// adapter and then discovers GATT services, none of which carry a timeout of
// their own — and a promise that never settles renders as a click that did
// nothing at all. Generous, because a cold BLE connect plus service discovery
// legitimately takes a few seconds, but bounded so the row always comes back.
// Giving up is a UI-side decision only: the native side may still finish and
// hold a connection we never asked for. That resolves itself — the next connect
// replaces the stored channel, which drops the abandoned one's tasks.
const CONNECT_TIMEOUT_MS = 20_000;
const TIMED_OUT = Symbol("connect timed out");

function DeviceList({
  open,
  transports,
  onTransportCreated,
}: {
  open: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}) {
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // The entry id being connected, and why the last attempt failed.
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();

  const LoadEm = useCallback(async () => {
    setRefreshing(true);
    const entries: DeviceEntry[] = [];
    for (const t of transports.filter((t) => t.pick_and_connect)) {
      const devices = await t.pick_and_connect?.list();
      if (!devices) {
        continue;
      }

      entries.push(
        ...devices.map((d) => ({
          id: `${t.label}:${d.id}`,
          transport: t,
          device: d,
        }))
      );
    }

    setDevices(entries);
    setRefreshing(false);
  }, [transports]);

  useEffect(() => {
    setDevices([]);

    LoadEm();
  }, [open, LoadEm]);

  const onRefresh = useCallback(() => {
    setDevices([]);
    setError(null);

    LoadEm();
  }, [LoadEm]);

  const connect = useCallback(
    async (entry: DeviceEntry) => {
      setError(null);
      setConnecting(entry.id);
      try {
        // Failures used to go to `alert()`, which is fine in a browser but the
        // wrong surface for the desktop app: it's a blocking GTK/Win32 dialog
        // stacked on top of a modal, and it says nothing about which device.
        const attempt = entry.transport.pick_and_connect!.connect(entry.device);
        // Once the timeout has won the race, nothing is left to handle this
        // promise — swallow it separately so a rejection long afterwards (the
        // BLE path can take two minutes to give up) isn't an unhandled one.
        attempt.catch(() => {});
        const transport = await Promise.race([
          attempt,
          valueAfter(TIMED_OUT, CONNECT_TIMEOUT_MS),
        ]);
        if (transport === TIMED_OUT) {
          throw new Error(
            `${entry.device.label} didn't answer within ${CONNECT_TIMEOUT_MS / 1000} seconds. ` +
              (entry.transport.isWireless
                ? "Check that it's powered on and in range, then try again."
                : "Try unplugging and reconnecting it.")
          );
        }
        onTransportCreated(transport);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setConnecting(null);
      }
    },
    [onTransportCreated]
  );

  return (
    <div className={fieldColumn}>
      <div className="flex items-center justify-between gap-2">
        <GroupLabel id={labelId}>Select a device</GroupLabel>
        <Button
          variant="ghost"
          icon={<RefreshCw className={refreshing ? "animate-spin" : ""} />}
          aria-label="Refresh device list"
          isDisabled={refreshing || connecting !== null}
          onPress={onRefresh}
        />
      </div>
      {/* Framed as a control (`controlSurface`) with `menuItem` rows — the same
          48px action row the DropdownMenu uses. Unframed rows on the base-200
          modal panel read as static text, which is how this list looked before;
          and a device row *is* an action (it connects), not a selection to
          confirm, so `selectionMode="none"` + `onAction` rather than a
          selected-key dance. The list owns its scroll region, per GenericModal's
          note on not leaning on the dialog to scroll. */}
      <ListBox
        aria-labelledby={labelId}
        items={devices}
        // react-aria caches rendered items by item identity, so a row's own
        // state (here: which one is connecting) has to be declared or the
        // pending row never repaints.
        dependencies={[connecting]}
        selectionMode="none"
        className={cx(
          controlSurface,
          "max-h-64 overflow-y-auto rounded p-1 outline-none"
        )}
        renderEmptyState={() => (
          <p className="p-2 text-sm opacity-60">
            {refreshing
              ? "Looking for devices…"
              : "No devices found. Connect a keyboard over USB, or turn on a wireless one, then refresh."}
          </p>
        )}
      >
        {(entry: DeviceEntry) => (
          <ListBoxItem
            className={menuItem}
            textValue={entry.device.label}
            // One connection at a time — the native side keeps a single active
            // transport, so a second attempt while one is in flight would race
            // it. The row being connected stays undimmed and carries the
            // spinner instead.
            isDisabled={connecting !== null && connecting !== entry.id}
            onAction={() => connect(entry)}
          >
            {/* Wired vs wireless, because the two listers can surface the same
                keyboard under the same name — the icon is the only thing that
                says which row is which. `Plug` rather than lucide's literal
                `Usb`, which is a 45° plug drawing that turns to mush at the 16px
                row size (checked side by side). */}
            <span aria-hidden className="flex shrink-0 items-center">
              {entry.transport.isWireless ? <Bluetooth /> : <Plug />}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {entry.device.label}
            </span>
            {/* The spinner carries this on its own — a "Connecting…" caption
                next to it eats the width the device name truncates against,
                for a word the spinner already says. `role="img"` so the label
                is what AT announces. */}
            {connecting === entry.id && (
              <Loader2
                role="img"
                aria-label="Connecting"
                className="shrink-0 animate-spin opacity-70"
              />
            )}
          </ListBoxItem>
        )}
      </ListBox>
      {/* A connect can fail without the device list changing at all, so the
          message belongs here rather than in place of the list. `role="alert"`
          because it lands after the click that caused it. */}
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function SimpleDevicePicker({
  transports,
  onTransportCreated,
}: {
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}) {
  const [availableDevices, setAvailableDevices] = useState<
    AvailableDevice[] | undefined
  >(undefined);
  const [selectedTransport, setSelectedTransport] = useState<
    TransportFactory | undefined
  >(undefined);
  const labelId = useId();

  useEffect(() => {
    if (!selectedTransport) {
      setAvailableDevices(undefined);
      return;
    }

    let ignore = false;

    if (selectedTransport.establish) {
      const establishTransport = async () => {
        try {
          await selectedTransport?.establish?.();
        } catch (e) {
          if (!ignore) {
            console.error(e);
            if (e instanceof Error && !(e instanceof UserCancelledError)) {
              alert(e.message);
            }
          }
        } finally {
          if (!ignore) {
            setSelectedTransport(undefined);
          }
        }
      };

      establishTransport();
    } else if (selectedTransport.connect) {
      const connectTransport = async () => {
        try {
          const transport = await selectedTransport?.connect?.();

          if (!ignore) {
            if (transport) {
              onTransportCreated(transport);
            }
            setSelectedTransport(undefined);
          }
        } catch (e) {
          if (!ignore) {
            console.error(e);
            if (e instanceof Error && !(e instanceof UserCancelledError)) {
              alert(e.message);
            }
            setSelectedTransport(undefined);
          }
        }
      };

      connectTransport();
    } else {
      const loadAvailableDevices = async () => {
        const devices = await selectedTransport?.pick_and_connect?.list();

        if (!ignore) {
          setAvailableDevices(devices);
        }
      };

      loadAvailableDevices();
    }

    return () => {
      ignore = true;
    };
  }, [selectedTransport, onTransportCreated]);

  const connections = transports.map((t) => (
    <li key={t.label} className="list-none">
      {t.unavailableReason ? (
        // Shorter than the default 1s hover delay: this tooltip isn't a
        // reminder of what an icon means, it's the only place the requirements
        // are written down, and the button it hangs off does nothing else.
        <Tooltip label={t.unavailableReason} delay={300} placement="bottom">
          <Button variant="tertiary" isUnavailable>
            {t.label}
          </Button>
        </Tooltip>
      ) : (
        <Button variant="tertiary" onPress={() => setSelectedTransport(t)}>
          {t.label}
        </Button>
      )}
    </li>
  ));
  return (
    // "Select a connection type" labels the button row, so the pair is spaced as
    // a field (`fieldColumn`'s gap-1.5) rather than with padding on the row, and
    // it's a `GroupLabel` — the app's label style, wired to the row it names —
    // rather than a loose paragraph. Same shape as `DeviceList` above, so the
    // browser and desktop pickers read as one component with two bodies.
    <div className={fieldColumn}>
      <GroupLabel id={labelId}>Select a connection type</GroupLabel>
      <ul role="group" aria-labelledby={labelId} className="flex gap-2">
        {connections}
      </ul>
      {selectedTransport && availableDevices && (
        <ul>
          {availableDevices.map((d) => (
            <li
              key={d.id}
              className="m-1 p-1"
              onClick={async () => {
                onTransportCreated(
                  await selectedTransport!.pick_and_connect!.connect(d)
                );
                setSelectedTransport(undefined);
              }}
            >
              {d.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function noTransportsOptionsPrompt() {
  return (
    // No margin of its own: GenericModal's padding is the modal's inset, and a
    // second one here indented this body past the title.
    <div className="flex flex-col gap-2">
      <p>
        Your browser is not supported. ZMK Studio uses either{" "}
        <ExternalLink href="https://caniuse.com/web-serial">
          Web Serial
        </ExternalLink>{" "}
        or{" "}
        <ExternalLink href="https://caniuse.com/web-bluetooth">
          Web Bluetooth
        </ExternalLink>{" "}
        (Linux only) to connect to ZMK devices.
      </p>

      <div>
        <p>To use ZMK Studio, either:</p>
        <ul className="list-disc list-inside">
          <li>
            Use a browser that supports the above web technologies, e.g.
            Chrome/Edge, or
          </li>
          <li>
            Download our{" "}
            <ExternalLink href="/download">
              cross platform application
            </ExternalLink>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}

function ConnectOptions({
  transports,
  onTransportCreated,
  open,
}: {
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
  open?: boolean;
}) {
  const useSimplePicker = useMemo(
    () => transports.every((t) => !t.pick_and_connect),
    [transports]
  );

  return useSimplePicker ? (
    <SimpleDevicePicker
      transports={transports}
      onTransportCreated={onTransportCreated}
    />
  ) : (
    <DeviceList
      open={open || false}
      transports={transports}
      onTransportCreated={onTransportCreated}
    />
  );
}

export const ConnectModal = ({
  open,
  transports,
  onTransportCreated,
  status,
}: ConnectModalProps) => {
  const dialog = useModalRef(open || false, false, false);

  const haveTransports = useMemo(() => transports.length > 0, [transports]);

  return (
    // Pinned width, not `max-w-*`: a dialog sizes to its content, and this one's
    // content changes underneath the user — devices appear and disappear on a
    // refresh, a connect failure adds a line of prose, and the browser build
    // shows a paragraph where the desktop build shows rows. Sizing to each of
    // those made the modal jump every time its state changed. `w-full` keeps it
    // inside a viewport narrower than the cap.
    <GenericModal
      ref={dialog}
      className="w-full max-w-md"
      title="Welcome to ZMK Studio"
    >
      {haveTransports ? (
        <ConnectOptions
          transports={transports}
          onTransportCreated={onTransportCreated}
          open={open}
        />
      ) : (
        noTransportsOptionsPrompt()
      )}
      {status && (
        <p className="pt-3 text-sm opacity-70" aria-live="polite">
          {status}
        </p>
      )}
    </GenericModal>
  );
};
