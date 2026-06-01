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
      colors: {
        primary:
          "light-dark(oklch(49.12% 0.3096 285.75), oklch(65.69% 0.196 285.75))",
        "primary-content":
          "light-dark(oklch(0.89824 0.06192 285.75), oklch(0.13138 0.0392 285.75))",
        secondary:
          "light-dark(oklch(69.71% 0.329 342.55), oklch(74.8% 0.26 342.55))",
        accent:
          "light-dark(oklch(76.76% 0.184 183.61), oklch(74.51% 0.167 183.61))",
        "base-content": "light-dark(#1f2937, #A6ADBB)",
        "base-100": "light-dark(oklch(100% 0 0), #1d232a)",
        "base-200": "light-dark(#F2F2F2, #191e24)",
        "base-300": "light-dark(#E5E6E6, #15191e)",
        // Subtle hairline for input/segment borders and dividers. Theme-aware so
        // it stays visible in both schemes (a flat white/15 vanishes on a white
        // surface in light mode). Single source of truth for every control edge.
        "base-line": "light-dark(rgb(0 0 0 / 0.12), rgb(255 255 255 / 0.15))",
      },
    },

    fontFamily: {
      keycap: ["Inter", "system-ui"],
    },
  },
  plugins: [contQueries, trac({ prefix: "rac" })],
};
