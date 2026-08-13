import {
  call_rpc as inner_call_rpc,
  Request,
  RequestResponse,
  RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";

export async function call_rpc(
  conn: RpcConnection,
  req: Omit<Request, "requestId">
): Promise<RequestResponse> {
  console.log("RPC Request", req);
  try {
    const resp = await inner_call_rpc(conn, req);
    console.log("RPC Response", resp);
    return resp;
  } catch (e) {
    // Reject rather than resolve with the error. Returning it satisfied the
    // `Promise<RequestResponse>` type only by accident: callers then read
    // `resp.<subsystem>?.<field>` off an Error, got `undefined`, and rendered a
    // dead transport as a device with nothing to report — an empty behaviour
    // list, no combos — with the reason visible only in this console line.
    console.error("RPC Error", e);
    throw e;
  }
}
