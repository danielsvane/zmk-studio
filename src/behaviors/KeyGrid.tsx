import { cx, controlFocusRing } from "../misc/controlStyles";
import { HidUsageLabel } from "../keyboard/HidUsageLabel";
import { hid_usage_get_label, hid_usage_page_and_id_from_usage } from "../hid-usages";
import type { KeyCell } from "./keyGridTabs";

export interface KeyGridProps {
  /** Rows of cells to render. Each cell's `usage` is the full value it binds. */
  rows: KeyCell[][];
  /** Usage of the cell to highlight (full value, incl. any intrinsic modifiers). */
  activeUsage?: number;
  /** Called with the clicked cell's full usage. */
  onPick: (usage: number) => void;
}

function remove_prefix(s?: string) {
  return s?.replace(/^Keyboard /, "");
}

const cellStyles = cx(
  "inline-flex h-control min-w-control items-center justify-center rounded px-1 text-base font-medium",
  "cursor-pointer select-none border border-base-line transition-[background-color,filter]",
  "[&_svg]:size-4",
  controlFocusRing
);

export const KeyGrid = ({ rows, activeUsage, onPick }: KeyGridProps) => {
  return (
    <div className="flex flex-col gap-1">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-1">
          {row.map((cell) => {
            const selected = cell.usage === activeUsage;
            const [page, id] = hid_usage_page_and_id_from_usage(cell.usage);
            const ariaLabel =
              cell.label ?? remove_prefix(hid_usage_get_label(page & 0xff, id));
            return (
              <button
                key={cell.usage}
                type="button"
                aria-pressed={selected}
                aria-label={ariaLabel}
                onClick={() => onPick(cell.usage)}
                className={cx(
                  cellStyles,
                  selected
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content rac-hover:brightness-110 hover:brightness-110"
                )}
              >
                {cell.label ?? <HidUsageLabel hid_usage={cell.usage} />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
