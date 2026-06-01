import { hid_usage_from_page_and_id, type HidUsagePage } from "../hid-usages";

/**
 * Data + resolution for the tabbed key picker (Basic / Symbols / Numpad / Media
 * / Intl). Each {@link KeyCell} carries the *full* HID usage it binds — page+id
 * plus any intrinsic modifier bits in the high byte. The Symbols tab uses that
 * to encode shifted faces (e.g. `{` = `[` | Left Shift) as single cells, so the
 * user picks the glyph directly instead of knowing it's Shift+[.
 *
 * The tabs partition values so each is reachable from exactly one tab — Basic
 * holds no-modifier keys, Symbols holds shift-bearing keys (disjoint by the
 * shift bit), Numpad/Media/Intl are disjoint by id/page. {@link resolveCell}
 * relies on that to deterministically pick which tab an existing binding opens
 * in. The search combobox above the grid stays the universal fallback, so
 * nothing is reachable *only* through a tab.
 */

export interface KeyCell {
  /** Full HID usage value: (page<<16)+id, plus intrinsic modifier bits (high byte). */
  usage: number;
  /** Glyph override. Needed for symbol cells, whose base id's label is the unshifted key. */
  label?: string;
}

export interface KeyTab {
  id: string;
  label: string;
  /** Usage page the tab's cells live on — used for availability filtering. */
  page: number;
  rows: KeyCell[][];
}

const KEYBOARD_PAGE = 7;
const CONSUMER_PAGE = 12;

// Modifier flag bits live in the high byte (value >> 24). Symbols carry an
// intrinsic Left Shift; either shift bit is treated as "shift present".
const LEFT_SHIFT = 0x02;
const RIGHT_SHIFT = 0x20;
const SHIFT_MASK = LEFT_SHIFT | RIGHT_SHIFT;

/** Low 24 bits — page+id with any modifier flags masked off. */
const USAGE_MASK = 0x00ffffff;

const kb = (id: number) => hid_usage_from_page_and_id(KEYBOARD_PAGE, id);
const cons = (id: number) => hid_usage_from_page_and_id(CONSUMER_PAGE, id);

/** A base keyboard cell (no modifiers); label comes from the override table. */
const key = (id: number): KeyCell => ({ usage: kb(id) });
/** A shifted-symbol cell: base keyboard key + intrinsic Left Shift, with a glyph. */
const sym = (id: number, label: string): KeyCell => ({
  usage: kb(id) | (LEFT_SHIFT << 24),
  label,
});
/** A consumer-page cell (media); label comes from the override table. */
const media = (id: number): KeyCell => ({ usage: cons(id) });

// Basic: the standard US layout, base (unshifted) keys only. (Cells 47/48 now
// label as [ / ] — see hid-usage-name-overrides.json — with { } moving to the
// Symbols tab.)
const BASIC: KeyTab = {
  id: "basic",
  label: "Basic",
  page: KEYBOARD_PAGE,
  rows: [
    [41, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69], // Esc F1..F12
    [53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42], // ` 1..0 - = Bksp
    [43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49], // Tab QWERTY [ ] \
    [57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40], // Caps ASDF ; ' Enter
    [225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229], // Shift ZXCV , . / Shift
    [224, 227, 226, 44, 230, 231, 228, 80, 81, 82, 79], // Ctrl GUI Alt Space ... arrows
  ].map((row) => row.map(key)),
};

// Symbols: the shifted faces of the keys above, each its own pickable glyph.
const SYMBOLS: KeyTab = {
  id: "symbols",
  label: "Symbols",
  page: KEYBOARD_PAGE,
  rows: [
    [
      sym(53, "~"),
      sym(30, "!"),
      sym(31, "@"),
      sym(32, "#"),
      sym(33, "$"),
      sym(34, "%"),
      sym(35, "^"),
      sym(36, "&"),
      sym(37, "*"),
      sym(38, "("),
      sym(39, ")"),
      sym(45, "_"),
      sym(46, "+"),
    ],
    [sym(47, "{"), sym(48, "}"), sym(49, "|")],
    [sym(51, ":"), sym(52, '"')],
    [sym(54, "<"), sym(55, ">"), sym(56, "?")],
  ],
};

// Numpad: the keypad block, laid out like a calculator.
const NUMPAD: KeyTab = {
  id: "numpad",
  label: "Numpad",
  page: KEYBOARD_PAGE,
  rows: [
    [83, 84, 85, 86], // Num / * -
    [95, 96, 97, 87], // 7 8 9 +
    [92, 93, 94], //     4 5 6
    [89, 90, 91, 88], // 1 2 3 Enter
    [98, 99, 103], //    0 . =
  ].map((row) => row.map(key)),
};

