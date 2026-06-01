import { createContext, useContext, useId, type ReactNode } from "react";
import {
  ToggleButtonGroup as RACToggleButtonGroup,
  ToggleButton as RACToggleButton,
  type ToggleButtonGroupProps as RACToggleButtonGroupProps,
  type Key,
} from "react-aria-components";

import { cx, controlFocusRing, type ButtonSize } from "./controlStyles";
import { GroupLabel } from "./Field";

/**
 * A segmented selection control styled as a form field. {@link ToggleGroup} is
 * the labelled, bordered surface; its {@link ToggleGroupItem} children divide it
 * into equal segments. Selection (single *or* multiple) is managed by
 * react-aria's ToggleButtonGroup — pass `selectionMode`, `selectedKeys`, and
 * `onSelectionChange`. It shares the filled `base-100` fill and the `base-line`
 * hairline border/divider with the selects, so a row of toggles reads as one
 * input that matches the rest of the picker.
 */

// Bordered, rounded container with hairline dividers between segments — the same
// edge tokens the select triggers use. `overflow-hidden` clips the segments to
// the rounded corners; segments themselves stretch equally (flex-1).
const groupSurface = cx(
  "flex overflow-hidden rounded border border-base-line divide-x divide-base-line"
);

const itemBase = cx(
  "flex flex-1 items-center justify-center gap-0.5 font-medium whitespace-nowrap",
  "cursor-pointer select-none text-base-content bg-base-100",
  "transition-[background-color,filter,color]",
  "rac-hover:brightness-110",
  "rac-selected:bg-primary rac-selected:text-primary-content",
  "rac-disabled:opacity-50 rac-disabled:cursor-not-allowed",
  controlFocusRing
);

// Heights track the shared control sizes so a single-line segment lines up with
// the selects; multi-line content (a name over a value) grows past the minimum.
const itemSize: Record<ButtonSize, string> = {
  sm: "min-h-6 px-2 py-1 text-xs",
  md: "min-h-8 px-3 py-1.5 text-sm",
};

const SizeContext = createContext<ButtonSize>("md");

export interface ToggleGroupProps
  extends Omit<RACToggleButtonGroupProps, "className" | "children"> {
  /** Visible label rendered above the group (wired via `aria-labelledby`). */
  label?: string;
  /** Accessible name when there's no visible `label`. */
  "aria-label"?: string;
  size?: ButtonSize;
  /** Classes for the group surface (e.g. a min width). */
  className?: string;
  children: ReactNode;
}

export function ToggleGroup({
  label,
  size = "md",
  className,
  children,
  ...props
}: ToggleGroupProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1">
      {/* Label stays at the standard field size regardless of `size` (which sets
          segment density) so it lines up with the sibling selects' labels. */}
      {label && <GroupLabel id={labelId}>{label}</GroupLabel>}
      <SizeContext.Provider value={size}>
        <RACToggleButtonGroup
          aria-labelledby={label ? labelId : undefined}
          className={cx(groupSurface, className)}
          {...props}
        >
          {children}
        </RACToggleButtonGroup>
      </SizeContext.Provider>
    </div>
  );
}

export interface ToggleGroupItemProps {
  /** Identifies the item within the group's `selectedKeys`. */
  id: Key;
  isDisabled?: boolean;
  className?: string;
  children: ReactNode;
}

/** One segment of a {@link ToggleGroup}; inherits the group's size. */
export function ToggleGroupItem({
  id,
  isDisabled,
  className,
  children,
}: ToggleGroupItemProps) {
  const size = useContext(SizeContext);
  return (
    <RACToggleButton
      id={id}
      isDisabled={isDisabled}
      className={cx(itemBase, itemSize[size], className)}
    >
      {children}
    </RACToggleButton>
  );
}
