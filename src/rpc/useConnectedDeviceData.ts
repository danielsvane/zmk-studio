import React, {
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ConnectionContext } from "./ConnectionContext";

import { call_rpc } from "./logging";

import { Request, RequestResponse } from "@zmkfirmware/zmk-studio-ts-client";
import { LockStateContext } from "./LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";

export function useConnectedDeviceData<T>(
  req: Omit<Request, "requestId">,
  response_mapper: (resp: RequestResponse) => T | undefined,
  requireUnlock?: boolean
): [
  T | undefined,
  React.Dispatch<SetStateAction<T | undefined>>,
  string | undefined,
] {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [data, setData] = useState<T | undefined>(undefined);
  // Third element of the tuple: why the read produced nothing. Without it a
  // failed read is indistinguishable from a device that has nothing to report,
  // and the UI states the more reassuring of the two.
  const [error, setError] = useState<string | undefined>(undefined);

  // `req` is a fresh object literal and `response_mapper` a fresh closure on
  // every render at the call sites, so they can't be effect deps directly
  // (that would re-issue the RPC every render). Read them through refs, and
  // re-fetch only when the request's *content* changes (reqKey).
  const reqRef = useRef(req);
  reqRef.current = req;
  const mapperRef = useRef(response_mapper);
  mapperRef.current = response_mapper;
  const reqKey = JSON.stringify(req);

  // Whether we're allowed to fetch right now. A primitive so the effect re-runs
  // only when permission actually flips — and, as before, lock state only
  // matters when `requireUnlock` is set.
  const canFetch = requireUnlock
    ? lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    : true;

  useEffect(() => {
    if (!connection.conn || !canFetch) {
      setData(undefined);
      setError(undefined);
      return;
    }

    async function startRequest() {
      setData(undefined);
      setError(undefined);
      if (!connection.conn) {
        return;
      }

      try {
        const response = mapperRef.current(
          await call_rpc(connection.conn, reqRef.current)
        );

        if (!ignore) {
          setData(response);
        }
      } catch (e) {
        // The ts-client throws bare strings for framing/protocol faults
        // ("No response", "Mismatch request IDs"), so don't assume an Error.
        if (!ignore) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    let ignore = false;
    startRequest();

    return () => {
      ignore = true;
    };
  }, [connection, canFetch, reqKey]);

  return [data, setData, error];
}
