import { addons } from "@storybook/manager-api";
import { themes } from "@storybook/theming";

// Dark theme for Storybook's own UI shell (sidebar, toolbar, addon panels).
// Story rendering + the docs page are themed separately in preview.tsx.
addons.setConfig({
  theme: themes.dark,
});
