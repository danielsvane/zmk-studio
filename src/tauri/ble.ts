import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { AvailableDevice } from ".";

export async function list_devices(): Promise<Array<AvailableDevice>> {
  return await invoke("gatt_list_devices");
}

export async function connect(dev: AvailableDevice): Promise<RpcTransport> {
  if (!(await invoke("gatt_connect", dev))) {
    throw new Error("Failed to connect");
  }

  const abortController = new AbortController();

  const writable = new WritableStream({
    async write(chunk) {
      await invoke("transport_send_data", new Uint8Array(chunk));
    },
  });

  // Enqueue from the listener *synchronously*. Writing through a
  // TransformStream's writer instead loses data: Tauri doesn't serialise
  // listener invocations, a writer holds the stream locked across its `await
  // write()`, and `getWriter()` throws on an already-locked stream — so every
  // notification that lands inside that window is dropped. The firmware
  // fragments each response to the negotiated MTU (20 bytes at the 23-byte
  // default), so a BLE response is a burst of fragments, and one hole in it
  // makes the framing decoder error out the whole response stream. The cost of
  // enqueueing is an unbounded queue (no backpressure), which is what the web
  // transports do too — an RPC response is the upper bound on what piles up.
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

  // `start` runs during construction, so `controller` is set before the
  // listeners below are registered.
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
