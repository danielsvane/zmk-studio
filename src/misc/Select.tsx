import {
  Select as RACSelect,
  ComboBox as RACComboBox,
  Button as RACButton,
  Input as RACInput,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Header,
  Collection,
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
  controlSurface,
  controlSizeStyles,
  controlPadX,
  controlFocusRing,
  controlDisabled,
  popoverSurface,
  type ButtonSize,
} from "./controlStyles";
import { Field, fieldColumn } from "./Field";

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

// The Select trigger: the shared filled-input `controlSurface`, laid out as one
// focusable button (label on the left, chevron on the right) that brightens on
// hover and rings via rac-focus-visible.
const triggerBase = cx(
  "inline-flex items-center justify-between gap-2 rounded text-left font-medium",
  "cursor-pointer select-none",
  controlSurface,
  "rac-hover:brightness-110",
  controlFocusRing,
  controlDisabled
);

// Combobox's outer surface. Same `controlSurface` look as `triggerBase`, but it
// wraps a text input + toggle button rather than being one focusable button, so
// the ring is driven by focus-within (the input holds focus) instead of
// rac-focus-visible.
const comboSurface = cx(
  "flex items-center rounded font-medium",
  controlSurface,
  "focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-primary",
  "has-[input:disabled]:opacity-50 has-[input:disabled]:cursor-not-allowed"
);

// Select: vertical padding only — the horizontal inset lives on the list so a
// full-bleed section divider can reach the popover edge without overflowing.
const selectPopoverStyles = cx(popoverSurface, "py-1");
// Combobox: uniform padding. Its list is virtualized and relies on `overflow`
// to bound the scroll port, so it keeps the original layout untouched.
const comboboxPopoverStyles = cx(popoverSurface, "p-1");

// The list scrolls within a bounded height; combined with virtualization this
// keeps a long option list cheap to open and filter.
const listBoxBase = "max-h-60 outline-none";
// Select: `px-1` is the option inset (moved off the popover); `overflow-x-clip`
// lets the edge-to-edge section divider bleed into that padding without ever
// showing a horizontal scrollbar.
const selectListBoxStyles = cx(listBoxBase, "px-1 overflow-y-auto overflow-x-clip");
// Combobox: plain `overflow-auto` so the Virtualizer can measure the scroll
// port and bound row width (clipping it here makes the list grow to full width).
const comboboxListBoxStyles = cx(listBoxBase, "overflow-auto");

// Text size is left to the caller (`itemTextSize` below): the Select dropdowns
// use `text-base`, while the virtualized Combobox keeps `text-sm` so its fixed
// `rowHeight` measurements stay correct.
const itemStyles = cx(
  "group flex items-center gap-2 px-2 py-1.5 outline-none",
  "cursor-pointer select-none rounded-sm",
  // The app's standard "lighten" hover (surface-agnostic `bg-base-content/10`,
  // shared with the sidebar rows + `menuItem`). Selected stays loud solid
  // `bg-primary` — picking an option *is* the subject, so it gets the strong tier.
  "rac-hover:bg-base-content/10 rac-focus:bg-base-content/10",
  "rac-selected:bg-primary rac-selected:text-primary-content",
  "rac-disabled:opacity-50 rac-disabled:cursor-not-allowed"
);

// Section header for a grouped options list. Muted, uppercase, and offset from
// the section above so the groups read as distinct without a hard divider.
const sectionHeaderStyles =
  "px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-base-content/50 first:pt-0.5";

// A titleless section (after the first) is set off by the classic `base-line`
// hairline instead of a label. `-mx-1` cancels the list's `px-1` so the border
// spans edge to edge (clipped at the popover edge by `overflow-x-clip`); the
// matching `px-1` keeps the items aligned with the group above.
const sectionDividerStyles = "mt-1 -mx-1 border-t border-base-line px-1 pt-1";

/** A group of options for the grouped (`sections`) list form. Give a `title`
 * to label the group with a header, or omit it to set the group off with a
 * hairline divider instead (the first group never gets a leading divider). Keys
 * must be unique across ALL sections (a react-aria collection requirement) —
 * never repeat the same option in two sections. */
export interface SelectSection<T> {
  id: Key;
  title?: string;
  items: Iterable<T>;
}

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
  sections,
  itemKey,
  itemText,
  renderItem,
  itemTextSize,
  listBoxClassName,
  layout,
  emptyState,
}: {
  items?: Iterable<T>;
  sections?: Array<SelectSection<T>>;
  itemKey: (item: T) => Key;
  itemText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  itemTextSize: string;
  listBoxClassName: string;
  layout?: InstanceType<typeof ListLayout>;
  emptyState?: () => ReactNode;
}) {
  const renderRow = (data: T) => (
    <ListBoxItem
      id={itemKey(data)}
      textValue={itemText(data)}
      className={cx(itemStyles, itemTextSize)}
    >
      {renderItem(data)}
    </ListBoxItem>
  );

  // Grouped form: one ListBoxSection per group, each either labeled with a
  // header or set off by a hairline divider. Not virtualized — the grouped
  // lists (e.g. behaviors) are short; virtualization is for the flat long lists
  // below.
  if (sections) {
    const firstSectionId = sections[0]?.id;
    return (
      <ListBox
        items={sections}
        className={listBoxClassName}
        renderEmptyState={emptyState}
      >
        {(section) => (
          <ListBoxSection
            id={section.id}
            className={cx(
              !section.title &&
                section.id !== firstSectionId &&
                sectionDividerStyles
            )}
          >
            {section.title && (
              <Header className={sectionHeaderStyles}>{section.title}</Header>
            )}
            <Collection items={section.items}>{renderRow}</Collection>
          </ListBoxSection>
        )}
      </ListBox>
    );
  }

  const list = (
    <ListBox items={items} className={listBoxClassName} renderEmptyState={emptyState}>
      {renderRow}
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
  /** Options to render as one flat list. Each needs a stable key (see
   * `itemKey`, default `id`). Ignored when `sections` is provided. */
  items?: Iterable<T>;
  /** Render options grouped into labeled sections instead of one flat list
   * (e.g. a "Recently used" group on top). Takes precedence over `items`. */
  sections?: Array<SelectSection<T>>;
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
  /** Wrapper (the field column) className. It sizes the label and description
   * too, so a width cap here wraps them with the trigger — cap the trigger
   * instead unless you mean to constrain the whole column. */
  className?: string;
  /** Trigger button className — where width belongs (`w-full max-w-sm`, `min-w-40`). */
  triggerClassName?: string;
}

export function Select<T extends object>({
  items,
  sections,
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
    <RACSelect className={cx(fieldColumn, className)} {...props}>
      <Field
        label={label}
        description={description}
        errorMessage={errorMessage}
        size={size}
      >
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
      </Field>
      <Popover className={selectPopoverStyles}>
        <OptionsList<T>
          items={items}
          sections={sections}
          itemKey={itemKey}
          itemText={itemText}
          renderItem={item}
          itemTextSize="text-base"
          listBoxClassName={selectListBoxStyles}
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
      className={cx(fieldColumn, className)}
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
      <Field
        label={label}
        description={description}
        errorMessage={errorMessage}
        size={size}
      >
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
      </Field>
      <Popover className={comboboxPopoverStyles}>
        <OptionsList<T>
          itemKey={itemKey}
          itemText={itemText}
          renderItem={item}
          itemTextSize="text-sm"
          listBoxClassName={comboboxListBoxStyles}
          layout={layout}
          emptyState={() => (
            <div className="px-2 py-1.5 text-sm opacity-60">No matches</div>
          )}
        />
      </Popover>
    </RACComboBox>
  );
}
