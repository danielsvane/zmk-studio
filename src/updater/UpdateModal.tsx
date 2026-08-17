import { Download, X } from "lucide-react";

import { GenericModal } from "../GenericModal";
import { Button } from "../misc/Button";
import { ErrorMessage } from "../misc/Field";
import { ExternalLink } from "../misc/ExternalLink";
import { useModalRef } from "../misc/useModalRef";
import { parseReleaseNotes } from "./releaseNotes";
import type { InstallState } from "./useUpdater";

export interface UpdateModalProps {
  open: boolean;
  /** The version running now. */
  currentVersion: string;
  /** The version on offer. */
  version: string;
  /** Raw Markdown from the release; the whole changelog section. */
  notes?: string;
  install: InstallState;
  onInstall: () => void;
  onClose: () => void;
}

// Everything the updater can do, as plain props, so the states that matter are
// reachable without a release to install (see the stories). The Tauri side lives
// entirely in `useUpdater`.
export const UpdateModal = ({
  open,
  currentVersion,
  version,
  notes,
  install,
  onInstall,
  onClose,
}: UpdateModalProps) => {
  const ref = useModalRef(open, true);
  const lines = parseReleaseNotes(notes);
  const busy = install.phase === "downloading" || install.phase === "installing";

  return (
    <GenericModal
      ref={ref}
      onClose={onClose}
      className="w-[36rem] max-w-[90vw]"
      title="Update available"
      actions={
        <>
          <Button
            variant="ghost"
            icon={<X aria-hidden />}
            onPress={onClose}
            // Closing mid-download would leave the install running with nothing
            // watching it, and nowhere to report that it failed.
            isDisabled={busy}
          >
            Later
          </Button>
          <Button
            variant="primary"
            icon={<Download aria-hidden />}
            onPress={onInstall}
            isDisabled={busy}
          >
            {install.phase === "failed"
              ? "Try again"
              : "Install and restart"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>
          Version <span className="font-medium">{version}</span> is available.
          You have {currentVersion}.
        </p>

        {lines.length > 0 && (
          // Scrolls on its own rather than growing the dialog: this is the
          // entire changelog section for the release, which has no upper bound.
          <div className="max-h-[40vh] overflow-y-auto rounded border border-base-line p-3 text-sm">
            {lines.map((line, i) =>
              line.kind === "heading" ? (
                <h3
                  key={i}
                  className="mt-3 font-semibold text-base-content-strong first:mt-0"
                >
                  {line.text}
                </h3>
              ) : line.kind === "item" ? (
                <p key={i} className="mt-1 pl-4 -indent-4 before:content-['•_']">
                  {line.text}
                </p>
              ) : (
                <p key={i} className="mt-1">
                  {line.text}
                </p>
              )
            )}
          </div>
        )}

        {busy && <InstallProgress install={install} />}

        {install.phase === "failed" && (
          <div className="flex flex-col gap-1">
            {/* `role="alert"`: this arrives after a press, with no field for AT
                to reach it through. */}
            <ErrorMessage role="alert">
              The update could not be installed: {install.message}
            </ErrorMessage>
            <p className="text-sm">
              In-app updates work with the AppImage and the Windows and macOS
              installers. If you installed the .deb package, replace it from the{" "}
              <ExternalLink href="https://github.com/danielsvane/zmk-studio/releases">
                releases page
              </ExternalLink>
              .
            </p>
          </div>
        )}
      </div>
    </GenericModal>
  );
};

const InstallProgress = ({ install }: { install: InstallState }) => {
  // Percent rather than a byte count: it's what the bar needs anyway, and it
  // saves formatting sizes for a number nobody acts on.
  const pct =
    install.phase === "downloading" && install.total
      ? Math.round((install.received / install.total) * 100)
      : null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm" aria-live="polite">
        {install.phase === "installing"
          ? "Installing…"
          : pct === null
            ? "Downloading…"
            : `Downloading… ${pct}%`}
      </p>
      {/* A plain div rather than <progress>, whose bar is only styleable
          through vendor pseudo-elements. Indeterminate while the size is
          unknown: the track alone, with no value announced. */}
      <div
        role="progressbar"
        aria-label="Update download"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        className="h-2 w-full overflow-hidden rounded-full bg-base-300"
      >
        <div
          className="h-full rounded-full bg-action transition-[width] duration-200"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
};
