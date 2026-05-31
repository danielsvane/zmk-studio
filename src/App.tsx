import { AppHeader } from "./AppHeader";

import {
  create_rpc_connection,
  RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "./rpc/logging";

import type { Notification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import { ConnectionState, ConnectionContext } from "./rpc/ConnectionContext";
import {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConnectModal, TransportFactory } from "./ConnectModal";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { connect as gatt_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import {
  openSerialTransport,
  pickZmkSerialPorts,
  rememberedZmkReconnect,
  rememberSerialPort,
} from "./transport/webSerial";
import {
  connect as tauri_ble_connect,
  list_devices as ble_list_devices,
} from "./tauri/ble";
import {
  connect as tauri_serial_connect,
  list_devices as serial_list_devices,
} from "./tauri/serial";
import Keyboard, { type Page } from "./keyboard/Keyboard";
import { UndoRedoContext, useUndoRedo } from "./undoRedo";
import { usePub, useSub } from "./usePubSub";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
import { UnlockModal } from "./UnlockModal";
import { valueAfter } from "./misc/async";
import { AppFooter } from "./AppFooter";
import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: object;
  }
}

// Web USB serial is added per-render inside the component (it needs an
// `establish` callback that probes ports — see below). These are the static
// transports that don't.
const STATIC_TRANSPORTS: TransportFactory[] = [
  ...(navigator.bluetooth && navigator.userAgent.indexOf("Linux") >= 0
    ? [{ label: "BLE", connect: gatt_connect }]
    : []),
  ...(window.__TAURI_INTERNALS__
    ? [
        {
          label: "BLE",
          isWireless: true,
          pick_and_connect: {
            connect: tauri_ble_connect,
            list: ble_list_devices,
          },
        },
      ]
    : []),
  ...(window.__TAURI_INTERNALS__
    ? [
        {
          label: "USB",
          pick_and_connect: {
            connect: tauri_serial_connect,
            list: serial_list_devices,
          },
        },
      ]
    : []),
].filter((t) => t !== undefined);

async function listen_for_notifications(
  notification_stream: ReadableStream<Notification>,
  signal: AbortSignal
): Promise<void> {
  let reader = notification_stream.getReader();
  const onAbort = () => {
    reader.cancel();
    reader.releaseLock();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  do {
    let pub = usePub();

    try {
      let { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      console.log("Notification", value);
      pub("rpc_notification", value);

      const subsystem = Object.entries(value).find(
        ([_k, v]) => v !== undefined
      );
      if (!subsystem) {
        continue;
      }

      const [subId, subData] = subsystem;
      const event = Object.entries(subData).find(([_k, v]) => v !== undefined);

      if (!event) {
        continue;
      }

      const [eventName, eventData] = event;
      const topic = ["rpc_notification", subId, eventName].join(".");

      pub(topic, eventData);
    } catch (e) {
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
      throw e;
    }
  } while (true);

  signal.removeEventListener("abort", onAbort);
  reader.releaseLock();
  notification_stream.cancel();
}

// Guards against overlapping serial probes. A probe opens ports, and two
// concurrent probes (manual + auto-reconnect, or React StrictMode's double
// effect invocation in dev) would race to open the same port — the second
// failing with "port is already open". Module-level so it's shared across
// every caller and survives StrictMode's mount/unmount/mount.
let serialProbeInFlight = false;

type ProbedConnection = { conn: RpcConnection; name: string | undefined };

// Establishes an RPC connection over `transport` and asks the device who it is.
// Returns the live connection + name if the device answers, or null if it
// doesn't (i.e. this isn't a ZMK Studio endpoint). On a null result the caller
// must abort `signal` to close the port. Does NOT touch React state, so the
// caller can decide whether to keep this connection or move on to another port.
async function probeConnection(
  transport: RpcTransport,
  signal: AbortSignal
): Promise<ProbedConnection | null> {
  const conn = await create_rpc_connection(transport, { signal });

  const details = await Promise.race([
    call_rpc(conn, { core: { getDeviceInfo: true } })
      .then((r) => r?.core?.getDeviceInfo)
      .catch((e) => {
        console.error("Failed first RPC call", e);
        return undefined;
      }),
    valueAfter(undefined, 1000),
  ]);

  if (!details) {
    return null;
  }

  return { conn, name: details.name };
}

// Wires a probed connection into the app: starts the notification stream and
// publishes the connection + device name to React state.
function commitConnection(
  { conn, name }: ProbedConnection,
  signal: AbortSignal,
  setConn: Dispatch<ConnectionState>,
  setConnectedDeviceName: Dispatch<string | undefined>
) {
  listen_for_notifications(conn.notification_readable, signal)
    .then(() => {
      setConnectedDeviceName(undefined);
      setConn({ conn: null });
    })
    .catch((_e) => {
      setConnectedDeviceName(undefined);
      setConn({ conn: null });
    });

  setConnectedDeviceName(name);
  setConn({ conn });
}

function App() {
  const [conn, setConn] = useState<ConnectionState>({ conn: null });
  const [connectedDeviceName, setConnectedDeviceName] = useState<
    string | undefined
  >(undefined);
  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();
  const [page, setPage] = useState<Page>("layers");
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [connectionAbort, setConnectionAbort] = useState(new AbortController());

  const [lockState, setLockState] = useState<LockState>(
    LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
  );

  useSub("rpc_notification.core.lockStateChanged", (ls) => {
    setLockState(ls);
  });

  useEffect(() => {
    if (!conn) {
      reset();
      setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
    }

    async function updateLockState() {
      if (!conn.conn) {
        return;
      }

      let locked_resp = await call_rpc(conn.conn, {
        core: { getLockState: true },
      });

      setLockState(
        locked_resp.core?.getLockState ||
          LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
      );
    }

    updateLockState();
  }, [conn, setLockState]);

  // While connected but still locked, the keyboard normally reports unlocking
  // via a `lockStateChanged` notification. If that push never arrives, the app
  // would sit on the "Unlock To Continue" screen until a manual reload. Poll
  // the lock state as a fallback so unlocking with a combo continues
  // automatically. Runs only while locked, and tears down once unlocked.
  useEffect(() => {
    if (
      !conn.conn ||
      lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const c = conn.conn;
      if (cancelled || !c) {
        return;
      }

      const resp = await call_rpc(c, { core: { getLockState: true } });
      if (cancelled) {
        return;
      }

      const ls = resp?.core?.getLockState;
      if (ls != null) {
        setLockState(ls);
        if (ls === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
          return;
        }
      }

      timeout = setTimeout(poll, 500);
    };

    timeout = setTimeout(poll, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [conn, lockState, setLockState]);

  const save = useCallback(() => {
    async function doSave() {
      if (!conn.conn) {
        return;
      }

      let resp = await call_rpc(conn.conn, { keymap: { saveChanges: true } });
      if (!resp.keymap?.saveChanges || resp.keymap?.saveChanges.err) {
        console.error("Failed to save changes", resp.keymap?.saveChanges);
      }

      let comboResp = await call_rpc(conn.conn, {
        combos: { saveChanges: true },
      });
      if (!comboResp.combos?.saveChanges || comboResp.combos?.saveChanges.err) {
        console.error(
          "Failed to save combo changes",
          comboResp.combos?.saveChanges
        );
      }

      let behaviorResp = await call_rpc(conn.conn, {
        behaviors: { saveChanges: true },
      });
      if (
        !behaviorResp.behaviors?.saveChanges ||
        behaviorResp.behaviors?.saveChanges.err
      ) {
        console.error(
          "Failed to save custom behaviour changes",
          behaviorResp.behaviors?.saveChanges
        );
      }
    }

    doSave();
  }, [conn]);

  const discard = useCallback(() => {
    async function doDiscard() {
      if (!conn.conn) {
        return;
      }

      let resp = await call_rpc(conn.conn, {
        keymap: { discardChanges: true },
      });
      if (!resp.keymap?.discardChanges) {
        console.error("Failed to discard changes", resp);
      }

      let comboResp = await call_rpc(conn.conn, {
        combos: { discardChanges: true },
      });
      if (!comboResp.combos?.discardChanges) {
        console.error("Failed to discard combo changes", comboResp);
      }

      let behaviorResp = await call_rpc(conn.conn, {
        behaviors: { discardChanges: true },
      });
      if (!behaviorResp.behaviors?.discardChanges) {
        console.error("Failed to discard custom behaviour changes", behaviorResp);
      }

      reset();
      setConn({ conn: conn.conn });
    }

    doDiscard();
  }, [conn]);

  const resetSettings = useCallback(() => {
    async function doReset() {
      if (!conn.conn) {
        return;
      }

      let resp = await call_rpc(conn.conn, {
        core: { resetSettings: true },
      });
      if (!resp.core?.resetSettings) {
        console.error("Failed to settings reset", resp);
      }

      reset();
      setConn({ conn: conn.conn });
    }

    doReset();
  }, [conn]);

  const disconnect = useCallback(() => {
    async function doDisconnect() {
      if (!conn.conn) {
        return;
      }

      await conn.conn.request_writable.close();
      connectionAbort.abort("User disconnected");
      setConnectionAbort(new AbortController());
    }

    doDisconnect();
  }, [conn]);

  // Human-readable status shown in the connect modal while probing ports, so a
  // multi-second auto-reconnect doesn't look like the app is stuck.
  const [probeStatus, setProbeStatus] = useState<string | null>(null);

  // Probe a list of candidate serial ports and connect to the first that speaks
  // ZMK Studio. A composite device exposes several identical-looking ports
  // (only one is the Studio endpoint), and ports can't be told apart by
  // metadata — so we open each, run the handshake, keep the one that answers,
  // and close the rest. `desiredName` (used on reconnect) restricts the match
  // to a specific keyboard when several are plugged in.
  const connectSerialPorts = useCallback(
    async (
      ports: SerialPort[],
      desiredName?: string | null,
      statusVerb: string = "Connecting to device"
    ): Promise<boolean> => {
      if (serialProbeInFlight) {
        return false;
      }
      serialProbeInFlight = true;
      try {
        for (let i = 0; i < ports.length; i++) {
          setProbeStatus(`${statusVerb}… (${i + 1}/${ports.length})`);
          const ac = new AbortController();

          let transport: RpcTransport;
          try {
            transport = await openSerialTransport(ports[i]);
          } catch (e) {
            // Port unavailable or already open (e.g. held elsewhere); skip it
            // and try the next candidate.
            console.warn("Could not open candidate serial port; skipping", e);
            continue;
          }

          const probed = await probeConnection(transport, ac.signal);
          if (probed && (!desiredName || probed.name === desiredName)) {
            commitConnection(probed, ac.signal, setConn, setConnectedDeviceName);
            setConnectionAbort(ac);
            rememberSerialPort(ports[i], probed.name ?? "");
            return true;
          }

          // Not a Studio endpoint, or a different keyboard than requested.
          // Aborting closes the port so it isn't left open for the next probe.
          ac.abort("Not the requested ZMK Studio device");
        }
        return false;
      } finally {
        serialProbeInFlight = false;
        setProbeStatus(null);
      }
    },
    [setConn, setConnectedDeviceName]
  );

  // Manual USB connect: let the user pick a device, then probe its ports.
  const onConnectSerial = useCallback(async () => {
    let ports: SerialPort[];
    try {
      ports = await pickZmkSerialPorts();
    } catch (e) {
      // User dismissed the port picker, or no port available.
      return;
    }
    const ok = await connectSerialPorts(ports);
    if (!ok) {
      window.alert("Failed to connect to the chosen device");
    }
  }, [connectSerialPorts]);

  // Single-transport connect for BLE / Tauri (no multi-port probing needed).
  const onConnect = useCallback(
    async (t: RpcTransport) => {
      const ac = new AbortController();
      const probed = await probeConnection(t, ac.signal);
      if (probed) {
        commitConnection(probed, ac.signal, setConn, setConnectedDeviceName);
        setConnectionAbort(ac);
      } else {
        ac.abort("handshake failed");
        window.alert("Failed to connect to the chosen device");
      }
    },
    [setConn, setConnectedDeviceName]
  );

  const transports = useMemo<TransportFactory[]>(
    () => [
      ...(navigator.serial && !window.__TAURI_INTERNALS__
        ? [{ label: "USB", establish: onConnectSerial }]
        : []),
      ...STATIC_TRANSPORTS,
    ],
    [onConnectSerial]
  );

  // Silently reconnect to the last-used keyboard after a page reload, and again
  // whenever it's re-plugged. WebSerial can't carry a live connection across a
  // reload, but on Chromium the permission grant persists, so getPorts() lets
  // us reopen without prompting. Scoped to web WebSerial (not Tauri/BLE).
  const connRef = useRef(conn);
  connRef.current = conn;
  useEffect(() => {
    if (!navigator.serial || window.__TAURI_INTERNALS__) {
      return;
    }

    let cancelled = false;

    const tryReconnect = async () => {
      if (connRef.current.conn) {
        return;
      }
      try {
        const { ports, name } = await rememberedZmkReconnect();
        if (ports.length === 0 || cancelled || connRef.current.conn) {
          return;
        }
        await connectSerialPorts(ports, name, "Auto-connecting to last device");
      } catch (e) {
        console.error("Auto-reconnect failed", e);
      }
    };

    tryReconnect();

    navigator.serial.addEventListener("connect", tryReconnect);
    return () => {
      cancelled = true;
      navigator.serial.removeEventListener("connect", tryReconnect);
    };
  }, [connectSerialPorts]);

  return (
    <ConnectionContext.Provider value={conn}>
      <LockStateContext.Provider value={lockState}>
        <UndoRedoContext.Provider value={doIt}>
          <UnlockModal />
          <ConnectModal
            open={!conn.conn}
            transports={transports}
            onTransportCreated={onConnect}
            status={probeStatus}
          />
          <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
          <LicenseNoticeModal
            open={showLicenseNotice}
            onClose={() => setShowLicenseNotice(false)}
          />
          <div className="bg-base-100 text-base-content h-full max-h-[100vh] w-full max-w-[100vw] inline-grid grid-cols-[auto] grid-rows-[auto_1fr_auto] overflow-hidden">
            <AppHeader
              connectedDeviceLabel={connectedDeviceName}
              page={page}
              onPageChange={setPage}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onSave={save}
              onDiscard={discard}
              onDisconnect={disconnect}
              onResetSettings={resetSettings}
            />
            <Keyboard page={page} />
            <AppFooter
              onShowAbout={() => setShowAbout(true)}
              onShowLicenseNotice={() => setShowLicenseNotice(true)}
            />
          </div>
        </UndoRedoContext.Provider>
      </LockStateContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default App;
