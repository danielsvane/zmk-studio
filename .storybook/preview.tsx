import "../src/index.css";
import { useLayoutEffect } from "react";
import type { Preview } from "@storybook/react";
import { themes } from "@storybook/theming";

const preview: Preview = {
  // Toolbar toggle for the app's light/dark themes. The app themes via the
  // CSS `light-dark()` function gated on `color-scheme`, so flipping
  // `color-scheme` is what actually swaps every theme token (base-*, primary…).
  globalTypes: {
    theme: {
      description: "App color scheme",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme !== "light";
      // Theme the iframe body itself so the dark background fills the whole
      // canvas while each story still sizes to its own content (no 100vh box).
      useLayoutEffect(() => {
        const { documentElement, body } = document;
        documentElement.style.colorScheme = dark ? "dark" : "light";
        body.classList.add("bg-base-100", "text-base-content");
      }, [dark]);
      return <Story />;
    },
  ],
  parameters: {
    // The decorator owns the background, so disable the backgrounds addon grid
    // to avoid a conflicting swatch behind our themed wrapper.
    backgrounds: { disable: true },
    // Dark theme for the autodocs page chrome (the white page around stories).
    docs: { theme: themes.dark },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
