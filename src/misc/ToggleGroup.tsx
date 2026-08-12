import { createContext, useContext, useId, type ReactNode } from "react";
import {
  ToggleButtonGroup as RACToggleButtonGroup,
  ToggleButton as RACToggleButton,
  type ToggleButtonGroupProps as RACToggleButtonGroupProps,
  type Key,
} from "react-aria-components";

import { cx, controlDisabled, type ButtonSize } from "./controlStyles";
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

// Segments ring on the INSIDE (negative offset) rather than taking the shared
// outset `controlFocusRing`. The group clips to its rounded corners with
// `overflow-hidden`, which eats an outset ring on the group's own edges but not
// on the edge facing the next segment — the surviving sliver reads as the
// selected fill bleeding across the divider. On a selected segment the ring
// switches to `primary-content` (the same token as its label), since a
// `primary` ring drawn inside a `primary` fill is invisible.
const itemFocusRing = cx(
  "rac-focus-visible:outline rac-focus-visible:outline-2",
  "rac-focus-visible:-outline-offset-2 rac-focus-visible:outline-primary",
  "rac-selected:rac-focus-visible:outline-primary-content"
);

const itemBase = cx(
  "flex items-center justify-center gap-0.5 font-medium whitespace-nowrap",
  "cursor-pointer select-none text-base-content bg-base-100",
  "transition-[background-color,filter,color]",
  "rac-hover:brightness-110",
  "rac-selected:bg-primary rac-selected:text-primary-content",
  controlDisabled,
  itemFocusRing
);

// Every segment is at least one `control` (48px) hit target so it lines up with
// the selects and keys; multi-line content (a name over a value) grows past the
// minimum. `size` only tunes text/padding density, not the height.
const itemSize: Record<ButtonSize, string> = {
  sm: "min-h-control px-2 py-1 text-xs",
  md: "min-h-control px-3 py-1.5 text-base",
};

interface GroupConfig {
  size: ButtonSize;
  /** Whether segments stretch to fill the row (`flex-1`) or hug their content. */
  fill: boolean;
}
const GroupContext = createContext<GroupConfig>({ size: "md", fill: true });

export interface ToggleGroupProps
  extends Omit<RACToggleButtonGroupProps, "className" | "children"> {
  /** Visible label rendered above the group (wired via `aria-labelledby`). */
  label?: string;
  /** Accessible name when there's no visible `label`. */
  "aria-label"?: string;
  /** Muted helper text rendered below the group (matches a field description). */
  description?: ReactNode;
  size?: ButtonSize;
  /**
   * When `true` (default) the segments stretch to divide the row equally. Set
   * `false` to size each segment to its own content and let the group hug it,
   * leaving the rest of the row empty (e.g. the modifier / key-category rows).
   */
  fill?: boolean;
  /** Classes for the group surface (e.g. a min width). */
  className?: string;
  children: ReactNode;
}

export function ToggleGroup({
  label,
  description,
  size = "md",
  fill = true,
  className,
  children,
  ...props
}: ToggleGroupProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className="flex flex-col gap-1">
      {/* Label stays at the standard field size regardless of `size` (which sets
          segment density) so it lines up with the sibling selects' labels. */}
      {label && <GroupLabel id={labelId}>{label}</GroupLabel>}
      <GroupContext.Provider value={{ size, fill }}>
        <RACToggleButtonGroup
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          // `w-fit` collapses the surface to its content when not filling; the
          // flex-col parent would otherwise stretch it to the full width.
          className={cx(groupSurface, !fill && "w-fit max-w-full", className)}
          {...props}
        >
          {children}
        </RACToggleButtonGroup>
      </GroupContext.Provider>
      {description && (
        <span id={descriptionId} className="text-xs text-base-content opacity-60">
          {description}
        </span>
      )}
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
  const { size, fill } = useContext(GroupContext);
  return (
    <RACToggleButton
      id={id}
      isDisabled={isDisabled}
      className={cx(itemBase, fill && "flex-1", itemSize[size], className)}
    >
      {children}
    </RACToggleButton>
  );
}
