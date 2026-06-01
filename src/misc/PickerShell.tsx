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
 * the shell's own width passes 88rem — driven by a CSS container query, so it
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
      <div className="flex flex-col gap-3 @[88rem]:flex-row @[88rem]:items-start @[88rem]:gap-4">
        {/* Cap the controls at the same 38rem stacked or side-by-side: wide
            enough for the eight modifier segments to sit on one line at the full
            control text size (text-sm), but still bounded so the selects don't
            stretch across a very wide panel. */}
        <div className="flex min-w-0 max-w-[38rem] flex-col gap-2 @[88rem]:w-[38rem] @[88rem]:max-w-none @[88rem]:shrink-0">
          {controls}
        </div>
        <div className="min-w-0 @[88rem]:flex-1">{canvas}</div>
      </div>
    </div>
  );
};
