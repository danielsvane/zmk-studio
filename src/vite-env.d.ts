/// <reference types="vite/client" />

// Tauri injects this into the webview; its absence is how the app tells a
// browser build from the desktop one. Declared here, in the project's ambient
// declarations, rather than `declare global` inside whichever component
// happened to need it first — several do now, and a second one shouldn't have
// to reach into another module's augmentation to typecheck.
interface Window {
  __TAURI_INTERNALS__?: object;
}
