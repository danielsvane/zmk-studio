import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
