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
// the layer picker so all three sidebars read alike. A borderless *nav row*, not
// a tile: deliberately NOT the `controlSurface` look (`base-100` fill + hairline
// border), which reads as a Select/input — these are menu items, so they're
// transparent at rest, take a subtle `bg-base-content/10` hover (the app's one
// "lighten" hover, see `menuItem`), and the quiet active-nav tint when selected
// (`bg-primary/15 text-primary` — same tier as the active header tab, NOT the
// loud solid `bg-primary` reserved for in-content picking; see the active-state
// note in DESIGN-SYSTEM.md). Compose `base` with either `resting` or `selected`
// — pick via a computed boolean (plain lists) or react-aria's `isSelected`
// render prop (ListBox items).
export const selectableCard = {
  base: cx("cursor-pointer rounded p-3 text-left", "transition-colors"),
  resting: "hover:bg-base-content/10",
  selected: "bg-primary/15 text-primary",
};

// The floating popover container shared by every dropdown surface: the
// Select/Combobox option lists and the `DropdownMenu`. A `base-100` panel with a
// `base-300` edge and a lift shadow, floored at the trigger's width. Single
// source so all popovers match; callers add their own inner padding
// (`py-1`/`p-1`) on top.
export const popoverSurface = cx(
  "min-w-[var(--trigger-width)] rounded border border-base-300",
  "bg-base-100 text-base-content shadow-lg"
);

// A menu/action row — the menu-item sibling of `buttonStyles`: one `h-control`
// (48px) hit target, left-aligned, with room for a leading icon. Used by
// `DropdownMenu`'s items. Hover/keyboard-focus use the app's standard "lighten"
// (`bg-base-content/10`, surface-agnostic — the same overlay `selectableCard`
// and the Select option rows use). Styles a react-aria `MenuItem` directly
// rather than nesting a `<Button>`, which would double up focus/press handling.
export const menuItem = cx(
  "group flex w-full items-center gap-2 h-control px-2 rounded-sm outline-none",
  "cursor-pointer select-none [&_svg]:size-4",
  "rac-hover:bg-base-content/10 rac-focus:bg-base-content/10",
  controlDisabled
);

const base = cx(
  "inline-flex items-center justify-center gap-2 font-medium select-none cursor-pointer transition-[background-color,filter,color]",
  controlFocusRing,
  controlDisabled
);

// One hover rule across the app: buttons LIGHTEN on hover, never darken — the
// mechanism just follows the surface (see the Interaction-states note in
// DESIGN-SYSTEM.md). FILLED surfaces (`primary`/`secondary`/`danger`) brighten
// via `brightness-110` — a filter on top of the existing fill, so a solid color
// never goes translucent. TRANSPARENT surfaces (`ghost`) take the
// `bg-base-content/10` lighten veil instead — brightness does nothing to
// `bg-transparent`, and this is the same overlay the menu rows / Select options
// use, so ghost buttons, menu items, and option rows all share one hover. Press
// still darkens (`brightness-95`) — that's the tactile "pushed" feedback, which
// is separate from hover.
//
// The `primary` *button* is the page's call-to-action and uses the blue `action`
// token — deliberately distinct from the `primary` token, which is reserved for
// selection/active state and static tints (e.g. the selected SidebarCard).
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-action-content rac-hover:brightness-110 rac-pressed:brightness-95 " +
    "rac-selected:bg-action rac-selected:text-action-content",
  secondary:
    "bg-base-200 text-base-content rac-hover:brightness-110 rac-pressed:brightness-95 " +
    "rac-selected:bg-primary rac-selected:text-primary-content",
  // Ghost is the app's nav button (the header section tabs) + the bare icon
  // buttons. Hover takes the lighten veil (it's transparent, so brightness has
  // nothing to act on). Its selected state is the *quiet* active-nav tint —
  // `bg-primary/15 text-primary`, the same tier as the selected `selectableCard`
  // sidebar row — NOT the loud solid `bg-primary` that the filled variants use
  // for in-content selection. "Where am I" nav shouldn't shout louder than the
  // content.
  ghost:
    "bg-transparent text-base-content rac-hover:bg-base-content/10 rac-pressed:brightness-95 " +
    "rac-selected:bg-primary/15 rac-selected:text-primary",
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
/** Horizontal padding for an *input-like* control (Select trigger, TextField). */
export const controlPadX: Record<ButtonSize, string> = { md: "px-3", sm: "px-2" };
// Buttons sit one step wider than the input-like controls: a label is content
// that should be hugged with air, where an input's padding is only a text inset.
const buttonPadX: Record<ButtonSize, string> = { md: "px-4", sm: "px-3" };
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
    variant === "link" ? null : iconOnly ? iconWidth[size] : buttonPadX[size]
  );
}
