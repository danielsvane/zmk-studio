import {
  Label as RACLabel,
  Text as RACText,
  FieldError as RACFieldError,
  type LabelProps,
  type TextProps,
  type FieldErrorProps,
} from "react-aria-components";
import { cx, type ButtonSize } from "./Button";

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

export const fieldLabelStyles: Record<ButtonSize, string> = {
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
