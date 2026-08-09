import {
  Button as RACButton,
  DialogTrigger,
  Dialog,
  Popover,
} from "react-aria-components";
import { Info } from "lucide-react";
import { cx, controlFocusRing, tooltipSurface } from "./controlStyles";
import { ExternalLink } from "./ExternalLink";

/**
 * The "what does this do?" affordance for a control whose label can't carry the
 * explanation: an info icon beside the label that opens a sentence or two, with
 * an optional link on to the full docs.
 *
 * It's a Dialog popover, not a {@link Tooltip}, because of that link — a tooltip
 * closes the moment the pointer leaves its trigger, so a link inside one can't
 * be clicked (and interactive content in a `role="tooltip"` is an accessibility
 * violation besides). Click, Enter, or Space opens it; Escape or a click outside
 * closes it and returns focus to the icon. It borrows `tooltipSurface` so it's
 * the same bubble the hover tooltips use.
 *
 * Render it *beside* the `<label>`, never inside one (see `Field`'s `info`
 * prop): a button nested in a label also activates the control it labels.
 */
export interface InfoTipProps {
  /** The explanation to show. Plain text; newlines are preserved. */
  description: string;
  /** What's being explained — names the button and the popover for screen
   * readers. */
  subject: string;
  /** Docs page to link at the bottom, when there's one worth reading. */
  href?: string;
}

// A 24px hit target (WCAG 2.5.8 AA) around a 16px glyph, muted until pointed at
// so a form full of these stays calm. Uses the `ghost` button's lighten-on-hover
// rather than its 48px control height, which would tower over a label.
const triggerStyles = cx(
  "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
  "cursor-pointer text-base-content/50 transition-colors",
  "rac-hover:bg-base-content/10 rac-hover:text-base-content",
  controlFocusRing
);

export function InfoTip({ description, subject, href }: InfoTipProps) {
  return (
    <DialogTrigger>
      <RACButton
        // Opt out of any ButtonContext around us: a react-aria Select hands its
        // trigger props to every Button in its subtree, which would otherwise
        // turn this into a second "open the dropdown" button.
        slot={null}
        aria-label={`About ${subject}`}
        className={triggerStyles}
      >
        <Info aria-hidden className="size-4" />
      </RACButton>
      {/* Above the icon, not below it: the icon sits on a field's label row, so
          the default bottom placement drops the bubble straight over the input
          it's describing. React-aria flips it back down if there's no room. */}
      <Popover placement="top" offset={5} className={tooltipSurface}>
        <Dialog aria-label={subject} className="outline-none">
          {description}
          {href && (
            <div className="mt-2">
              <ExternalLink href={href}>ZMK docs</ExternalLink>
            </div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
