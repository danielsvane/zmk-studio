import { beforeEach, describe, expect, it, vi } from "vitest";

// The bug this guards: the transport used to write each `connection_data` event
// through a fresh `getWriter()` on a TransformStream. Tauri doesn't serialise
// listener invocations, the writer holds the stream locked across its await, and
// `getWriter()` throws on a locked stream — so of a burst dispatched in one turn
// only the first fragment survived. The firmware splits every response into
// MTU-sized notifications, so that burst is what a BLE response *is*, and one
// hole in it makes the framing decoder error out the response stream.

type Listener = (event: { payload: Array<number> }) => void;

const listeners: Record<string, Listener> = {};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => true),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, cb: Listener) => {
    listeners[name] = cb;
    return () => delete listeners[name];
  }),
}));

const { connect } = await import("./ble");

describe("the Tauri BLE transport", () => {
  beforeEach(() => {
    for (const name of Object.keys(listeners)) {
      delete listeners[name];
    }
  });

  it("delivers every notification of a burst, in order", async () => {
    const transport = await connect({ label: "Benjiboard", id: "1" });
    const reader = transport.readable.getReader();

    // 30 fragments of 20 bytes: a ~600-byte response at the default 23-byte
    // MTU. All dispatched in one turn, with nobody reading yet — the exact
    // shape that used to lose 29 of them.
    const fragments = Array.from({ length: 30 }, (_, i) =>
      Array.from({ length: 20 }, () => i)
    );
    for (const payload of fragments) {
      listeners["connection_data"]({ payload });
    }

    const received: number[] = [];
    for (let i = 0; i < fragments.length; i++) {
      const { value } = await reader.read();
      received.push(...(value ?? []));
    }

    expect(received).toEqual(fragments.flat());
  });

  it("closes the stream when the device disconnects", async () => {
    const transport = await connect({ label: "Benjiboard", id: "1" });
    const reader = transport.readable.getReader();

    listeners["connection_data"]({ payload: [1, 2, 3] });
    listeners["connection_disconnected"]({ payload: [] });

    expect((await reader.read()).value).toEqual(new Uint8Array([1, 2, 3]));
    expect((await reader.read()).done).toBe(true);
  });
});
