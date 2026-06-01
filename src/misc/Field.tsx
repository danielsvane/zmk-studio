import { useId, type ReactNode } from "react";
import {
  Label as RACLabel,
  Text as RACText,
  FieldError as RACFieldError,
  type LabelProps,
  type TextProps,
  type FieldErrorProps,
} from "react-aria-components";
import { cx, type ButtonSize } from "./controlStyles";

/**
 * Shared form-field building blocks.
 *
 * react-aria associates a label, description, and error with an input via
 * context (id/aria-describedby are wired automatically) as long as these are
 * rendered *inside* the field provider (TextField, Select, …). These are the
 * styled versions — the project standard for labelling any form control.
 *
 * Layout convention: wrap the field provider with `flex flex-col gap-1` and
 * render `<FieldLabel/>`, the control, then `<FieldDescription/>` /
 * `<FieldErrorMessage/>` in that order.
 */

const fieldLabelStyles: Record<ButtonSize, string> = {
  md: "text-sm font-medium text-base-content",
  sm: "text-xs font-medium text-base-content",
};

export interface FieldLabelProps extends LabelProps {
  size?: ButtonSize;
}

/** Label for a form control. Matches the control's text size. */
export function FieldLabel({ size = "md", className, ...props }: FieldLabelProps) {
  return <RACLabel className={cx(fieldLabelStyles[size], className)} {...props} />;
}

export interface GroupLabelProps {
  id?: string;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/**
 * A label for a *group* of controls — a plain `<span>` (not a `<label>`, which
 * targets a single control). Style-matches {@link FieldLabel}; pair its `id`
 * with the group's `aria-labelledby` so the group is named for AT.
 */
export function GroupLabel({ id, size = "md", className, children }: GroupLabelProps) {
  return (
    <span id={id} className={cx(fieldLabelStyles[size], className)}>
      {children}
    </span>
  );
}

export interface LabeledGroupProps {
  /** Visible label, rendered above the group in the same style as {@link FieldLabel}. */
  label: string;
  size?: ButtonSize;
  /** Classes for the inner `role="group"` container that wraps the children. */
  className?: string;
  children: ReactNode;
}

/**
 * A visibly-labelled `role="group"` for controls that aren't react-aria field
 * providers — the key grid and other non-selection surfaces. Mirrors the
 * `flex flex-col gap-1` + {@link FieldLabel} layout the field components use, and
 * wires the label to the group via `aria-labelledby` so it reads the same to AT.
 */
export function LabeledGroup({
  label,
  size = "md",
  className,
  children,
}: LabeledGroupProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1">
      <GroupLabel id={labelId} size={size}>
        {label}
      </GroupLabel>
      <div role="group" aria-labelledby={labelId} className={className}>
        {children}
      </div>
    </div>
  );
}

/** Muted helper text below a control (slot="description" wires aria-describedby). */
export function FieldDescription({ className, ...props }: TextProps) {
  return (
    <RACText
      slot="description"
      className={cx("text-xs text-base-content opacity-60", className)}
      {...props}
    />
  );
}

/** Validation error text; rendered by react-aria only when the field is invalid. */
export function FieldErrorMessage({
  className,
  ...props
}: Omit<FieldErrorProps, "className"> & { className?: string }) {
  return (
    <RACFieldError className={cx("text-xs text-red-500", className)} {...props} />
  );
}
