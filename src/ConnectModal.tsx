import { useCallback, useEffect, useMemo, useState } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";
import type { AvailableDevice } from "./tauri/index";
import { Bluetooth, RefreshCw } from "lucide-react";
import { Key, ListBox, ListBoxItem, Selection } from "react-aria-components";
import { useModalRef } from "./misc/useModalRef";
import { ExternalLink } from "./misc/ExternalLink";
import { GenericModal } from "./GenericModal";
import { Button } from "./misc/Button";
import { Tooltip } from "./misc/Tooltip";
import { fieldColumn } from "./misc/Field";

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

function DeviceList({
  open,
  transports,
  onTransportCreated,
}: {
  open: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}) {
  const [devices, setDevices] = useState<
    Array<[TransportFactory, AvailableDevice]>
  >([]);
  const [selectedDev, setSelectedDev] = useState(new Set<Key>());
  const [refreshing, setRefreshing] = useState(false);

  const LoadEm = useCallback(async () => {
    setRefreshing(true);
    const entries: Array<[TransportFactory, AvailableDevice]> = [];
    for (const t of transports.filter((t) => t.pick_and_connect)) {
      const devices = await t.pick_and_connect?.list();
      if (!devices) {
        continue;
      }

      entries.push(
        ...devices.map<[TransportFactory, AvailableDevice]>((d) => {
          return [t, d];
        })
      );
    }

    setDevices(entries);
    setRefreshing(false);
  }, [transports]);

  useEffect(() => {
    setSelectedDev(new Set());
    setDevices([]);

    LoadEm();
  }, [open, LoadEm]);

  const onRefresh = useCallback(() => {
    setSelectedDev(new Set());
    setDevices([]);

    LoadEm();
  }, [LoadEm]);

  const onSelect = useCallback(
    async (keys: Selection) => {
      if (keys === "all") {
        return;
      }
      const dev = devices.find(([, d]) => keys.has(d.id));
      if (dev) {
        dev[0]
          .pick_and_connect!.connect(dev[1])
          .then(onTransportCreated)
          .catch((e) => alert(e));
      }
    },
    [devices, onTransportCreated]
  );

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto]">
        <label>Select A Device:</label>
        <Button
          variant="ghost"
          icon={<RefreshCw className={refreshing ? "animate-spin" : ""} />}
          aria-label="Refresh"
          isDisabled={refreshing}
          onPress={onRefresh}
        />
      </div>
      <ListBox
        aria-label="Device"
        items={devices}
        onSelectionChange={onSelect}
        selectionMode="single"
        selectedKeys={selectedDev}
        className="flex flex-col gap-1 pt-1"
      >
        {([t, d]) => (
          <ListBoxItem
            className="grid grid-cols-[1em_1fr] rounded hover:bg-base-300 cursor-pointer px-1"
            id={d.id}
            aria-label={d.label}
          >
            {t.isWireless && (
              <Bluetooth className="w-4 justify-center content-center h-full" />
            )}
            <span className="col-start-2">{d.label}</span>
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
    // "Select a connection type." labels the button row, so the pair is spaced
    // as a field (`fieldColumn`'s gap-1.5) rather than with padding on the row.
    <div className={fieldColumn}>
      <p>Select a connection type.</p>
      <ul className="flex gap-2">{connections}</ul>
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
