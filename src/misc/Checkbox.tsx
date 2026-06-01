import { type ReactNode } from "react";
import {
  Checkbox as RACCheckbox,
  type CheckboxProps as RACCheckboxProps,
} from "react-aria-components";
import { Check, Minus } from "lucide-react";
import { cx, controlDisabled, type ButtonSize } from "./controlStyles";

/**
 * Boolean checkbox styled to match the rest of the controls.
 *
 * The hit target is the whole label row: a flex row at least one `control`
 * (48px) tall, so clicking anywhere on the box *or* its text toggles it and the
 * touch area clears the WCAG 2.5.5 minimum — while the box itself stays a normal
 * ~20px square. The box reuses the shared `base-line` edge and fills with
 * `primary` when checked, like the toggle-group segments.
 *
 * Built on react-aria's Checkbox: it owns the hidden input and exposes its state
 * as `data-*` on the root, which the box reads via `group-data-[…]` variants.
 */
const labelTextSize: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-base",
};

const rootStyles = cx(
  "group inline-flex min-h-control items-center gap-2 select-none cursor-pointer",
  "font-medium text-base-content",
  controlDisabled
);

// The visible box. Its checked/hover/focus state mirror the root's data-* via
// group-data variants (react-aria sets them on the root that holds rootStyles).
const boxStyles = cx(
  "flex size-5 shrink-0 items-center justify-center rounded-sm",
  "border border-base-line bg-base-100 text-primary-content",
  "transition-[background-color,border-color,filter]",
  "group-data-[hovered]:brightness-110",
  "group-data-[selected]:border-primary group-data-[selected]:bg-primary",
  "group-data-[indeterminate]:border-primary group-data-[indeterminate]:bg-primary",
  "group-data-[focus-visible]:outline group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-primary"
);

export interface CheckboxProps
  extends Omit<RACCheckboxProps, "children" | "className"> {
  /** Label shown beside the box (and part of the clickable row). */
  children: ReactNode;
  size?: ButtonSize;
  className?: string;
}

export function Checkbox({
  children,
  size = "md",
  className,
  ...props
}: CheckboxProps) {
  return (
    <RACCheckbox
      className={cx(rootStyles, labelTextSize[size], className)}
      {...props}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <span className={boxStyles} aria-hidden>
            {isIndeterminate ? (
              <Minus className="size-3.5" strokeWidth={3} />
            ) : isSelected ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : null}
          </span>
          {children}
        </>
      )}
    </RACCheckbox>
  );
}
