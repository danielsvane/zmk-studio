import { Check, X } from "lucide-react";

import { GenericModal } from "../GenericModal";
import { Button } from "../misc/Button";
import { useModalRef } from "../misc/useModalRef";
import type { BackupV1 } from "./backupFormat";
import type { ImportReport } from "./importReport";

export interface BackupImportConfirmProps {
  /** The parsed file awaiting confirmation; null hides the modal. */
  backup: BackupV1 | null;
  deviceName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Importing is destructive (full replace + auto-save), so it gets an explicit
// confirm step that spells out what's about to happen — mirroring the Restore
// Stock Settings dialog.
export const BackupImportConfirmModal = ({
  backup,
  deviceName,
  onCancel,
  onConfirm,
}: BackupImportConfirmProps) => {
  const ref = useModalRef(backup !== null);

  return (
    <GenericModal
      ref={ref}
      onClose={onCancel}
      className="max-w-[50vw]"
      title="Import Backup"
      actions={
        <>
          <Button
            variant="ghost"
            icon={<X aria-hidden />}
            onPress={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Check aria-hidden />}
            onPress={onConfirm}
          >
            Replace and Save
          </Button>
        </>
      }
    >
      {backup && (
        <div className="flex flex-col gap-2">
          <p>
            This restores the backup of{" "}
            <span className="font-medium">{backup.device.name}</span> from{" "}
            {new Date(backup.exportedAt).toLocaleString()} —{" "}
            {backup.keymap.layers.length} layers, {backup.combos.length} combos,{" "}
            {backup.customBehaviors.length} custom behaviours.
          </p>
          {deviceName && backup.device.name !== deviceName && (
            <p className="text-error">
              The backup is from “{backup.device.name}”, but the connected
              keyboard is “{deviceName}”. Bindings for keys this keyboard
              doesn't have will be skipped.
            </p>
          )}
          <p>
            Everything currently on the keyboard — layers, combos, and custom
            behaviours — will be <span className="font-medium">replaced</span>{" "}
            and the result saved to flash immediately.
          </p>
        </div>
      )}
    </GenericModal>
  );
};

export interface BackupImportReportProps {
  /** The finished import's report; null hides the modal. */
  report: ImportReport | null;
  onClose: () => void;
}

export const BackupImportReportModal = ({
  report,
  onClose,
}: BackupImportReportProps) => {
  const ref = useModalRef(report !== null);

  return (
    <GenericModal
      ref={ref}
      onClose={onClose}
      className="max-w-[50vw]"
      title={report?.fatal ? "Import Failed" : "Import Complete"}
      actions={
        <Button variant="primary" icon={<X aria-hidden />} onPress={onClose}>
          Close
        </Button>
      }
    >
      {report &&
        (report.fatal ? (
          <p>{report.fatal}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p>
              Applied {report.applied.layers} layers,{" "}
              {report.applied.bindings} bindings, {report.applied.combos}{" "}
              combos, and {report.applied.customBehaviors} custom behaviours.
            </p>
            {report.skipped.length === 0 ? (
              <p>Everything imported cleanly.</p>
            ) : (
              <>
                <p className="text-error">
                  {report.skipped.length} item
                  {report.skipped.length === 1 ? "" : "s"} could not be
                  restored:
                </p>
                <ul className="max-h-[40vh] overflow-y-auto list-disc pl-5 text-sm">
                  {report.skipped.map((item, i) => (
                    <li key={i}>
                      <span className="font-medium">{item.location}</span> —{" "}
                      {item.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
    </GenericModal>
  );
};
