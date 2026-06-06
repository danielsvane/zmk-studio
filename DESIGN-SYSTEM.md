# Design system

The conventions every form/control in this app follows. **Read this before
building or restyling UI, and update it in the same PR when a rule changes** —
it's the source of truth, and the code below is where each rule actually lives.

Spacing between clickable elements and a consistent, generous hit-target size
are load-bearing: they directly affect how easily someone can use the app.
Treat them as correctness, not polish.

## Where it lives

- **`src/misc/controlStyles.ts`** — shared style tokens (single source of truth;
  change a token here and it moves everywhere).
- **`src/misc/Field.tsx`** — field layout + label/description/error primitives.
- **`tailwind.config.js`** — the `control` spacing unit, the color tokens.
- Components: `src/misc/{Button,Select,TextField,ToggleGroup,Checkbox,PickerShell}.tsx`.

## Hit targets — 48px

Every **primary interactive element is one `control` tall = 48px**
(`spacing.control` = `3rem` in `tailwind.config.js`, used as
`h-control` / `min-h-control`). This covers Button, Select/Combobox triggers,
TextField inputs, ToggleGroup segments, and keyboard keys — they all line up at
one height. It clears the WCAG 2.5.5 (AAA) 44px minimum with margin.

`size` (`sm` | `md`) tunes **text/padding density only, never height** — see
`controlSizeStyles` (both sizes are `h-control`).

**Checkbox** (`Checkbox.tsx`): the whole label row is the 48px target
(`min-h-control`, the text is clickable), while the visible box stays ~20px.
Decided deliberately over making the box itself 48px.

## Spacing — one `gap`, never per-element margins

- **`gap-4` between separate form fields** (each label+control+description unit).
  Put a single `gap-4` on the column; don't add margins to individual fields.
  This is the spacing `PickerShell`'s controls column uses, so forms that embed
  a picker (the layers drawer, the combo editor) stay uniform top to bottom.
- **`gap-1.5` inside a field** (label → control → description/error). Exposed as
  `fieldColumn` in `Field.tsx`; every field provider uses it.

## Tokens (`controlStyles.ts`)

- `controlSurface` — the filled-input look: `bg-base-100` fill + `base-line`
  hairline border + color transition. Used by the Select/Combobox triggers and
  the TextField input.
- `selectableCard` (`base` + `resting` / `selected`) — a selectable sidebar row,
  styled as a **borderless nav row, not a tile**: transparent at rest with a
  subtle hover fill, and a primary tint + primary text when selected (the
  active-row signal). Deliberately *not* the `controlSurface` look (filled tile +
  hairline border + chevron) — that read as a Select/input rather than a menu
  item. Compose `base` with `resting`/`selected` (a computed boolean for plain
  lists, or react-aria's `isSelected` render prop). Backs `SidebarCard`
  (Combos/Behaviours) and the layer picker — keep the three sidebars looking
  alike by reusing it, not re-rolling the classes. The alternatives weighed
  before landing on this live in `Ideation/SidebarItemIdeas` in Storybook.
- `controlFocusRing` — the accessible focus ring (react-aria
  `data-focus-visible`); shared so everything rings identically.
- `controlDisabled` — shared disabled treatment.
- `controlSizeStyles` / `controlPadX` — per-size height+text / horizontal padding.
- `buttonStyles({variant, size, …})` — the button-like surface, reused by Button
  and anything that should look like a button.

### Color tokens (`tailwind.config.js`, all theme-aware `light-dark()`)

- `base-100` — input/control fill (a shade lighter than the panel it sits on).
- `base-200` — panel / sidebar surface.
- `base-300` — app background (`#15191e` in dark).
- `base-line` — **the hairline edge for every control border/divider.** Use this,
  never a hardcoded `border-white/15` (which is invisible on a light surface).
- `primary` / `primary-content` — selected/active fill + its text. `primary`
  carries an `<alpha-value>` slot, so `bg-primary/15` gives a tint (used by the
  selected `SidebarCard`); bare `bg-primary`/`border-primary` stay fully opaque.
  Reserve the tint for static states — for button hover/press still use
  `brightness-*`, not `/opacity`, so solid fills don't go translucent.
  `base-100/200/300` have no alpha slot — always `brightness-*` for those.
- `action` / `action-content` — the blue **call-to-action** fill (the blue end
  of the ZMK logo, `#0b69c6`) + white, used by the primary button
  (`variant="primary"`: Apply, modal OK/Save, the Download button). Kept distinct
  from `primary` so a page's main *action* doesn't read like a *selected*
  element — together they're the two ends of the logo gradient. Don't reach for
  it directly — use `<Button variant="primary">`; the mapping lives in
  `controlStyles.ts`.
- `base-content` — default text. Written with an `<alpha-value>` slot, so it
  **does** take opacity modifiers: `bg-base-content/40` gives a muted surface
  that contrasts with the panel in both themes (~2.3:1) where the
  near-identical `base-100/200/300` fills can't. Used by the combo-list preview
  keys (`Key.tsx` `variant="preview"`).

## Components — prefer these over raw `<input>`/`<select>`

Don't re-roll control markup or styling. Build on these (all on
react-aria-components, so labels/descriptions/errors and focus management are
wired for you):

