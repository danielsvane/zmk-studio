// Shared visual foundation for button-like surfaces (Button, ToggleButton,
// Select trigger, …). Kept in its own module — separate from the React
// components in Button.tsx — so Vite Fast Refresh keeps working: a file that
// exports components must export *only* components, and these style helpers are
// shared by several controls (Select, Field, KeyGrid, …).

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "link"
  | "danger";
export type ButtonSize = "sm" | "md";

/** Minimal className joiner (no clsx/cva dependency in this project). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// Accessible keyboard focus ring (react-aria sets data-focus-visible). Shared
// by every interactive control so Buttons, Selects, etc. ring identically.
export const controlFocusRing =
  "rac-focus-visible:outline rac-focus-visible:outline-2 rac-focus-visible:outline-offset-1 rac-focus-visible:outline-primary";
/** Disabled treatment shared by all interactive controls. */
export const controlDisabled =
  "rac-disabled:opacity-50 rac-disabled:cursor-not-allowed";

const base = cx(
  "inline-flex items-center justify-center gap-1.5 font-medium select-none cursor-pointer transition-[background-color,filter,color]",
  controlFocusRing,
  controlDisabled
);

// `bg-primary` is defined with light-dark() and has no <alpha-value> slot, so
// opacity modifiers (bg-primary/90) won't work — use brightness for hover/press.
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-content rac-hover:brightness-110 rac-pressed:brightness-95 " +
    "rac-selected:bg-primary rac-selected:text-primary-content",
  secondary:
    "bg-base-200 text-base-content rac-hover:bg-base-300 rac-pressed:brightness-95 " +
    "rac-selected:bg-primary rac-selected:text-primary-content",
  ghost:
    "bg-transparent text-base-content rac-hover:bg-base-300 rac-pressed:brightness-95 " +
    "rac-selected:bg-primary rac-selected:text-primary-content",
  link: "bg-transparent text-primary rac-hover:underline",
  // Destructive actions. red-600 is a normal Tailwind color (has an alpha slot),
  // so brightness hover works the same as the theme-token variants above.
  danger:
    "bg-red-600 text-white rac-hover:brightness-110 rac-pressed:brightness-95 " +
    "rac-selected:bg-red-600 rac-selected:text-white",
};

// Height/text/icon size apply to every variant (incl. link) so they all line
// up; only the horizontal footprint differs per size/shape. Exported so other
// controls (Select, future Input) adopt the exact same heights.
export const controlSizeStyles: Record<ButtonSize, string> = {
  md: "h-8 text-sm [&_svg]:size-4",
  sm: "h-6 text-xs [&_svg]:size-3.5",
};
/** Horizontal padding for a control showing a text label. */
export const controlPadX: Record<ButtonSize, string> = { md: "px-3", sm: "px-2" };
const iconWidth: Record<ButtonSize, string> = { md: "w-8", sm: "w-6" };

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square padding for a button whose only content is an icon. */
  iconOnly?: boolean;
  /** Inside a ButtonGroup — the group owns corner rounding, so omit it here. */
  inGroup?: boolean;
}

/**
 * Shared visual foundation for button-like surfaces. Exported so other
 * controls (e.g. a Select trigger) can render with the same look without
 * having to be a Button. `link` opts out of sizing so it sits inline.
 */
export function buttonStyles({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  inGroup = false,
}: ButtonStyleOptions = {}): string {
  return cx(
    base,
    // Standalone buttons round themselves; grouped ones defer to the group.
    !inGroup && "rounded",
    variants[variant],
    controlSizeStyles[size],
    variant === "link" ? null : iconOnly ? iconWidth[size] : controlPadX[size]
  );
}
