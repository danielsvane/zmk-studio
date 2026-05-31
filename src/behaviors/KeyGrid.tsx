import { cx, controlFocusRing } from "../misc/Button";
import { HidUsageLabel } from "../keyboard/HidUsageLabel";
import { hid_usage_from_page_and_id, hid_usage_get_label } from "../hid-usages";

const KEYBOARD_PAGE = 7;

// Rows of HID Keyboard (page 0x07) usage IDs laid out roughly like a normal
// keyboard. Deliberately not staggered/sized like real keycaps — a plain wrapped
// grid is enough to pick a key fast. Rarer keys (media, keypad, locks, …) stay in
// the search dropdown the grid sits above.
const ROWS: number[][] = [
  // Esc F1..F12
  [41, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
  // ` 1 2 3 4 5 6 7 8 9 0 - =  Bksp
  [53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42],
  // Tab Q W E R T Y U I O P [ ] \
  [43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49],
  // Caps A S D F G H J K L ; ' Enter
  [57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40],
  // Shift Z X C V B N M , . / Shift
  [225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229],
  // Ctrl GUI Alt Space AltGr GUI Ctrl  ← ↓ ↑ →
  [224, 227, 226, 44, 230, 231, 228, 80, 81, 82, 79],
];

export interface KeyGridProps {
  /** Currently bound usage (page + id), with any modifier flags already masked off. */
  value?: number;
  /** Called with the full page+id usage for the clicked key. */
  onPick: (usage: number) => void;
}

function remove_prefix(s?: string) {
  return s?.replace(/^Keyboard /, "");
}

const cellStyles = cx(
  "inline-flex h-8 min-w-8 items-center justify-center rounded px-1 text-xs font-medium",
  "cursor-pointer select-none border border-white/10 transition-[background-color,filter]",
  "[&_svg]:size-4",
  controlFocusRing
);

export const KeyGrid = ({ value, onPick }: KeyGridProps) => {
  return (
    <div className="flex flex-col gap-1">
      {ROWS.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-1">
          {row.map((id) => {
            const usage = hid_usage_from_page_and_id(KEYBOARD_PAGE, id);
            const selected = value === usage;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                aria-label={remove_prefix(hid_usage_get_label(KEYBOARD_PAGE, id))}
                onClick={() => onPick(usage)}
                className={cx(
                  cellStyles,
                  selected
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content rac-hover:brightness-110 hover:brightness-110"
                )}
              >
                <HidUsageLabel hid_usage={usage} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
