/** @type {import('tailwindcss').Config} */
import trac from "tailwindcss-react-aria-components";
import contQueries from "@tailwindcss/container-queries";

export default {
  content: ["./index.html", "./download.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui"],
      },
      fontSize: {
        "2xs": "0.4rem",
      },
      spacing: {
        // Comfortable single hit target shared by every interactive control
        // (Select/Combobox triggers, ToggleGroup segments, keyboard keys, and
        // Buttons). 48px clears the WCAG 2.5.5 (AAA) 44px target-size minimum
        // with margin and lines them all up at one height. Single source of
        // truth — exposed as h-control / min-h-control / w-control / min-w-control.
        control: "3rem",
      },
      colors: {
        // `<alpha-value>` slot so opacity modifiers work (`bg-primary/15` powers
        // the selected SidebarCard tint). Bare `bg-primary`/`border-primary`/
        // `text-primary` still default to full opacity.
        // Light value is a chosen electric violet (#a000ff ≈ oklch(57% 0.297 304));
        // `rgb(… / <alpha-value>)` (like `action`) keeps the opacity slot that
        // `bg-primary/15` relies on. White `primary-content` clears WCAG AA on it
        // (~5.3:1). Dark stays as-is.
        primary:
          "light-dark(rgb(160 0 255 / <alpha-value>), oklch(65.69% 0.196 285.75 / <alpha-value>))",
        // Light value is pure white (like `action-content`): the old tinted
        // near-white lavender washed out against the `primary` fill. Dark keeps
        // the near-black tint (dark text reads on the lighter dark-mode primary).
        "primary-content":
          "light-dark(#ffffff, oklch(0.13138 0.0392 285.75))",
        // Call-to-action fill for primary buttons (Apply, modal OK/Save, the
        // Download button): the blue end of the ZMK logo (#0b69c6) + white.
        // Kept distinct from `primary` so a page's main action reads differently
        // from a selected/active element. White label hits APCA Lc ~82.
        // `<alpha-value>` slot for future tints.
        action: "rgb(11 105 198 / <alpha-value>)",
        "action-content": "#ffffff",
        secondary:
          "light-dark(oklch(69.71% 0.329 342.55), oklch(74.8% 0.26 342.55))",
        accent:
          "light-dark(oklch(76.76% 0.184 183.61), oklch(74.51% 0.167 183.61))",
        // Foreground/text token. Written with an `<alpha-value>` slot (rather
        // than a flat hex) so opacity modifiers work — `text-base-content`
        // stays fully opaque while `bg-base-content/40` gives a muted surface
        // that still contrasts with the panel in *both* themes (~2.3:1), which
        // the near-identical base-100/200/300 fills can't. Used by the combo
        // preview keys; see Key.tsx `variant="preview"`.
        "base-content":
          "light-dark(rgb(31 41 55 / <alpha-value>), rgb(166 173 187 / <alpha-value>))",
        // Heading foreground — one step stronger than `base-content`, for a
        // title that has to out-rank the body text beneath it (`GenericModal`'s
        // <h2>). The step is deliberately lopsided because the headroom is:
        // against the `base-200` panel, dark's body text sits at 7.4:1 with a
        // 16.8:1 ceiling (2.25x to spend) while light's already sits at 13.1:1
        // with an 18.8:1 ceiling (1.43x). So dark takes a near-white #E6E9EF
        // (13.8:1, a 1.85x step) and light takes gray-900 (15.8:1, 1.21x) —
        // both a visible promotion within their own theme, which a single flat
        // value or a dark-only override can't be. Not pure white in dark: at
        // 16.8:1 large text haloes against these near-black panels. Pair it with
        // a weight bump, never color alone — see DESIGN-SYSTEM.md.
        // No `<alpha-value>` slot; nothing tints a heading.
        "base-content-strong": "light-dark(#111827, #E6E9EF)",
        "base-100": "light-dark(oklch(100% 0 0), #1d232a)",
        "base-200": "light-dark(#F2F2F2, #191e24)",
        "base-300": "light-dark(#E5E6E6, #15191e)",
        // Subtle hairline for input/segment borders and dividers. Theme-aware so
        // it stays visible in both schemes (a flat white/15 vanishes on a white
        // surface in light mode). Single source of truth for every control edge.
        // Light alpha is 0.20 (not 0.12): near-white surfaces perceptually
        // compress the edge, so matching dark's *raw* alpha looked weaker — 0.20
        // brings light's border-vs-fill contrast (~1.59:1) level with dark's.
        "base-line": "light-dark(rgb(0 0 0 / 0.2), rgb(255 255 255 / 0.15))",
      },
    },

    fontFamily: {
      keycap: ["Inter", "system-ui"],
    },
  },
  plugins: [contQueries, trac({ prefix: "rac" })],
};
