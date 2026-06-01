import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cx } from "./controlStyles";

export interface DisclosureProps {
  /** Always-visible label on the summary row. Styled as a section heading. */
  title: ReactNode;
  /** Open on first render. */
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

// A collapsible section built on the native <details>/<summary> pair, so it's
// keyboard- and screen-reader-accessible with no extra wiring. The summary is a
// full `control`-height hit target wearing the same `text-sm font-bold uppercase
// opacity-70` section-heading look the rest of the app uses, with a chevron that
// rotates open. The body opens with the form's standard `gap-4` field rhythm.
// Use it to tuck secondary/advanced fields out of the way without hiding them.
export const Disclosure = ({
  title,
  defaultOpen = false,
  className,
  children,
}: DisclosureProps) => {
  return (
    <details open={defaultOpen} className={cx("group", className)}>
      <summary
        className={cx(
          // Native marker off; we draw our own chevron instead.
          "list-none [&::-webkit-details-marker]:hidden",
          "flex min-h-control cursor-pointer select-none items-center gap-2 rounded",
          "text-sm font-bold uppercase text-base-content opacity-70 transition-opacity hover:opacity-100",
          "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        )}
      >
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        {title}
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
};
