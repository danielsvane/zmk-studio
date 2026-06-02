import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cx } from "./controlStyles";

export interface SidebarCardProps {
  /** Highlights the row as the one whose detail is open in the editor. */
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

// A selectable master-list row for the Combos / Behaviours sidebars (the
// master→detail pattern). Rendered as a bounded, *filled* tile — `base-100`
// fill + `base-line` hairline edge, the same surface language every other
// control uses — so a row reads as clickable at rest, not only on hover. The
// drill-in chevron (`›`) signals that selecting it opens a detail editor. The
// selected row takes a primary border + primary-tinted fill. Shared so both
// lists stay identical; wrap each row's content as the children.
export function SidebarCard({ selected, onSelect, children }: SidebarCardProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cx(
          "flex w-full cursor-pointer items-center gap-2 rounded border p-3 text-left",
          "transition-[background-color,border-color,filter]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
          selected
            ? "border-primary bg-primary/15"
            : "border-base-line bg-base-100 hover:border-base-content/25 hover:brightness-125",
        )}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <ChevronRight
          aria-hidden
          className={cx(
            "size-4 shrink-0 transition-colors",
            selected ? "text-primary" : "opacity-40",
          )}
        />
      </button>
    </li>
  );
}
