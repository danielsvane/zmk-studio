import type { ReactNode } from "react";

import { cx, selectableCard } from "./controlStyles";

export interface SidebarCardProps {
  /** Highlights the row as the one whose detail is open in the editor. */
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

// A selectable master-list row for the Combos / Behaviours sidebars (the
// master→detail pattern). A borderless *nav row* (shared `selectableCard`): no
// box, transparent at rest with a subtle hover fill, and a primary tint +
// primary text when selected to mark the row whose detail is open in the editor.
// Deliberately not a filled/bordered tile — that read as a Select input. Shared
// so both lists stay identical; wrap each row's content as the children.
export function SidebarCard({ selected, onSelect, children }: SidebarCardProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cx(
          selectableCard.base,
          "block w-full",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
          selected ? selectableCard.selected : selectableCard.resting,
        )}
      >
        {children}
      </button>
    </li>
  );
}
