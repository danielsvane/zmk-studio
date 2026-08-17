import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react-swc";

const readJson = (rel: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

// One version string for the whole app, baked in at build time rather than read
// with Tauri's async `getVersion()`: this way the web build has a version too,
// it's a plain constant in Storybook, and nothing has to render an empty slot
// while a promise settles.
//
// It has to agree with `src-tauri/tauri.conf.json`, because *that* is the number
// the updater compares against `latest.json`. A UI claiming one version while
// the updater acts on another is worse than showing no version at all: it would
// offer an update you already have, or stay silent on one you don't.
// release-please bumps both together, so a mismatch means the release tooling
// broke — fail the build instead of shipping the confusion.
const { version: APP_VERSION } = readJson("./package.json");
const tauriVersion = readJson("./src-tauri/tauri.conf.json").version;
if (APP_VERSION !== tauriVersion) {
  throw new Error(
    `Version mismatch: package.json says ${APP_VERSION}, ` +
      `src-tauri/tauri.conf.json says ${tauriVersion}. ` +
      `The updater compares the tauri.conf.json version, so these must match.`
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    strictPort: true,
    fs: {
      // `@zmkfirmware/zmk-studio-ts-client` is a `file:` dependency, so
      // node_modules holds a symlink to a sibling checkout and every module
      // Vite serves from it resolves to a real path outside this project. The
      // dev server refuses those by default ("The request id … is outside of
      // Vite serving allow list") and the import fails at runtime — the RPC
      // client and its transports simply don't load. Keep the default root and
      // add the sibling.
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        fileURLToPath(new URL("../zmk-studio-ts-client", import.meta.url)),
      ],
    },
  },
  // to access the Tauri environment variables set by the CLI with information about the current target
  envPrefix: [
    "VITE_",
    "TAURI_PLATFORM",
    "TAURI_ARCH",
    "TAURI_FAMILY",
    "TAURI_PLATFORM_VERSION",
    "TAURI_PLATFORM_TYPE",
    "TAURI_DEBUG",
  ],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // include download page
    rollupOptions: {
      input: {
        main: "./index.html",
        download: "./download.html",
      },
    }
  },
});
