import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";

// Matches the baud rate used by the upstream serial transport in
// @zmkfirmware/zmk-studio-ts-client/transport/serial.
const BAUD_RATE = 12500;

// localStorage key holding the last device we connected to, so we can reconnect
// to the same one after a reload. Versioned so the format can evolve without
// colliding with older values.
const LAST_DEVICE_KEY = "zmk-studio:last-serial-device:v1";

interface RememberedDevice {
  // vendor:product id — a coarse filter, NOT a unique key (see portLabel).
  label: string;
  // ZMK device name from getDeviceInfo — the only real discriminator we have
  // when several keyboards share the same vendor/product id.
  name: string;
}

function readRememberedDevice(): RememberedDevice | null {
  try {
    const raw = localStorage.getItem(LAST_DEVICE_KEY);
    return raw ? (JSON.parse(raw) as RememberedDevice) : null;
  } catch {
    // getItem throws in private-browsing / disabled-storage modes; JSON.parse
    // throws on corrupt data. Either way, treat as "nothing remembered".
    return null;
  }
}

// A composite USB device (e.g. a keyboard with several CDC interfaces) exposes
// multiple serial ports that all share the same vendor/product id, and the Web
// Serial API exposes nothing else to tell them apart — not the product name,
// tty path, or interface number. Worse, ZMK keyboards default to the same
// vendor/product id, so this label can't even distinguish two keyboards. It is
// only a coarse "is this plausibly a ZMK port" filter; the real discriminator
// is the device name from the getDeviceInfo handshake, learned by probing.
function portLabel(port: SerialPort): string {
  const info = port.getInfo();
  return `${info.usbVendorId ?? ""}:${info.usbProductId ?? ""}`;
}

export function rememberSerialPort(port: SerialPort, name: string) {
  try {
    const device: RememberedDevice = { label: portLabel(port), name };
    localStorage.setItem(LAST_DEVICE_KEY, JSON.stringify(device));
  } catch (e) {
    console.warn("Failed to persist last serial device", e);
  }
}

// Opens `port` and wraps it in the RpcTransport shape the client expects,
// mirroring the upstream serial transport's open/abort handling. Aborting the
// returned transport's controller closes the port, which is how a probe of a
// wrong interface releases it instead of leaving it open.
export async function openSerialTransport(port: SerialPort): Promise<RpcTransport> {
  const abortController = new AbortController();

  await port.open({ baudRate: BAUD_RATE }).catch((e) => {
    if (e instanceof DOMException && e.name === "NetworkError") {
      throw new Error(
        "Failed to open the serial port. Check the permissions of the device and verify it is not in use by another process."
      );
    }
    throw e;
  });

  const label = portLabel(port);
  const sig = abortController.signal;
  const abort_cb = async () => {
    sig.removeEventListener("abort", abort_cb);
    await port.writable?.close().catch(() => {});
    await port.readable?.cancel().catch(() => {});
    await port.close().catch(() => {});
  };
  sig.addEventListener("abort", abort_cb);

  return {
    label,
    abortController,
    readable: port.readable!,
    writable: port.writable!,
  };
}

// Prompts the user to pick a device, then returns every authorized port that
// shares its vendor/product id, with the picked one first. The caller probes
// the list to find the ZMK Studio endpoint — so the user doesn't have to guess
// which of several identical-looking ports is the right one.
export async function pickZmkSerialPorts(): Promise<SerialPort[]> {
  const picked = await navigator.serial.requestPort({});
  const label = portLabel(picked);
  const siblings = (await navigator.serial.getPorts()).filter(
    (p) => p !== picked && portLabel(p) === label
  );
  return [picked, ...siblings];
}

// Candidate ports + desired device name for silent reconnect after a reload.
// Ports are filtered to the remembered device's vendor/product id (falling back
// to all authorized ports); `name` lets the caller reconnect to the same
// keyboard rather than whichever Studio endpoint answers first. `ports` is
// empty when there's nothing to try.
export async function rememberedZmkReconnect(): Promise<{
  ports: SerialPort[];
  name: string | null;
}> {
  if (!navigator.serial) {
    return { ports: [], name: null };
  }

  const ports = await navigator.serial.getPorts();
  if (ports.length === 0) {
    return { ports: [], name: null };
  }

  const remembered = readRememberedDevice();
  if (!remembered) {
    // No record yet: only safe to auto-connect if there's a single port.
    return { ports: ports.length === 1 ? ports : [], name: null };
  }

  const matching = ports.filter((p) => portLabel(p) === remembered.label);
  return {
    ports: matching.length > 0 ? matching : ports,
    name: remembered.name,
  };
}