// Media: consumer-page transport / volume / brightness (page 12).
const MEDIA: KeyTab = {
  id: "media",
  label: "Media",
  page: CONSUMER_PAGE,
  rows: [
    [182, 205, 181, 183], // Prev Play/Pause Next Stop
    [234, 226, 233], //      Vol- Mute Vol+
    [112, 111], //           Bright- Bright+
  ].map((row) => row.map(media)),
};

// Intl / extras: international and editing keys not on the basic layout.
const INTL: KeyTab = {
  id: "intl",
  label: "Intl",
  page: KEYBOARD_PAGE,
  rows: [
    [70, 71, 72], //   PrtSc ScrLk Pause
    [73, 74, 75], //   Ins Home PgUp
    [76, 77, 78], //   Del End PgDn
    [101, 118, 100], // App Menu Non-US\
  ].map((row) => row.map(key)),
};

// Display order. tabsForUsagePages() prunes to what the descriptor allows.
const ALL_TABS: KeyTab[] = [BASIC, SYMBOLS, NUMPAD, MEDIA, INTL];

/** base usage (page+id, no mods) → shifted glyph, for symbol-aware rendering. */
export const SYMBOL_GLYPHS: ReadonlyMap<number, string> = new Map(
  SYMBOLS.rows.flat().map((cell) => [cell.usage & USAGE_MASK, cell.label!])
);

/** True when `flags` (high-byte modifier bits) carries only a single Shift. */
export function isShiftOnly(flags: number): boolean {
  return flags === LEFT_SHIFT || flags === RIGHT_SHIFT;
}

function cellInRange(cell: KeyCell, page: HidUsagePage): boolean {
  const id = cell.usage & 0xffff;
  return id >= (page.min ?? 0) && id <= (page.max ?? Number.MAX_SAFE_INTEGER);
}

/**
 * The tabs available for a given set of usage pages — a tab is kept only when
 * its page is offered and at least one cell falls within that page's range.
 * Cells outside the range are dropped (so Numpad/Intl shrink to fit a low
 * `keyboardMax`, and Media disappears when the consumer page is absent/limited).
 */
export function tabsForUsagePages(usagePages: HidUsagePage[]): KeyTab[] {
  return ALL_TABS.flatMap((tab) => {
    const page = usagePages.find((p) => p.id === tab.page);
    if (!page) return [];
    const rows = tab.rows
      .map((row) => row.filter((cell) => cellInRange(cell, page)))
      .filter((row) => row.length > 0);
    return rows.length > 0 ? [{ ...tab, rows }] : [];
  });
}

export interface ResolvedCell {
  tabId: string;
  /** The cell to highlight (its full usage, incl. intrinsic shift for symbols). */
  cellUsage: number;
  /** Modifier flags the cell owns intrinsically (the symbol's shift), in flag space. */
  intrinsicFlags: number;
}

/**
 * Which tab + cell an existing value opens in. Most-specific match wins: a
 * shift-bearing value whose base id has a Symbols glyph resolves to that glyph
 * (its shift is intrinsic); otherwise the base id resolves in whatever tab
 * holds it (all modifiers residual). Returns null for a value no tab contains
 * (reachable only via search) — the caller keeps the current tab, no highlight.
 */
export function resolveCell(
  value: number | undefined,
  tabs: KeyTab[]
): ResolvedCell | null {
  if (value === undefined) return null;

  const flags = (value >> 24) & 0xff;
  const base = value & USAGE_MASK;

  if (flags & SHIFT_MASK) {
    const symbols = tabs.find((t) => t.id === "symbols");
    const want = base | (LEFT_SHIFT << 24); // symbol cells always use Left Shift
    const cell = symbols?.rows.flat().find((c) => c.usage === want);
    if (cell) {
      // Whichever shift(s) the value carried are owned by the symbol; anything
      // else (e.g. an added Ctrl) stays residual.
      return { tabId: "symbols", cellUsage: cell.usage, intrinsicFlags: flags & SHIFT_MASK };
    }
  }

  for (const tab of tabs) {
    if (tab.id === "symbols") continue;
    const cell = tab.rows.flat().find((c) => c.usage === base);
    if (cell) return { tabId: tab.id, cellUsage: cell.usage, intrinsicFlags: 0 };
  }

  return null;
}
