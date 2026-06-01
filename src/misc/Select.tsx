import {
  Select as RACSelect,
  Button as RACButton,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  UNSTABLE_Virtualizer as Virtualizer,
  UNSTABLE_ListLayout as ListLayout,
  type SelectProps as RACSelectProps,
  type Key,
} from "react-aria-components";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  "min-w-[var(--trigger-width)] p-1",
  "rounded border border-base-300 bg-base-100 text-base-content shadow-lg"
);

// The list scrolls (not the whole popover) so a searchable Select's search
// field can stay pinned above it.
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
  /** Show a search field at the top of the list that filters options by text. */
  searchable?: boolean;
  /** Placeholder for the search field (when `searchable`). */
  searchPlaceholder?: string;
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

// `object` (not a structural type) so these stay assignable to the component's
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

export function Select<T extends object>({
  items,
  label,
  description,
  errorMessage,
  size = "md",
  placeholder = "Select…",
  searchable = false,
  searchPlaceholder = "Search…",
  rowHeight,
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

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // react-aria's Select auto-focuses its listbox on open; pull focus back to
  // the search field (next frame, after that effect runs) so the user can type
  // immediately.
  useEffect(() => {
    if (!searchable || !isOpen) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [searchable, isOpen]);

  // A ListLayout drives virtualization (only mount the visible rows). It's a
  // stateful object, so keep one instance alive across renders and just feed it
  // the row height. Undefined when not virtualizing.
  const layout = useMemo(
    () => (rowHeight ? new ListLayout({ rowHeight }) : undefined),
    [rowHeight]
  );

  const allItems = useMemo(() => [...items], [items]);
  const visibleItems = useMemo(() => {
    if (!searchable || !query.trim()) return allItems;
    const q = query.trim().toLowerCase();
    return allItems.filter((i) => itemText(i).toLowerCase().includes(q));
  }, [allItems, query, searchable, itemText]);

  // Only take over the open state when searchable, so we can clear the query on
  // close; otherwise leave react-aria's Select fully uncontrolled.
  const openProps = searchable
    ? {
        isOpen,
        onOpenChange: (open: boolean) => {
          setIsOpen(open);
          if (!open) setQuery("");
        },
      }
    : {};

  const listBox = (
    <ListBox
      ref={listRef}
      items={visibleItems}
      className={cx(listBoxStyles, searchable && "mt-1")}
      renderEmptyState={
        searchable
          ? () => (
              <div className="px-2 py-1.5 text-sm opacity-60">No matches</div>
            )
          : undefined
      }
    >
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
  );

  // ArrowDown from the search field hands keyboard focus to the list.
  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <RACSelect
      className={cx("flex flex-col gap-1", className)}
      {...openProps}
      {...props}
    >
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
        {searchable && (
          <div className="flex items-center gap-2 border-b border-base-300 px-2 pb-1">
            <Search aria-hidden className="size-4 shrink-0 opacity-60" />
            <input
              ref={searchRef}
              autoFocus
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:opacity-60"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </div>
        )}
        {layout ? (
          <Virtualizer layout={layout}>{listBox}</Virtualizer>
        ) : (
          listBox
        )}
      </Popover>
    </RACSelect>
  );
}
