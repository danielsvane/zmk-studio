import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { AvailableDevice } from ".";

export async function list_devices(): Promise<Array<AvailableDevice>> {
  return await invoke("serial_list_devices");
}

export async function connect(dev: AvailableDevice): Promise<RpcTransport> {
  if (!(await invoke("serial_connect", dev))) {
    throw new Error("Failed to connect");
  }

  const abortController = new AbortController();

  const writable = new WritableStream({
    async write(chunk) {
      await invoke("transport_send_data", new Uint8Array(chunk));
    },
  });

  // Enqueue from the listener synchronously — see the same comment in ble.ts. A
  // writer-per-event drops any chunk that arrives while the previous one holds
  // the stream locked. Serial gets off lighter (the native side reads 1024
  // bytes at a time, so a response usually arrives as one event) but the hazard
  // is identical, and a lost chunk kills the response stream just the same.
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  // Explicitly initialised, and called optionally below: a disconnect landing
  // between the two `listen` awaits would otherwise unregister a handler that
  // doesn't exist yet.
  let unlisten_data: UnlistenFn | undefined = undefined;
  let unlisten_disconnected: UnlistenFn | undefined = undefined;

  const stop_listening = () => {
    unlisten_data?.();
    unlisten_disconnected?.();
  };

  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
      stop_listening();
    },
  });

  unlisten_data = await listen(
    "connection_data",
    (event: { payload: Array<number> }) => {
      if (!closed) {
        controller.enqueue(new Uint8Array(event.payload));
      }
    }
  );

  unlisten_disconnected = await listen("connection_disconnected", () => {
    if (!closed) {
      closed = true;
      stop_listening();
      controller.close();
    }
  });

  const signal = abortController.signal;

  const abort_cb = async () => {
    closed = true;
    stop_listening();
    await invoke("transport_close");
    signal.removeEventListener("abort", abort_cb);
  };

  signal.addEventListener("abort", abort_cb);

  return { label: dev.label, abortController, readable, writable };
}
