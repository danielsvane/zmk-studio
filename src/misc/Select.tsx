import {
  Select as RACSelect,
  ComboBox as RACComboBox,
  Button as RACButton,
  Input as RACInput,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  Virtualizer,
  ListLayout,
  type SelectProps as RACSelectProps,
  type ComboBoxProps as RACComboBoxProps,
  type Key,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import {
  cx,
  controlSizeStyles,
  controlPadX,
  controlFocusRing,
  controlDisabled,
  type ButtonSize,
} from "./controlStyles";
import { FieldLabel, FieldDescription, FieldErrorMessage } from "./Field";

/**
 * Form-input-styled pickers built on react-aria.
 *
 * - `Select` — a non-filtering dropdown (react-aria Select / listbox pattern).
 *   Best for short lists where you just pick from what's shown.
 * - `Combobox` — a text field that filters a list as you type (react-aria
 *   ComboBox / combobox pattern). Best for long lists (e.g. the ~600-entry HID
 *   usage picker). DOM focus stays on the input the whole time — hovering an
 *   option only highlights it (via aria-activedescendant), so typing is never
 *   interrupted, which a Select-with-a-search-box can't guarantee.
 *
 * Both look like a *form input* (filled `base-100` with a subtle border) rather
 * than an action Button, but share Button's heights and focus ring so they line
 * up with everything else. Options are templateable: pass `renderItem` to put an
 * icon / title+description in each row (see `SelectItemContent`), otherwise rows
 * render their text.
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

// Combobox's outer surface. Same look as `triggerBase`, but it wraps a text
// input + toggle button rather than being one focusable button, so the ring is
// driven by focus-within (the input holds focus) instead of rac-focus-visible.
const comboSurface = cx(
  "flex items-center rounded font-medium",
  "text-base-content bg-base-100 border border-white/15",
  "transition-[background-color,filter,border-color]",
  "focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-primary",
  "has-[input:disabled]:opacity-50 has-[input:disabled]:cursor-not-allowed"
);

const popoverStyles = cx(
  "min-w-[var(--trigger-width)] p-1",
  "rounded border border-base-300 bg-base-100 text-base-content shadow-lg"
);

// The list scrolls within a bounded height; combined with virtualization this
// keeps a long option list cheap to open and filter.
const listBoxStyles = "max-h-60 overflow-auto outline-none";

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

// `object` (not a structural type) so these stay assignable to the components'
// `(item: T) => …` defaults for any `T extends object`; the inner cast reads the
// conventional fields an item may carry.
function defaultText(item: object): string {
  const o = item as { label?: unknown; name?: unknown };
  return String(o.label ?? o.name ?? "");
}
function defaultKey(item: object): Key {
  const o = item as { id?: Key };
  return o.id ?? defaultText(item);
}

/**
 * The shared options list: a (optionally virtualized) ListBox of templated
 * rows. Pass `layout` to virtualize — only the visible rows mount, so a long
 * list stays snappy to open and filter. `items` is set for Select; Combobox
 * omits it and lets react-aria feed the ListBox its filtered collection.
 */
function OptionsList<T extends object>({
  items,
  itemKey,
  itemText,
  renderItem,
  layout,
  emptyState,
}: {
  items?: Iterable<T>;
  itemKey: (item: T) => Key;
  itemText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  layout?: InstanceType<typeof ListLayout>;
  emptyState?: () => ReactNode;
}) {
  const list = (
    <ListBox items={items} className={listBoxStyles} renderEmptyState={emptyState}>
      {(data) => (
        <ListBoxItem
          id={itemKey(data)}
          textValue={itemText(data)}
          className={itemStyles}
        >
          {renderItem(data)}
        </ListBoxItem>
      )}
    </ListBox>
  );
  return layout ? <Virtualizer layout={layout}>{list}</Virtualizer> : list;
}

// A stable ListLayout (it's a stateful object) when `rowHeight` is set, else
// undefined (no virtualization).
function useListLayout(rowHeight?: number) {
  return useMemo(
    () => (rowHeight ? new ListLayout({ rowHeight }) : undefined),
    [rowHeight]
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
        <OptionsList<T>
          items={items}
          itemKey={itemKey}
          itemText={itemText}
          renderItem={item}
        />
      </Popover>
    </RACSelect>
  );
}

export interface ComboboxProps<T extends object>
  extends Omit<
    RACComboBoxProps<T>,
    "children" | "className" | "items" | "defaultItems"
  > {
  /** Options to render. Each needs a stable key (see `itemKey`, default `id`). */
  items: Iterable<T>;
  /** Field label rendered above the field. */
  label?: ReactNode;
  /** Muted helper text below the field. */
  description?: ReactNode;
  /** Validation message; shown only when the field is invalid. */
  errorMessage?: ReactNode;
  size?: ButtonSize;
  placeholder?: string;
  /**
   * Fixed pixel height of an option row. Setting this turns on virtualization:
   * only the visible rows are mounted, so a long list (e.g. the ~600-entry HID
   * usage picker) opens and filters instantly instead of reconciling every row.
   * Must match the rendered row height — see `itemStyles` (single line ≈ 32,
   * title+description ≈ 48). Leave unset for short lists.
   */
  rowHeight?: number;
  /** Render one option's content. Default: `itemText(item)`. */
  renderItem?: (item: T) => ReactNode;
  /** Stable key for an item. Default: `item.id`. */
  itemKey?: (item: T) => Key;
  /** Accessible/typeahead + filter text for an item. Default: `item.label` ?? `item.name`. */
  itemText?: (item: T) => string;
  /** Wrapper (the field column) className. */
  className?: string;
  /** Field surface className (e.g. `w-full`, `min-w-40`). */
  triggerClassName?: string;
}

export function Combobox<T extends object>({
  items,
  label,
  description,
  errorMessage,
  size = "md",
  placeholder = "Select…",
  rowHeight,
  renderItem,
  itemKey = defaultKey,
  itemText = defaultText,
  className,
  triggerClassName,
  ...props
}: ComboboxProps<T>) {
  const item = renderItem ?? ((i: T) => itemText(i));
  const layout = useListLayout(rowHeight);

  // Spread the iterable into a stable array so react-aria can rebuild + filter
  // the collection without re-spreading on every keystroke.
  const allItems = useMemo(() => [...items], [items]);

  return (
    <RACComboBox<T>
      className={cx("flex flex-col gap-1", className)}
      // `defaultItems` (not `items`) lets react-aria own the filtering — it
      // matches each option's textValue against what's typed (contains).
      defaultItems={allItems}
      // Opening via focus or the toggle button shows the full list; typing
      // filters. So re-opening a field with a selected value still lists
      // everything instead of just the current value.
      menuTrigger="focus"
      // Keep the popover (with the "No matches" state) open when a query
      // filters everything out, rather than snapping shut.
      allowsEmptyCollection
      {...props}
    >
      {label && <FieldLabel size={size}>{label}</FieldLabel>}
      <div
        className={cx(comboSurface, controlSizeStyles[size], triggerClassName)}
      >
        <RACInput
          placeholder={placeholder}
          className={cx(
            "min-w-0 flex-1 self-stretch bg-transparent outline-none placeholder:opacity-60",
            controlPadX[size]
          )}
        />
        <RACButton
          aria-label="Show options"
          className={cx(
            "flex shrink-0 cursor-pointer items-center self-stretch rounded-r pl-1 pr-2",
            "text-base-content/60 rac-hover:text-base-content"
          )}
        >
          <ChevronDown aria-hidden />
        </RACButton>
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
      <Popover className={popoverStyles}>
        <OptionsList<T>
          itemKey={itemKey}
          itemText={itemText}
          renderItem={item}
          layout={layout}
          emptyState={() => (
            <div className="px-2 py-1.5 text-sm opacity-60">No matches</div>
          )}
        />
      </Popover>
    </RACComboBox>
  );
}
