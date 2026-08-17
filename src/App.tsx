import { AppHeader } from "./AppHeader";

import {
  create_rpc_connection,
  RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "./rpc/logging";

import type { Notification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import { ConnectionState, ConnectionContext } from "./rpc/ConnectionContext";
import {
  ChangeEvent,
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
import { publish, useSub } from "./usePubSub";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
import { UnlockModal } from "./UnlockModal";
import { valueAfter } from "./misc/async";
import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { fetchBehaviorMap } from "./rpc/fetchBehaviorMap";
import { buildBackup } from "./backup/exportBackup";
import { downloadBackup } from "./backup/downloadBackup";
import { parseBackup, type BackupV1 } from "./backup/backupFormat";
import { importBackup } from "./backup/importBackup";
import type { ImportReport } from "./backup/importReport";
import {
  BackupImportConfirmModal,
  BackupImportReportModal,
} from "./backup/BackupImportModals";

// Web USB serial is added per-render inside the component (it needs an
// `establish` callback that probes ports — see below). These are the static
// transports that don't.
// Wireless in a browser means Web Bluetooth, which ZMK Studio can only use on
// Linux — elsewhere the OS claims a paired keyboard as an HID device and won't
// hand its GATT services to the browser.
const WEB_BLE_SUPPORTED =
  !!navigator.bluetooth && navigator.userAgent.indexOf("Linux") >= 0;

// Shown on the disabled BLE button when neither path is available. Without it
// the option is simply missing from the picker, which tells the user nothing —
// they can't distinguish "unsupported here" from "my keyboard isn't wireless".
// The flag is named because without it this tooltip misleads exactly the person
// who reads it: Chromium on Linux meets every other condition, so being told
// "Linux only, in Chrome or Edge" and then finding the button greyed out reads
// as a broken app.
//
// Spelled as the bare `#experimental-web-platform-features` that Chrome's own
// docs use, not the full `chrome://flags/#enable-...` URL. Both fit the
// tooltip's `max-w-xs`, but measured in the story the full URL is a single
// unbreakable token 318px wide against a 320px cap, so it survives on 2px of
// headroom and would overflow the moment Inter falls back (`font-display:
// fallback`) or the user zooms. The short form measures 275px.
const BLE_REQUIREMENTS =
  "Needs Web Bluetooth: Chrome or Edge on Linux, with " +
  "#experimental-web-platform-features enabled in chrome://flags.\n\n" +
  "The desktop app has no such limit. See the download link below.";

const STATIC_TRANSPORTS: TransportFactory[] = [
  // Skipped entirely under Tauri, which brings its own native BLE below —
  // otherwise a Tauri build whose webview exposes `navigator.bluetooth` would
  // list two "BLE" entries (and, worse, could pair the real one with an
  // "unavailable" duplicate).
  ...(window.__TAURI_INTERNALS__
    ? []
    : WEB_BLE_SUPPORTED
      ? [{ label: "BLE", connect: gatt_connect }]
      : [{ label: "BLE", unavailableReason: BLE_REQUIREMENTS }]),
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
  const reader = notification_stream.getReader();
  const onAbort = () => {
    reader.cancel();
    reader.releaseLock();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  for (;;) {
    try {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      console.log("Notification", value);
      publish("rpc_notification", value);

      const subsystem = Object.entries(value).find(
        ([, v]) => v !== undefined
      );
      if (!subsystem) {
        continue;
      }

      const [subId, subData] = subsystem;
      const event = Object.entries(subData).find(([, v]) => v !== undefined);

      if (!event) {
        continue;
      }

      const [eventName, eventData] = event;
      const topic = ["rpc_notification", subId, eventName].join(".");

      publish(topic, eventData);
    } catch (e) {
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
      throw e;
    }
  }

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
    .catch(() => {
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

  useSub<LockState>("rpc_notification.core.lockStateChanged", (ls) => {
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

      const locked_resp = await call_rpc(conn.conn, {
        core: { getLockState: true },
      });

      setLockState(
        locked_resp.core?.getLockState ||
          LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
      );
    }

    updateLockState();
  }, [conn, setLockState, reset]);

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

      const resp = await call_rpc(conn.conn, { keymap: { saveChanges: true } });
      if (!resp.keymap?.saveChanges || resp.keymap?.saveChanges.err) {
        console.error("Failed to save changes", resp.keymap?.saveChanges);
      }

      const comboResp = await call_rpc(conn.conn, {
        combos: { saveChanges: true },
      });
      if (!comboResp.combos?.saveChanges || comboResp.combos?.saveChanges.err) {
        console.error(
          "Failed to save combo changes",
          comboResp.combos?.saveChanges
        );
      }

      const behaviorResp = await call_rpc(conn.conn, {
        behaviors: { saveChanges: true },
      });
      if (
        !behaviorResp.behaviors?.saveChanges ||
        behaviorResp.behaviors?.saveChanges.err
      ) {
        console.error(
          "Failed to save custom behavior changes",
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

      const resp = await call_rpc(conn.conn, {
        keymap: { discardChanges: true },
      });
      if (!resp.keymap?.discardChanges) {
        console.error("Failed to discard changes", resp);
      }

      const comboResp = await call_rpc(conn.conn, {
        combos: { discardChanges: true },
      });
      if (!comboResp.combos?.discardChanges) {
        console.error("Failed to discard combo changes", comboResp);
      }

      const behaviorResp = await call_rpc(conn.conn, {
        behaviors: { discardChanges: true },
      });
      if (!behaviorResp.behaviors?.discardChanges) {
        console.error("Failed to discard custom behavior changes", behaviorResp);
      }

      reset();
      setConn({ conn: conn.conn });
    }

    doDiscard();
  }, [conn, reset]);

  const resetSettings = useCallback(() => {
    async function doReset() {
      if (!conn.conn) {
        return;
      }

      const resp = await call_rpc(conn.conn, {
        core: { resetSettings: true },
      });
      if (!resp.core?.resetSettings) {
        console.error("Failed to settings reset", resp);
      }

      reset();
      setConn({ conn: conn.conn });
    }

    doReset();
  }, [conn, reset]);

  // Reads the full editable state (keymap, combos, custom behaviours, the
  // behaviour registry, device info) straight from the device and downloads it
  // as a versioned JSON backup. Re-reading here — instead of lifting Keyboard's
  // state up — keeps the feature self-contained; export is rare enough that a
  // few extra RPC reads don't matter.
  const exportBackup = useCallback(() => {
    async function doExport() {
      if (!conn.conn) {
        return;
      }
      const c = conn.conn;

      const keymap = (await call_rpc(c, { keymap: { getKeymap: true } }))
        .keymap?.getKeymap;
      const combos = (await call_rpc(c, { combos: { getCombos: true } }))
        .combos?.getCombos;
      const customBehaviors = (
        await call_rpc(c, { behaviors: { getCustomBehaviors: true } })
      ).behaviors?.getCustomBehaviors;
      const deviceInfo = (await call_rpc(c, { core: { getDeviceInfo: true } }))
        .core?.getDeviceInfo;

      if (!keymap || !combos || !customBehaviors || !deviceInfo) {
        console.error("Backup export failed to read device state", {
          keymap,
          combos,
          customBehaviors,
          deviceInfo,
        });
        window.alert("Failed to read the device state for the backup");
        return;
      }

      const behaviorMap = await fetchBehaviorMap(c);

      downloadBackup(
        buildBackup({ keymap, combos, customBehaviors, behaviorMap, deviceInfo })
      );
    }

    doExport();
  }, [conn]);

  // Import flow: hidden file input → parse → confirm modal → importBackup →
  // refresh all device reads (same trick as discard/reset: a fresh conn object
  // re-runs every useConnectedDeviceData) → report modal.
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<BackupV1 | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);

  const requestImport = useCallback(() => {
    importFileRef.current?.click();
  }, []);

  const onImportFilePicked = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so picking the same file twice re-fires the change event.
      e.target.value = "";
      if (!file) {
        return;
      }

      const result = parseBackup(await file.text());
      if ("error" in result) {
        window.alert(`Can't import "${file.name}": ${result.error}`);
        return;
      }
      setPendingImport(result.ok);
    },
    []
  );

  const confirmImport = useCallback(() => {
    const backup = pendingImport;
    setPendingImport(null);
    if (!backup || !conn.conn || importing) {
      return;
    }

    async function doImport() {
      setImporting(true);
      try {
        const report = await importBackup(conn.conn!, backup!);
        reset();
        setConn({ conn: conn.conn });
        setImportReport(report);
      } finally {
        setImporting(false);
      }
    }

    doImport();
  }, [pendingImport, conn, importing, reset]);

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
  }, [conn, connectionAbort]);

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
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFilePicked}
          />
          <BackupImportConfirmModal
            backup={pendingImport}
            deviceName={connectedDeviceName}
            onCancel={() => setPendingImport(null)}
            onConfirm={confirmImport}
          />
          <BackupImportReportModal
            report={importReport}
            onClose={() => setImportReport(null)}
          />
          <LicenseNoticeModal
            open={showLicenseNotice}
            onClose={() => setShowLicenseNotice(false)}
          />
          <div className="bg-base-100 text-base-content h-full max-h-[100vh] w-full max-w-[100vw] inline-grid grid-cols-[auto] grid-rows-[auto_1fr] overflow-hidden">
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
              onExportBackup={exportBackup}
              onImportBackup={requestImport}
            />
            <Keyboard page={page} />
          </div>
        </UndoRedoContext.Provider>
      </LockStateContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default App;
