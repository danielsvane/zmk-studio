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
  /**
   * Unavailable, but still focusable and hoverable — it renders `aria-disabled`
   * instead of `disabled` and swallows `onPress`. Use this instead of
   * `isDisabled` whenever the *reason* is worth reading, and wrap it in a
   * `Tooltip` that gives that reason: a truly `disabled` button fires no pointer
   * events and leaves the tab order, so neither a mouse nor a keyboard can ever
   * reach the explanation. Reach for plain `isDisabled` when the cause is
   * obvious from context (nothing selected yet, no unsaved changes).
   */
  isUnavailable?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "start",
  className,
  children,
  isUnavailable,
  onPress,
  ...props
}: ButtonProps) {
  const inGroup = useContext(ButtonGroupContext);
  const iconOnly = !children && !!icon;
  return (
    <RACButton
      className={cx(buttonStyles({ variant, size, iconOnly, inGroup }), className)}
      aria-disabled={isUnavailable || undefined}
      onPress={isUnavailable ? undefined : onPress}
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
          "inline-flex divide-x divide-base-line [&>*:first-child]:rounded-l [&>*:last-child]:rounded-r",
          className
        )}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}
