/// <reference types="vite/client" />

// Tauri injects this into the webview; its absence is how the app tells a
// browser build from the desktop one. Declared here, in the project's ambient
// declarations, rather than `declare global` inside whichever component
// happened to need it first — several do now, and a second one shouldn't have
// to reach into another module's augmentation to typecheck.
interface Window {
  __TAURI_INTERNALS__?: object;
}

/**
 * The app's version, substituted at build time by Vite's `define` from
 * `package.json` (which the config asserts matches `src-tauri/tauri.conf.json`,
 * the version the updater compares). A constant, not a variable: it is replaced
 * in the source text before bundling, so it costs nothing at runtime and cannot
 * be reassigned.
 */
declare const __APP_VERSION__: string;
