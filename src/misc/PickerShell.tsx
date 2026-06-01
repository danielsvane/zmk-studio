import type { ReactNode } from "react";

/** The two regions a selection editor splits into. A null canvas means there's
 * no visual surface for the current selection, so the shell shows one column. */
export interface PickerRegions {
  /** Form controls (selects, search, toggles). Always shown. */
  controls: ReactNode;
  /** Large visual selection surface (key grid, physical layout), or null. */
  canvas: ReactNode | null;
}

export interface PickerShellProps {
  controls: ReactNode;
  canvas?: ReactNode | null;
}

/**
 * Two-region layout for a selection editor: a CONTROLS form beside a large
 * CANVAS surface. Stacks vertically by default and flips to side-by-side once
 * the shell's own width passes ~36rem — driven by a CSS container query, so it
 * reacts to the width it's actually given (a drawer, a dialog, a panel) rather
 * than the viewport. With no canvas it collapses to a single controls column,
 * identical to the plain stacked form it replaces.
 */
export const PickerShell = ({ controls, canvas }: PickerShellProps) => {
  if (!canvas) {
    return <div className="flex max-w-sm flex-col gap-2">{controls}</div>;
  }

  return (
    <div className="@container">
      <div className="flex flex-col gap-3 @[64rem]:flex-row @[64rem]:items-start @[64rem]:gap-4">
        {/* Cap the controls when stacked so the selects don't stretch across a
            wide panel; side-by-side they're a fixed column at the same width, wide
            enough for the eight modifier segments to sit on one line. */}
        <div className="flex min-w-0 max-w-sm flex-col gap-2 @[64rem]:w-96 @[64rem]:max-w-none @[64rem]:shrink-0">
          {controls}
        </div>
        <div className="min-w-0 @[64rem]:flex-1">{canvas}</div>
      </div>
    </div>
  );
};