| Need | Use |
| --- | --- |
| Field layout (label → control → description/error) | `Field` + `fieldColumn` (`Field.tsx`) |
| Group label / non-field group | `GroupLabel` / `LabeledGroup` (`Field.tsx`) |
| Text / number input | `TextField` (`TextField.tsx`) |
| Dropdown (short list) | `Select` (`Select.tsx`) |
| Filtering dropdown (long list) | `Combobox` (`Select.tsx`) |
| Segmented single/multi select | `ToggleGroup` + `ToggleGroupItem` (`ToggleGroup.tsx`) |
| Boolean | `Checkbox` (`Checkbox.tsx`) |
| Action | `Button` (`Button.tsx`) |
| Collapsible section (advanced/secondary fields) | `Disclosure` (`Disclosure.tsx`) |
| Two-region picker (controls + canvas) | `PickerShell` (`PickerShell.tsx`) |
| Selectable master-list row (sidebar → detail) | `SidebarCard` (`SidebarCard.tsx`) |
| Dialog / modal | `GenericModal` (`GenericModal.tsx`) |

`GenericModal` is a native `<dialog>` on the `base-200` panel surface (so it
matches the header and sidebars) with three slots: `title` (rendered as the
standard `text-lg font-medium` heading), `children` (body), and `actions`
(a right-aligned `justify-end gap-3` footer — drop `<Button>`s straight in).
Don't hand-roll the heading or the button row; pass them as slots so every
dialog lines up. Open/close is driven by `useModalRef` (`misc/useModalRef.ts`).

`Field` must render **inside** the react-aria provider (`RACTextField`,
`RACSelect`, …) — that's where the aria wiring context exists. The provider
carries `fieldColumn`; `Field` just orders the pieces within it.

### Raw inputs not yet migrated

Adopt the components above when you next touch these:
`keyboard/LayerPicker.tsx`, `behaviors/ParameterValuePicker.tsx`.

## Verifying UI changes

There's no mock RPC transport — the live app (`npm run dev`) can't render the
editor without connected hardware. So **verify components in Storybook**, not
the live app. Add or extend a `*.stories.tsx` for the variant you changed
(selected/empty/long-label/…) if none covers it.

Use the `shoot` script — it owns the whole sequence (start/reuse Storybook,
wait for the story to actually render, screenshot), so you don't re-derive it:

```sh
npm run shoot -- --list            # every story id
npm run shoot -- --list combo      # ids matching "combo"
npm run shoot -- <story-id> ...    # screenshot each → prints the PNG path(s)
```

Then read the PNG(s) it prints. It starts Storybook on first use and **leaves
it running**, so repeat calls are instant. Script: `scripts/shoot-story.mjs`.

Gotchas it already handles, so you don't trip on them again:
- Storybook `--quiet` never prints a `Local:` line — poll the port, don't grep.
- Stories compile on demand (Vite); the first hit shows a spinner. Wait for
  `body.sb-show-main`, not a fixed delay, `wait --text` (flaky), or
  `--load networkidle` (HMR holds a socket open).
- Story iframe URL: `iframe.html?id=<kebab-title>--<kebab-story>&viewMode=story`.
- Stories render dark (the app's default theme).

**The script is the source of truth — fix it, don't route around it.** If
`shoot` is flaky, slow, or fails (a new Storybook version, a changed ready
signal, an agent-browser quirk), improve the script so the next person gets the
fix for free; don't quietly fall back to hand-running agent-browser, which just
lets the recipe rot. When you change how verification works, update the script
and this section together — this is the map to it.

## Adding a new pattern

If something here doesn't cover your case, add the new pattern to the **shared
tokens/components** (not ad-hoc classes on one screen), then document it here in
the same change. Keep this file and `controlStyles.ts` in agreement.
