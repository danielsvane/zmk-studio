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

## Interaction states — hover & active

Two app-wide rules so every menu, list, and nav reads the same way.

**Hover = lighten, never darken** — one rule everywhere; only the *mechanism*
follows the surface (you can't `brightness`-lighten a transparent button, and you
can't stack a translucent veil on top of a filled one):

- **Transparent surfaces** — ghost `Button`s (the header tabs + bare icon
  buttons), the sidebar rows, the Select/Combobox option rows, and `DropdownMenu`
  items — take the **`bg-base-content/10`** lighten veil: a translucent overlay of
  the text color that reads the same on any surface (popover `base-100`, sidebar
  `base-200`, header). One shared token, so they all hover alike.
- **Filled surfaces** — `Button` primary/secondary/danger, the Select/Combobox
  trigger, `ToggleGroup` segments — lighten via **`brightness-110`**, a filter on
  top of the existing fill so a solid color never goes translucent.

Don't reach for a darkening `bg-base-300`/`bg-base-200` hover. (Press is the
exception that *does* darken — `brightness-95` — but that's the tactile "pushed"
feedback, distinct from hover.)

**Active/selected = two tiers, scaled to importance.**

- **Quiet (nav)** — `bg-primary/15 text-primary` (a medium primary tint). For
  persistent "where am I" state that *isn't* the content the user is looking at:
  the current header section tab (`Button`/`ToggleButton variant="ghost"`,
  `rac-selected`) and the current row in the Layers/Combos/Behaviours sidebars
  (`selectableCard.selected`). These two now match.
- **Loud (in-content selection)** — solid `bg-primary text-primary-content`. For
  selection that *is* the subject and must be unmistakable: the option you're
  picking in a `Select`/`Combobox`, a `ToggleGroup` segment, a selected key.

Rule of thumb: if the highlighted thing is the content, go loud; if it's just
telling the user which screen/section they're on, go quiet.

## Tokens (`controlStyles.ts`)

- `controlSurface` — the filled-input look: `bg-base-100` fill + `base-line`
  hairline border + color transition. Used by the Select/Combobox triggers and
  the TextField input.
