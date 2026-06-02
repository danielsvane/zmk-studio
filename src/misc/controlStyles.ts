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

// Filled-input surface shared by every form control that looks like an input
// rather than an action: the Select/Combobox triggers and the TextField. A
// `base-100` fill (a shade lighter than the `base-200` panels it sits on) with
// a `base-line` hairline edge — the same edge token used by every other control
// border. Theme tokens are light-dark() with no alpha slot, so hover/press
// brighten via `brightness-*` rather than fill opacity. Single source of truth:
// change the input look here and it moves everywhere.
export const controlSurface = cx(
  "bg-base-100 border border-base-line text-base-content",
  "transition-[background-color,filter,border-color]"
);

// Selectable master-list row, shared by the Combos/Behaviours `SidebarCard` and
// the layer picker so all three sidebars read alike. A bounded, *filled* tile
// (`base-100` fill + `base-line` hairline — the same surface language as inputs)
// so a row looks clickable at rest, not only on hover; the selected row takes a
// primary border + tint instead of a solid fill. Compose `base` with either
// `resting` or `selected` — pick via a computed boolean (plain lists) or
// react-aria's `isSelected` render prop (ListBox items).
export const selectableCard = {
  base: cx(
    "cursor-pointer rounded border p-3 text-left",
    "transition-[background-color,border-color,filter]"
  ),
  resting:
    "border-base-line bg-base-100 hover:border-base-content/25 hover:brightness-125",
  selected: "border-primary bg-primary/15",
};

const base = cx(
  "inline-flex items-center justify-center gap-1.5 font-medium select-none cursor-pointer transition-[background-color,filter,color]",
  controlFocusRing,
  controlDisabled
);

// `bg-primary` is a solid fill: for hover/press use brightness, not opacity
// (a translucent button would let the panel bleed through). `primary` does
// carry an <alpha-value> slot, but reserve `bg-primary/<n>` for static tints
// like the selected SidebarCard, not button hover states.
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

// Every control is one comfortable `h-control` (48px) hit target regardless of
// size — `size` only tunes the text/icon scale and horizontal footprint, not the
// height, so Selects, ToggleGroups, keys, and Buttons all line up. Exported so
// other controls (Select, future Input) adopt the exact same height.
export const controlSizeStyles: Record<ButtonSize, string> = {
  md: "h-control text-base [&_svg]:size-4",
  sm: "h-control text-xs [&_svg]:size-3.5",
};
/** Horizontal padding for a control showing a text label. */
export const controlPadX: Record<ButtonSize, string> = { md: "px-3", sm: "px-2" };
// Icon-only buttons stay square at the shared hit-target size.
const iconWidth: Record<ButtonSize, string> = { md: "w-control", sm: "w-control" };

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
