import type { BackupV1 } from "./backupFormat";

/** Serialize the backup and hand it to the browser as a file download. */
export function downloadBackup(backup: BackupV1) {
  const deviceSlug =
    backup.device.name.replace(/[^a-zA-Z0-9_-]+/g, "_") || "device";
  // exportedAt is ISO UTC; squash to YYYYMMDD-HHMMSS for the filename.
  const stamp = backup.exportedAt
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 15);
  const filename = `zmk-backup-${deviceSlug}-${stamp}.json`;

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
