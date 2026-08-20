import type { ReactNode } from "react";
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  type MenuItemProps as RACMenuItemProps,
  type PopoverProps,
} from "react-aria-components";

import { cx, menuItem, popoverSurface } from "./controlStyles";

/**
 * A dropdown action menu off a trigger, built on react-aria's
 * `MenuTrigger`/`Popover`/`Menu` — the same way `Select` composes its
 * primitives. Use it for a list of one-shot actions hung off a button (e.g. the
 * header's device menu); for *selecting a value* reach for `Select` instead.
 *
 * The popover shares the `popoverSurface` look with the Select/Combobox lists,
 * and items are full `h-control` (48px) rows via `menuItem` so they line up with
 * every other hit target and take a leading icon for free.
 *
 *   <DropdownMenu trigger={<Button …>Device</Button>}>
 *     <DropdownMenuItem icon={<Unplug />} onAction={onDisconnect}>Disconnect</DropdownMenuItem>
 *   </DropdownMenu>
 */
export interface DropdownMenuProps {
  /** The element that opens the menu (typically a `<Button>`). */
  trigger: ReactNode;
  /** `DropdownMenuItem`s. */
  children: ReactNode;
  /** Popover placement relative to the trigger (default `bottom end`). */
  placement?: PopoverProps["placement"];
  /**
   * Static content below the rows — a fact about the menu's subject rather than
   * something to pick (the header menu's `Version 0.5.0`). It sits *outside* the
   * `Menu`: a react-aria collection only accepts items, and a fact rendered as a
   * disabled row would read as an action you're not allowed to take. Keyboard
   * focus never lands here, so anything a screen reader must reach needs a home
   * elsewhere too.
   */
  footer?: ReactNode;
}

export function DropdownMenu({
  trigger,
  children,
  placement = "bottom end",
  footer,
}: DropdownMenuProps) {
  return (
    <MenuTrigger>
      {trigger}
      {/* `p-1` insets the rows from the panel edge, matching the Combobox popover. */}
      <Popover placement={placement} className={cx(popoverSurface, "p-1")}>
        <Menu className="outline-none">{children}</Menu>
        {footer && (
          // `-mx-1` cancels the popover's `p-1` so the rule spans edge to edge,
          // like the untitled-section divider in `Select`'s option lists.
          <div className="-mx-1 mt-1 border-t border-base-line px-3 pt-2 pb-1 text-xs text-base-content/60">
            {footer}
          </div>
        )}
      </Popover>
    </MenuTrigger>
  );
}

export interface DropdownMenuItemProps
  extends Omit<RACMenuItemProps, "children" | "className"> {
  /** Optional leading icon (a lucide icon); inherits `size-4` from the row. */
  icon?: ReactNode;
  children: ReactNode;
}

export function DropdownMenuItem({
  icon,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <MenuItem className={menuItem} {...props}>
      {icon && (
        <span aria-hidden className="flex shrink-0 items-center">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </MenuItem>
  );
}
