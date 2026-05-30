import {
  Select as RACSelect,
  Button as RACButton,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  type SelectProps as RACSelectProps,
  type Key,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";
import {
  cx,
  controlSizeStyles,
  controlPadX,
  controlFocusRing,
  controlDisabled,
  type ButtonSize,
} from "./Button";
import { FieldLabel, FieldDescription, FieldErrorMessage } from "./Field";

/**
 * A single-select dropdown built on react-aria's Select.
 *
 * Looks like a *form input* (filled `base-200` with a subtle `base-300`
 * border) rather than an action Button, but shares Button's heights and focus
 * ring so it lines up with everything else. Options are templateable: pass
 * `renderItem` to put an icon / title+description in each row (see
 * `SelectItemContent`), otherwise items render their label.
 */

// Filled-with-subtle-border input surface. Uses base-100 so it sits a shade
// lighter than the base-200 editor panel it lives on (matching the app). Theme
// tokens are light-dark() with no alpha slot, so hover brightens the fill.
const triggerBase = cx(
  "inline-flex items-center justify-between gap-2 rounded text-left font-medium",
  "cursor-pointer select-none text-base-content bg-base-100 border border-white/15",
  "transition-[background-color,filter,border-color]",
  "rac-hover:brightness-110",
  controlFocusRing,
  controlDisabled
);

const popoverStyles = cx(
  "min-w-[var(--trigger-width)] max-h-60 overflow-auto p-1",
  "rounded border border-base-300 bg-base-100 text-base-content shadow-lg"
);

const itemStyles = cx(
  "group flex items-center gap-2 px-2 py-1.5 text-sm outline-none",
  "cursor-pointer select-none rounded-sm",
  "rac-hover:bg-base-300 rac-focus:bg-base-300",
  "rac-selected:bg-primary rac-selected:text-primary-content",
  "rac-disabled:opacity-50 rac-disabled:cursor-not-allowed"
);

/** The standard rich-option layout: optional icon + title + optional description. */
export interface SelectItemContentProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}
export function SelectItemContent({
  icon,
  title,
  description,
}: SelectItemContentProps) {
  return (
    <>
      {icon && (
        <span className="flex shrink-0 items-center [&_svg]:size-4">{icon}</span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
        {description && (
          <span className="truncate text-xs opacity-60">{description}</span>
        )}
      </span>
    </>
  );
}

export interface SelectProps<T extends object>
  extends Omit<RACSelectProps<T>, "children" | "className"> {
  /** Options to render. Each needs a stable key (see `itemKey`, default `id`). */
  items: Iterable<T>;
  /** Field label rendered above the trigger. */
  label?: ReactNode;
  /** Muted helper text below the trigger. */
  description?: ReactNode;
  /** Validation message; shown only when the field is invalid. */
  errorMessage?: ReactNode;
  size?: ButtonSize;
  placeholder?: string;
  /** Render one option's content. Default: `itemText(item)`. */
  renderItem?: (item: T) => ReactNode;
  /** Render the trigger's selected value. Default: same as `renderItem`. */
  renderValue?: (item: T) => ReactNode;
  /** Stable key for an item. Default: `item.id`. */
  itemKey?: (item: T) => Key;
  /** Accessible/typeahead text for an item. Default: `item.label` ?? `item.name`. */
  itemText?: (item: T) => string;
  /** Wrapper (the field column) className. */
  className?: string;
  /** Trigger button className (e.g. `w-full`, `min-w-40`). */
  triggerClassName?: string;
}

function defaultText(item: any): string {
  return String(item?.label ?? item?.name ?? "");
}
function defaultKey(item: any): Key {
  return item?.id ?? defaultText(item);
}

export function Select<T extends object>({
  items,
  label,
  description,
  errorMessage,
  size = "md",
  placeholder = "Select…",
  renderItem,
  renderValue,
  itemKey = defaultKey,
  itemText = defaultText,
  className,
  triggerClassName,
  ...props
}: SelectProps<T>) {
  const item = renderItem ?? ((i: T) => itemText(i));
  const value = renderValue ?? item;

  return (
    <RACSelect className={cx("flex flex-col gap-1", className)} {...props}>
      {label && <FieldLabel size={size}>{label}</FieldLabel>}
      <RACButton
        className={cx(
          triggerBase,
          controlSizeStyles[size],
          controlPadX[size],
          triggerClassName
        )}
      >
        <SelectValue<T> className="flex min-w-0 items-center gap-2 truncate">
          {({ selectedItem, isPlaceholder }) =>
            isPlaceholder || !selectedItem ? (
              <span className="opacity-60">{placeholder}</span>
            ) : (
              value(selectedItem as T)
            )
          }
        </SelectValue>
        <ChevronDown aria-hidden className="shrink-0 opacity-60" />
      </RACButton>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
      <Popover className={popoverStyles}>
        <ListBox items={items} className="outline-none">
          {(data) => (
            <ListBoxItem
              id={itemKey(data)}
              textValue={itemText(data)}
              className={itemStyles}
            >
              {item(data)}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </RACSelect>
  );
}
