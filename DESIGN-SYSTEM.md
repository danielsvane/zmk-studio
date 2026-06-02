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
- `primary` / `primary-content` — selected/active fill + its text. (`primary`,
  `base-100/200/300` have no alpha slot — use `brightness-*` for hover/press,
  not `/opacity`.)
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

`Field` must render **inside** the react-aria provider (`RACTextField`,
`RACSelect`, …) — that's where the aria wiring context exists. The provider
carries `fieldColumn`; `Field` just orders the pieces within it.

### Raw inputs not yet migrated

Adopt the components above when you next touch these:
`keyboard/LayerPicker.tsx`, `behaviors/ParameterValuePicker.tsx`.

## Verifying UI changes

There's no mock transport — verify in **Storybook + agent-browser**, not the
live app. Add/extend a story for the component you changed and screenshot it.

## Adding a new pattern

If something here doesn't cover your case, add the new pattern to the **shared
tokens/components** (not ad-hoc classes on one screen), then document it here in
the same change. Keep this file and `controlStyles.ts` in agreement.