- `selectableCard` (`base` + `resting` / `selected`) — a selectable sidebar row,
  styled as a **borderless nav row, not a tile**: transparent at rest with the
  standard lighten hover, and the *quiet* active-nav tint when selected (see
  **Interaction states** below). Deliberately *not* the `controlSurface` look
  (filled tile + hairline border + chevron) — that read as a Select/input rather
  than a menu item. Compose `base` with `resting`/`selected` (a computed boolean
  for plain lists, or react-aria's `isSelected` render prop). Backs `SidebarCard`
  (Combos/Behaviours) and the layer picker — keep the three sidebars looking
  alike by reusing it, not re-rolling the classes. The alternatives weighed
  before landing on this live in `Ideation/SidebarItemIdeas` in Storybook.
- `popoverSurface` — the floating panel shared by every dropdown: the
  Select/Combobox option lists and `DropdownMenu`. `base-100` fill, `base-300`
  edge, lift shadow, floored at the trigger width. Callers add their own inner
  padding (`py-1`/`p-1`). Change the popover look here and it moves everywhere.
- `menuItem` — a menu/action row, the menu-item sibling of `buttonStyles`: one
  `h-control` (48px) hit target, left-aligned, with room for a leading icon and
  the standard lighten hover/focus. Backs `DropdownMenuItem`. Styles a react-aria
  `MenuItem` directly rather than nesting a `<Button>` (which would double up
  focus/press).
- `controlFocusRing` — the accessible focus ring (react-aria
  `data-focus-visible`); shared so everything rings identically.
- `controlDisabled` — shared disabled treatment.
- `controlSizeStyles` / `controlPadX` — per-size height+text / horizontal padding.
  `controlPadX` is the **input-like** inset (Select trigger, TextField: `px-3`/`px-2`);
  buttons run one step wider (`px-4`/`px-3`, private to `buttonStyles`).
- `buttonStyles({variant, size, …})` — the button-like surface, reused by Button
  and anything that should look like a button.

### Color tokens (`tailwind.config.js`, all theme-aware `light-dark()`)

- `base-100` — input/control fill (a shade lighter than the panel it sits on).
- `base-200` — panel / sidebar surface.
- `base-300` — app background (`#15191e` in dark).

**These three are an elevation scale, so read them as one.** Shadows barely
register on a near-black surface, so in dark mode a *lighter fill* is what
communicates "different layer" (Practical UI, p.122). Lighter = closer to the
viewer, so the rung a surface sits on is not a free choice:

| Tier | Token | Dark | What belongs here |
| --- | --- | --- | --- |
| Base | `base-300` | `#15191e` | the app background |
| Raised | `base-200` | `#191e24` | panels, sidebars, header, modals |
| Overlay | `base-100` | `#1d232a` | anything **floating**: `popoverSurface`, `tooltipSurface`, and control fills |

A floating surface must sit one rung above whatever it covers. The bug this rule
exists to prevent: `tooltipSurface` used to be `base-200` — the exact fill of the
modal it floats over — so only the hairline separated the two and the bubble read
as part of the panel. The step between rungs is deliberately subtle (~1.06:1 in
dark), so the `base-line` border and the shadow still carry real weight; keep all
three rather than leaning on the fill alone. Light mode's counterpart is white on
grey, which needs no special handling.
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
- `base-content-strong` — **heading** foreground, one step above `base-content`,
  for a title that must out-rank the body beneath it (`GenericModal`'s `<h2>`).
  The two themes step by different amounts on purpose, because their headroom
  differs: on `base-200`, dark body text sits at 7.4:1 against a 16.8:1 ceiling
  (2.25× to spend) while light body already sits at 13.1:1 against 18.8:1
  (1.43×). Dark therefore goes near-white (13.8:1, a 1.85× step), light goes
  gray-900 (15.8:1, 1.21×). Don't "fix" this to one flat value or a dark-only
  override — either leaves one theme with no hierarchy. Dark stops short of pure
  white deliberately: at 16.8:1 large text haloes on these near-black panels.

**Headings pair color with weight.** A heading takes `base-content-strong` *and*
`font-semibold` (see `GenericModal`) — never color alone. Color is the signal
that disappears first: on a dim or sunlit screen, or for a low-vision reader,
weight and size are what survive. This is also why the modal title still carries
`text-lg`.

**Errors pair color with a glyph,** for the same reason. `FieldErrorMessage` and
`ErrorMessage` (`Field.tsx`) both render a `CircleAlert` before the text in
`text-red-500`, at `text-sm` — an error is the most urgent line on screen and
shouldn't be set smaller than the prose it interrupts. Use `FieldErrorMessage`
inside a field provider: it renders only while that field is invalid and
react-aria wires it to the control through `aria-describedby`. Use
`ErrorMessage role="alert"` for a failure that arrives *after* an action (see
`ConnectModal`'s failed connect), where there's no field for AT to reach it
through, so it has to announce itself.

**Weight looks heavier in the desktop app, and that isn't a style bug.**
`Inter.woff2` is the variable font and both engines interpolate the real `wght`
instance, so a `font-semibold` heading *is* the same 600 in the browser and in
Tauri (measured — identical glyph advances and ink coverage). What differs is
antialiasing: WebKitGTK takes its default from fontconfig and commonly lands on
subpixel (LCD) rendering, whose RGB fringes fatten every stem, where a browser
follows the desktop's grayscale setting. `index.css` pins
`-webkit-font-smoothing: antialiased` on `body` for that reason. So don't chase
the difference with a heavier or lighter `font-*` class — the weight is already
right.

## Components — prefer these over raw `<input>`/`<select>`

Don't re-roll control markup or styling. Build on these (all on
react-aria-components, so labels/descriptions/errors and focus management are
wired for you):

| Need | Use |
| --- | --- |
| Field layout (label → control → description/error) | `Field` + `fieldColumn` (`Field.tsx`) |
| Group label / non-field group | `GroupLabel` / `LabeledGroup` (`Field.tsx`) |
| Error text outside a field (a failed action) | `ErrorMessage` (`Field.tsx`) |
| Text / number input | `TextField` (`TextField.tsx`) |
| Dropdown (short list) | `Select` (`Select.tsx`) |
| Filtering dropdown (long list) | `Combobox` (`Select.tsx`) |
| Segmented single/multi select | `ToggleGroup` + `ToggleGroupItem` (`ToggleGroup.tsx`) |
| Boolean | `Checkbox` (`Checkbox.tsx`) |
| Explain a setting the label can't | `InfoTip` (`InfoTip.tsx`) |
| Action | `Button` (`Button.tsx`) |
| Action that navigates (download, external page) | `LinkButton` (`Button.tsx`) |
| Collapsible section (advanced/secondary fields) | `Disclosure` (`Disclosure.tsx`) |
| Two-region picker (controls + canvas) | `PickerShell` (`PickerShell.tsx`) |
| Selectable master-list row (sidebar → detail) | `SidebarCard` (`SidebarCard.tsx`) |
| Action menu off a trigger | `DropdownMenu` + `DropdownMenuItem` (`DropdownMenu.tsx`) |
| Inline list of choices (in a form or modal, not a popover) | `ListBox` framed with `controlSurface`, rows on `menuItem` — see `ConnectModal`'s `DeviceList` |
| Dialog / modal | `GenericModal` (`GenericModal.tsx`) |

**An inline choice list is a control, so it wears a control's frame.** The device
picker is the worked example: `controlSurface` (the `base-100` input fill +
hairline) around a react-aria `ListBox`, with rows on the shared `menuItem` token
— the same 48px action row `DropdownMenu` uses, leading icon included. Unframed
rows sitting directly on a `base-200` modal read as static text, which is exactly
how that list looked before. Use `selectionMode="none"` + `onAction` when picking
a row *does* something immediately (connect, open) rather than setting a value
to confirm later, give it `renderEmptyState` (an empty list is a normal outcome —
say what to do about it), and cap its height so the list scrolls, not the dialog.
Reach for `selectableCard` instead when the row is persistent nav state (the
sidebars), and for `DropdownMenu` when the choices belong in a popover.

`GenericModal` is a native `<dialog>` on the `base-200` panel surface (so it
matches the header and sidebars) with three slots: `title` (rendered as the
standard `text-lg font-semibold` heading), `children` (body), and `actions`
(a right-aligned `justify-end gap-3` footer — drop `<Button>`s straight in).
Don't hand-roll the heading or the button row; pass them as slots so every
dialog lines up. Open/close is driven by `useModalRef` (`misc/useModalRef.ts`).

**Pin the width of a modal whose body changes.** A `<dialog>` sizes to its
content, so a modal that swaps between states — a list that fills and empties on
refresh, an error line that appears under it, a different body on desktop than
in the browser — resizes under the user on every one of them. Give those a
`w-full max-w-*` pair (`ConnectModal` is the worked example: `w-full max-w-md`),
not `max-w-*` alone, which only caps the jumping. `w-full` is the half that keeps
it inside a viewport narrower than the cap.

**Action buttons carry a leading `icon`.** Every action `<Button>` in a modal
footer or form — Add/Save/Cancel/Apply/Close and friends — pairs its label with
a `lucide-react` icon (`icon={<X aria-hidden />}`, `aria-hidden` since the label
already names it). One verb → one icon, app-wide, so the same action reads the
same everywhere:

- **Cancel / Close** → `X`
- **Save / Apply** (confirm an edit) → `Check`
- **Add** (confirm/create) → `Plus` (matches the list `Add …` buttons)
- **Delete** → `Trash2`
- **Restore / reset** → `RotateCcw`

Pick the icon by what the button *does*, not its wording — a destructive
confirm ("Replace and Save", "Delete layer") still takes `Trash2`/`Check` by
action, not a new glyph. Reuse a verb above before inventing one.

**Footer pairing:** the dismiss (Cancel/Close) is `variant="ghost"`, the confirm
is `variant="primary"` (or `variant="danger"` when it destroys). Ghost rather
than `secondary` for the dismiss because `secondary`'s `bg-base-200` fill is the
same color as the modal panel — it read as a borderless label with no hover
affordance; ghost is transparent too but carries the standard lighten-veil hover.

**Overlays inside a modal.** `showModal()` puts the `<dialog>` in the browser's
**top layer**, which paints above the whole normal stacking context regardless of
`z-index`. A react-aria overlay (Tooltip, Select/Combobox popover, DropdownMenu,
InfoTip) portals to `document.body` by default — outside the dialog, therefore
*under* it. `GenericModal` fixes this once for every modal, and both halves are
needed:

1. `UNSAFE_PortalProvider` (from `react-aria`) gives overlays a portal container
   **inside** the `<dialog>`, putting them in the same top layer.
2. `overflow-visible` on the `<dialog>` overrides the UA default `overflow:
   auto`, which would otherwise clip the overlay to the dialog's box — a bubble
   hanging off a control near the edge of a small dialog is mostly *outside* it.

Consequence: a modal with more content than fits should own an inner
`overflow-auto` region (the pattern the app's panels already use — see
`index.css`) rather than rely on the dialog scrolling. Note `react-aria` is
pinned to an **exact** version in `package.json` on purpose:
`react-aria-components` depends on an exact version too, and a mismatch gives npm
two copies of `react-aria` — two separate `PortalContext`s, and the provider
silently stops reaching RAC's overlays.

**Unavailable vs disabled.** When a control is unusable and the *reason* is worth
reading, use `<Button isUnavailable>` wrapped in a `Tooltip`, not `isDisabled`. A
truly `disabled` button fires no pointer events and leaves the tab order, so
neither a hover nor a Tab can ever reach the explanation — the tooltip is dead
markup. `isUnavailable` renders `aria-disabled` instead (same `controlDisabled`
look, still focusable and hoverable) and swallows `onPress`. Keep plain
`isDisabled` when the cause is obvious from context — nothing selected yet, no
unsaved changes to save. The `ConnectModal` BLE button is the worked example:
Web Bluetooth is Linux+Chromium-only, and listing it as unavailable-with-a-reason
beats omitting it, which left no way to tell "unsupported here" from "my keyboard
isn't wireless". Prefer `placement="bottom"` for a paragraph-long bubble over a
small dialog, so it doesn't cover the thing it's explaining.

**A button that navigates is a `LinkButton`, never `<a><Button/></a>`.** Same
`buttonStyles` surface, but a real `<a>`, so it keeps link semantics a `<button>`
can't have: Enter follows it, cmd/middle-click opens a new tab, "Copy link
address" works. Wrapping a `Button` in an anchor to fake it fails three ways, and
the third is the one that bites: `<a>`'s content model forbids interactive
descendants (non-conforming HTML); the anchor and the button are each focusable,
so one visual control costs two tab stops and the first draws the focus ring on
an unstyled wrapper; and **keyboard activation silently stops navigating**.
`usePress` calls `preventDefault()` on the Enter/Space keydown of a
`type="button"` button (`shouldPreventDefaultUp` returns true for every button
that isn't submit/reset), which suppresses the browser's native activation
behavior — so no `click` is dispatched to bubble to the anchor. The pointer path
deliberately waits for the *real* click, so the mouse still works and the wrapper
looks fine right up until someone tabs to it. Note RAC renders a `<span>` when
`href` is missing or `isDisabled` is set, so don't pass `href={undefined}` and
expect a control — drop the item instead (see `availableLinks` in
`DownloadPage.tsx`).

**Picking a `Button` variant.** The one gotcha is that `secondary`'s fill *is*
`base-200`, the panel color — so it only reads as a button when it sits on
`base-300` (the app background). On a modal, sidebar, or header, use `tertiary`.

| Variant | Look | Use for |
| --- | --- | --- |
| `primary` | solid `action` blue | the one call-to-action (Apply, Save, Add, Download) |
| `secondary` | `base-200` fill, no edge | a supporting action **on the `base-300` app background** |
| `tertiary` | transparent + `base-line` hairline | a supporting action **on a `base-200`/`base-100` panel**, where `secondary` would vanish (the `ConnectModal` transport picker) |
| `ghost` | transparent | nav (header tabs), bare icon buttons, modal dismiss |
| `link` | inline `primary` text | inline in prose |
| `danger` | solid red | destructive confirms |

Tertiary carries no fill of its own, so its edge does the work on *any* surface,
`base-100` popovers included — that's why it's an outline rather than a
`bg-base-100` tile, which would vanish in a popover and duplicate the
`controlSurface` input look. Compare the variants against all three surfaces in
`Misc/Button` → `OnPanelSurfaces` in Storybook.

`Field` must render **inside** the react-aria provider (`RACTextField`,
`RACSelect`, …) — that's where the aria wiring context exists. The provider
carries `fieldColumn`; `Field` just orders the pieces within it.

**Explaining a setting.** When the label can't carry the explanation (the ZMK
behaviour configs are full of these), pass an `<InfoTip>` to the field's `info`
prop — `Field`/`TextField`/`Select` put it on the label row *beside* the
`<label>`, never inside it: a button nested in a label also activates the control
the label points at. Controls that aren't field providers (`Checkbox`, a
`GroupLabel`ed group) place it themselves in a `flex items-center gap-1` row. The
copy lives with the feature, not the component — see `behaviours/fieldHelp.ts`.

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
