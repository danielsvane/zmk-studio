import {
  TooltipTrigger,
  Tooltip as AriaTooltip,
  type TooltipTriggerComponentProps,
} from "react-aria-components";
import { tooltipSurface } from "./controlStyles";

export interface TooltipProps
  extends Omit<TooltipTriggerComponentProps, "children"> {
  children: React.ReactNode;
  label: string;
  /**
   * Which side of the trigger the bubble hangs off. Defaults to `top`, which
   * suits a toolbar icon; pass `bottom` when the space above is content the
   * reader still needs — a paragraph-long bubble over a small dialog otherwise
   * covers the very thing it's explaining.
   */
  placement?: "top" | "bottom" | "left" | "right";
}

/**
 * Hover/focus label for a control. The remaining react-aria trigger props
 * (`delay`, `isOpen`/`onOpenChange`, `shouldCloseOnPress`, …) pass through, so a
 * deliberate target like {@link InfoTip} can show instantly and stay open when
 * pressed; the defaults here suit incidental hovers over toolbar icons.
 */
export const Tooltip = ({
  children,
  label,
  delay = 1000,
  closeDelay = 500,
  placement,
  ...props
}: TooltipProps) => {
  return (
    <TooltipTrigger delay={delay} closeDelay={closeDelay} {...props}>
      {children}
      <AriaTooltip offset={5} placement={placement} className={tooltipSurface}>
        {label}
      </AriaTooltip>
    </TooltipTrigger>
  );
};
