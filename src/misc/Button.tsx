import {
  Button as RACButton,
  ToggleButton as RACToggleButton,
  type ButtonProps as RACButtonProps,
  type ToggleButtonProps as RACToggleButtonProps,
} from "react-aria-components";
import { createContext, useContext, type ReactNode } from "react";
import { buttonStyles, cx, type ButtonVariant, type ButtonSize } from "./controlStyles";

/** Set by ButtonGroup so member buttons drop their own corner radius. */
const ButtonGroupContext = createContext(false);

interface CommonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional icon rendered alongside the label, or alone if there's no label. */
  icon?: ReactNode;
  /** Which side the icon sits on relative to the label. */
  iconPosition?: "start" | "end";
}

function renderContent(
  children: ReactNode,
  icon: ReactNode,
  iconPosition: "start" | "end"
): ReactNode {
  if (!children) return icon ?? null;
  return iconPosition === "end" ? (
    <>
      {children}
      {icon}
    </>
  ) : (
    <>
      {icon}
      {children}
    </>
  );
}

export interface ButtonProps
  extends Omit<RACButtonProps, "children" | "className">,
    CommonOwnProps {
  children?: ReactNode;
  className?: string;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "start",
  className,
  children,
  ...props
}: ButtonProps) {
  const inGroup = useContext(ButtonGroupContext);
  const iconOnly = !children && !!icon;
  return (
    <RACButton
      className={cx(buttonStyles({ variant, size, iconOnly, inGroup }), className)}
      {...props}
    >
      {renderContent(children, icon, iconPosition)}
    </RACButton>
  );
}

export interface ToggleButtonProps
  extends Omit<RACToggleButtonProps, "children" | "className">,
    CommonOwnProps {
  children?: ReactNode;
  className?: string;
}

/**
 * A button with an on/off (pressed) state — `isSelected` renders the active
 * style. Use inside ButtonGroup for segmented controls (e.g. modifier keys).
 */
export function ToggleButton({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "start",
  className,
  children,
  ...props
}: ToggleButtonProps) {
  const inGroup = useContext(ButtonGroupContext);
  const iconOnly = !children && !!icon;
  return (
    <RACToggleButton
      className={cx(buttonStyles({ variant, size, iconOnly, inGroup }), className)}
      {...props}
    >
      {renderContent(children, icon, iconPosition)}
    </RACToggleButton>
  );
}

export interface ButtonGroupProps {
  className?: string;
  children: ReactNode;
}

/**
 * Segmented container: adjacent Button/ToggleButton children read as one
 * control. Children drop their own radius (via context) and the group rounds
 * only its outer corners; dividers separate the segments.
 */
export function ButtonGroup({ className, children }: ButtonGroupProps) {
  return (
    <ButtonGroupContext.Provider value={true}>
      <div
        role="group"
        className={cx(
          "inline-flex divide-x divide-white/10 [&>*:first-child]:rounded-l [&>*:last-child]:rounded-r",
          className
        )}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}
