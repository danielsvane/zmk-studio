# Old-fork port backlog

Tracking work that exists in our **other** zmk-studio fork but has not (yet)
been ported into this clone (the `combos` branch).

- **This clone:** `/home/daniel/projects/zmk_studio_combos/zmk-studio` (branch `combos`)
  - `origin` → `zmkfirmware/zmk-studio` (a **shallow** clone, root commit `f949d5e`, ≈ upstream PR #161)
  - `danielsvane` → `git@github.com:danielsvane/zmk-studio.git`
- **Old fork:** `/home/daniel/projects/zmk-studio` (full history)
  - `origin` → `danielsvane/zmk-studio`, `upstream` → `zmkfirmware/zmk-studio`

To inspect anything below, run git commands in the **old fork** path.

---

## Already ported (this session, on `combos`)

| Commit | Summary |
|--------|---------|
| `24d0c62` | fix: prevent keys vanishing on fast hover (stable GPU layer) |
| `aedc89b` | feat: render lucide icons for HID usages |
| `dc7f3ad` | feat: show both params of a binding on the key |
| `923f284` | perf: tree-shake lucide icon imports (1,501 kB → 682 kB) |
| `755c550` | style: bump hover zoom to scale-150 |
| `7cebd0f` | feat: caps-lock icon + distinguish backspace/forward-delete |

Sources in the old fork: the **icons feature** (`feat/use-icons-from-hid-overrides`)
and **"Some stuff with HID"** (`stuff` branch tip `d5ef5d3`).

## Already upstream (do NOT port — present in this clone via upstream)
- PR **#141** — key-layout/animation refactor (`preserve-3d` + `translateZ` hover,
  `tailwind` `xs` font override). Old-fork dev branch: `simplify-key-layout-and-animations`.
- PR **#157** — resting-state headers + `behavior-short-names.json`. Old-fork dev
  branch: `202511_add_header_no_hover` (committed part).
- "Use button for accessibility" (`d4dcc54`) — this clone's `Key.tsx` already uses `<button>`.

---

## Still hanging — candidates to port

### 1. Dynamic header auto-scaling (`ScaledText`)  — biggest remaining piece
- **Where:** **uncommitted** working-tree change in old fork on branch
  `202511_add_header_no_hover`, file `src/keyboard/Key.tsx`.
  - View: `git -C /home/daniel/projects/zmk-studio diff -- src/keyboard/Key.tsx`
- **What:** a `ScaledText` component that measures text width and applies a
  `transform: scale()` so long headers shrink to fit the key instead of being
  truncated.
- **Caveat:** overlaps with this clone's upstream approach (`behavior-short-names.json`
  shortening). Needs reconciling — decide whether scaling replaces or complements
  the short-name lookup. Best done together with #2 (both touch header rendering).

### 2. Hover-reveal of full behavior name
- **Where:** `202511_add_header_no_hover` (the two-`div` header approach).
- **What:** show the *shortened* header at rest and fade in the **full** behavior
  name on hover (e.g. "Bootloadr" → "Bootloader", "Key Press" appears on hover).
- **Context:** upstream #157 consolidated to a single always-visible header and
  **dropped** the hover reveal. This restores it. (This is the behavior noticed
  missing — see the "Key Press on hover" screenshot from the original session.)
- Pairs with #1.

### 3. Expanded HID label set  (partial port)
- **Where:** old fork's `src/hid-usage-name-overrides.json` (~380 lines; richest on
  the `stuff` branch).
- **What:** we merged only the **icon** fields into this clone's curated 85-line json.
  The old fork also had many additional / different short/med/long label entries.
- **Decision needed:** which extra labels (if any) are worth bringing over without
  regressing upstream's curation.

### 4. Copyright year → 2025  (trivial)
- **Where:** branch `update-copyright-year-2025`, commit `289b4bf`,
  file `src/AppFooter.tsx`. One-line footer year change.

### 5. Hover ring color tweak  (probably already covered)
- **Where:** branch `simplify-key-layout-and-animations`, commit `4068e1a`
  ("Changed ring color on hover to light gray").
- **Status:** this clone already uses `hover:ring-gray-300`. Likely a no-op;
  confirm before doing anything.

---

## Old-fork branch map (for reference)
- `feat/use-icons-from-hid-overrides` ⊂ `develop` ⊂ `stuff`  (`stuff` has all HID work)
- `simplify-key-layout-and-animations` = dev branch for #141 (upstream) + ring color + button
- `202511_add_header_no_hover` = dev branch for #157 (upstream) + uncommitted `ScaledText`
- `update-copyright-year-2025` = footer year bump
- `main` = at #161, identical to upstream

## Suggested order when resuming
1. **#1 + #2 together** (header rendering — design how scaling + hover-reveal coexist
   with the upstream short-name scheme).
2. **#3** (label set — pick desired entries).
3. **#4**, then confirm/close **#5**.
