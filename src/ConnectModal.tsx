import { useCallback, useEffect, useId, useMemo, useState } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";
import type { AvailableDevice } from "./tauri/index";
import { Bluetooth, Plug, RefreshCw } from "lucide-react";
import { ListBox, ListBoxItem } from "react-aria-components";
import { useModalRef } from "./misc/useModalRef";
import { ExternalLink } from "./misc/ExternalLink";
import { GenericModal } from "./GenericModal";
import { Button } from "./misc/Button";
import { Tooltip } from "./misc/Tooltip";
import { fieldColumn, GroupLabel } from "./misc/Field";
import { controlSurface, cx, menuItem } from "./misc/controlStyles";

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

    LoadEm();
  }, [LoadEm]);

  const connect = useCallback(
    (entry: DeviceEntry) => {
      entry.transport
        .pick_and_connect!.connect(entry.device)
        .then(onTransportCreated)
        .catch((e) => alert(e));
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
          isDisabled={refreshing}
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
          </ListBoxItem>
        )}
      </ListBox>
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
    <div className="m-4 flex flex-col gap-2">
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
    <GenericModal ref={dialog} className="max-w-xl" title="Welcome to ZMK Studio">
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
