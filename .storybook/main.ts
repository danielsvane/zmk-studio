import path from "path";
import type { StorybookConfig } from "@storybook/react-vite";

const INDEX_CSS = path.resolve(process.cwd(), "src/index.css");

/**
 * Tailwind (v3 + PostCSS) only registers the source files it scanned at
 * startup as dependencies of index.css, so a *newly created* component/story
 * never invalidates the generated stylesheet — its classes are missing until a
 * full restart re-globs. This plugin re-triggers the Tailwind pass by
 * invalidating index.css whenever a source file is added or removed.
 */
const tailwindNewFileFix = {
  name: "tailwind-new-file-css-invalidation",
  configureServer(server: any) {
    const invalidate = (file: string) => {
      if (!/\.(tsx?|jsx?|mdx)$/.test(file)) return;
      const mod = [...server.moduleGraph.idToModuleMap.values()].find(
        (m: any) => m.file === INDEX_CSS
      );
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "update", updates: [] });
        server.ws.send({ type: "full-reload" });
      }
    };
    server.watcher.on("add", invalidate);
    server.watcher.on("unlink", invalidate);
  },
};

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-links",
    "@storybook/addon-docs",
    "@chromatic-com/storybook",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = config.plugins ?? [];
    config.plugins.push(tailwindNewFileFix);
    return config;
  },
};
export default config;
