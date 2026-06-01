import { type InputHTMLAttributes, type ReactNode } from "react";
import {
  TextField as RACTextField,
  Input as RACInput,
  type TextFieldProps as RACTextFieldProps,
} from "react-aria-components";
import {
  cx,
  controlSurface,
  controlSizeStyles,
  controlPadX,
  controlFocusRing,
  controlDisabled,
  type ButtonSize,
} from "./controlStyles";
import { Field, fieldColumn } from "./Field";

/**
 * Form text input, styled to match {@link Select}/{@link Combobox} and Button.
 *
 * The same filled `controlSurface` (base-100 fill + base-line hairline) at the
 * shared `h-control` height and focus ring, so a TextField lines up pixel-for-
 * pixel with the selects, toggle groups, and buttons around it. Built on
 * react-aria's TextField, so the label/description/error wire up `for` /
 * `aria-describedby` automatically — same field contract as the rest of the app.
 *
 * `value`/`onChange` are react-aria's string-based pair (onChange gives the raw
 * string); callers that hold a number keep their own parse on the way in/out.
 */
const inputStyles = cx(
  controlSurface,
  "w-full rounded outline-none placeholder:opacity-60",
  controlFocusRing,
  controlDisabled
);

export interface TextFieldProps
  extends Omit<RACTextFieldProps, "children" | "className"> {
  /** Field label rendered above the input. */
  label?: ReactNode;
  /** Muted helper text below the input. */
  description?: ReactNode;
  /** Validation message; shown only when the field is invalid. */
  errorMessage?: ReactNode;
  size?: ButtonSize;
  placeholder?: string;
  /** HTML input type — e.g. "text" (default) or "number". */
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  /** Native input attrs passed through (min/max/step/inputMode/…). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  /** Wrapper (the field column) className. */
  className?: string;
  /** Input element className (e.g. `w-full`, `font-mono`). */
  inputClassName?: string;
}

export function TextField({
  label,
  description,
  errorMessage,
  size = "md",
  placeholder,
  type = "text",
  inputProps,
  className,
  inputClassName,
  ...props
}: TextFieldProps) {
  return (
    <RACTextField className={cx(fieldColumn, className)} {...props}>
      <Field
        label={label}
        description={description}
        errorMessage={errorMessage}
        size={size}
      >
        <RACInput
          type={type}
          placeholder={placeholder}
          className={cx(
            inputStyles,
            controlSizeStyles[size],
            controlPadX[size],
            inputClassName
          )}
          {...inputProps}
        />
      </Field>
    </RACTextField>
  );
}
