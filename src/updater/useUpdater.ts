import { useCallback, useEffect, useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";

/** How far along an install is, if one has been started. */
export type InstallState =
  | { phase: "idle" }
  /** `total` is absent until the server has told us the content length. */
  | { phase: "downloading"; received: number; total?: number }
  | { phase: "installing" }
  | { phase: "failed"; message: string };

export interface Updater {
  /** The newer release, or null when there isn't one (or we couldn't tell). */
  update: Update | null;
  install: InstallState;
  /** Download, install, and restart into the new version. */
  installAndRelaunch: () => Promise<void>;
}

/** Give up on a check that isn't going anywhere; nobody is waiting on it. */
const CHECK_TIMEOUT_MS = 30_000;

/**
 * Checks once, on mount, whether a newer release exists.
 *
 * Deliberately silent. A failed check is not worth a word to someone who opened
 * this app to edit a keymap: no network, a 404 endpoint, a GitHub outage, or a
 * build too old to have an updater at all should all look identical to "you are
 * up to date". The only thing a successful check does on its own is let the UI
 * offer an update the user can ignore.
 *
 * Tauri-only, and the plugins are pulled in with `import()` rather than at the
 * top of the file so they aren't bundled into the browser build's entry chunk,
 * where they could never be called.
 */
export function useUpdater(): Updater {
  const [update, setUpdate] = useState<Update | null>(null);
  const [install, setInstall] = useState<InstallState>({ phase: "idle" });

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const found = await check({ timeout: CHECK_TIMEOUT_MS });
        if (cancelled) {
          // Unmounted while we waited. `Update` holds a resource on the Rust
          // side, so it has to be handed back rather than just dropped.
          await found?.close();
          return;
        }
        setUpdate(found);
      } catch (e) {
        console.debug("Update check failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const installAndRelaunch = useCallback(async () => {
    if (!update) {
      return;
    }

    setInstall({ phase: "downloading", received: 0 });
    try {
      let received = 0;
      let total: number | undefined;

      // `Progress` carries the size of *this* chunk, not a running total, so
      // the sum is ours to keep.
      await update.downloadAndInstall((e) => {
        switch (e.event) {
          case "Started":
            total = e.data.contentLength;
            setInstall({ phase: "downloading", received: 0, total });
            break;
          case "Progress":
            received += e.data.chunkLength;
            setInstall({ phase: "downloading", received, total });
            break;
          case "Finished":
            // Downloaded, not yet installed: `downloadAndInstall` resolves
            // after the install, which on some platforms takes a visible while.
            setInstall({ phase: "installing" });
            break;
        }
      });

      // No success state to set: this replaces the running app.
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      // Unlike the check, a failure here *is* worth saying: the user asked for
      // this and is watching a progress bar. The most likely cause by far is a
      // .deb install, where the check succeeds and the install cannot, because
      // the plugin only knows how to replace an AppImage on Linux.
      setInstall({
        phase: "failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [update]);

  return { update, install, installAndRelaunch };
}
