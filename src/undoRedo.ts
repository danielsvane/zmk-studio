import { createContext, useCallback, useMemo, useState } from "react";

export type UndoCallback = () => Promise<void>;

export type DoCallback = () => Promise<UndoCallback>;

export function useUndoRedo(): [
  (dc: DoCallback) => Promise<void>,
  () => Promise<void>,
  () => Promise<void>,
  boolean,
  boolean,
  () => void
] {
  const [locked, setLocked] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<Array<[DoCallback, UndoCallback]>>(
    []
  );
  const [redoStack, setRedoStack] = useState<Array<DoCallback>>([]);

  const canUndo = useMemo(
    () => !locked && undoStack.length > 0,
    [locked, undoStack]
  );
  const canRedo = useMemo(
    () => !locked && redoStack.length > 0,
    [locked, redoStack]
  );

  // `finally`, because a callback that throws must not leave the system locked:
  // every mutation runs through here, and `locked` gates undo *and* redo, so one
  // failed RPC would disable both for the rest of the session. The throw still
  // propagates — the caller decides what to say about it.
  const doIt = async (doCb: DoCallback, preserveRedo?: boolean) => {
    setLocked(true);
    try {
      const undo = await doCb();

      setUndoStack([[doCb, undo], ...undoStack]);
      if (!preserveRedo) {
        setRedoStack([]);
      }
    } finally {
      setLocked(false);
    }
  };

  const undo = async () => {
    if (locked) {
      throw new Error("undo invoked when existing operation in progress");
    }

    if (undoStack.length === 0) {
      throw new Error("undo invoked with no operations to undo");
    }

    setLocked(true);
    const [doCb, undoCb] = undoStack[0];
    setUndoStack(undoStack.slice(1));
    setRedoStack([doCb, ...redoStack]);

    try {
      await undoCb();
    } finally {
      setLocked(false);
    }
  };

  const redo = async () => {
    if (locked) {
      throw new Error("redo invoked when existing operation in progress");
    }

    if (redoStack.length === 0) {
      throw new Error("redo invoked with no operations to redo");
    }

    const doCb = redoStack[0];

    setRedoStack(redoStack.slice(1));

    return await doIt(doCb, true);
  };

  // Stable identity (only touches the two stable setters) so callers can list
  // `reset` in their effect/callback dep arrays without re-running every render.
  const reset = useCallback(() => {
    setRedoStack([]);
    setUndoStack([]);
  }, []);

  return [doIt, undo, redo, canUndo, canRedo, reset];
}

export const UndoRedoContext = createContext<
  ((dc: DoCallback) => Promise<void>) | null
>(null);
