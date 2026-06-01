import Emittery from "emittery";
import { useEffect } from "react";

const emitter = new Emittery();

// Not a hook (no React state) despite living beside useSub — it's a plain
// publish function, so it can be called from anywhere (effects, async loops).
export const publish = (name: PropertyKey, data: unknown) =>
  emitter.emit(name, data);

export const useSub = <T = unknown>(
  name: PropertyKey,
  callback: (data: T) => void | Promise<void>
) => {
  // Emittery is untyped here, so the event payload arrives as unknown; callers
  // declare the concrete T (e.g. useSub<boolean>) and own that contract.
  const listener = callback as (data: unknown) => void | Promise<void>;
  const unsub = () => emitter.off(name, listener);

  // Be sure we unsub if unmounted.
  useEffect(() => {
    emitter.on(name, listener);
    return () => unsub();
  });

  return unsub;
};
