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
  ...props
}: TooltipProps) => {
  return (
    <TooltipTrigger delay={delay} closeDelay={closeDelay} {...props}>
      {children}
      <AriaTooltip offset={5} className={tooltipSurface}>
        {label}
      </AriaTooltip>
    </TooltipTrigger>
  );
};
