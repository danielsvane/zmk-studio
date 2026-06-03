// Import is best-effort: anything that doesn't fit the connected firmware is
// skipped, recorded here, and shown to the user afterwards — never thrown.

export type SkippedKind =
  | "layer"
  | "binding"
  | "combo"
  | "customBehavior"
  | "configField"
  | "save";

export interface SkippedItem {
  kind: SkippedKind;
  /** Where in the backup the item came from, e.g. "layer 2 / key 14" or "combo #3". */
  location: string;
  reason: string;
}

export interface ImportReport {
  /** Set when import couldn't even read the device state; nothing was changed. */
  fatal?: string;
  skipped: SkippedItem[];
  applied: {
    layers: number;
    bindings: number;
    combos: number;
    customBehaviors: number;
  };
}

export function createReport(): ImportReport {
  return {
    skipped: [],
    applied: { layers: 0, bindings: 0, combos: 0, customBehaviors: 0 },
  };
}

export function skip(
  report: ImportReport,
  kind: SkippedKind,
  location: string,
  reason: string
) {
  report.skipped.push({ kind, location, reason });
}
