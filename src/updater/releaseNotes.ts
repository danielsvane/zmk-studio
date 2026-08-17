/**
 * Turns a release's notes into something readable in a dialog.
 *
 * The updater's `body` is whatever `latest.json` carries, and our manifest
 * passes the release-please changelog section through verbatim. That's Markdown
 * written for GitHub, so shown raw it opens with a line like
 *
 *   ## [0.4.1](https://github.com/…/compare/v0.4.0...v0.4.1) (2026-08-12)
 *
 * and every bullet ends in a commit link, which is mostly URL by character
 * count. Rendering real Markdown would mean a new dependency for one dialog;
 * this instead strips the handful of constructs release-please actually emits
 * and hands back lines the modal can style.
 *
 * Anything unrecognised falls through as plain text, so a hand-written release
 * note is degraded rather than mangled.
 */
export type NoteLine =
  | { kind: "heading"; text: string }
  | { kind: "item"; text: string }
  | { kind: "text"; text: string };

/** `[label](url)` keeps its label; a bare `<url>` keeps the url. */
const stripLinks = (s: string) =>
  s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<(https?:[^>]*)>/g, "$1");

/** `**bold**` / `__bold__` / `*em*` / `_em_` lose their markers. */
const stripEmphasis = (s: string) =>
  s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*]+)\*/g, "$1$2")
    .replace(/(^|\s)_([^_]+)_/g, "$1$2");

export function parseReleaseNotes(body: string | undefined): NoteLine[] {
  if (!body) return [];

  return body
    .split("\n")
    .map((raw) => {
      const line = stripLinks(raw).trim();
      if (!line) return null;

      // Classify *before* stripping emphasis, because the two syntaxes collide:
      // a bullet is `* text` and emphasis is `*text*`, so on a line like
      // `* *scope* thing` the emphasis pass pairs the bullet marker with the
      // opening marker of the emphasis and leaves a stray `*` behind. Deciding
      // what the line is first, then cleaning only its content, keeps them apart.
      const heading = /^#{1,6}\s+(.*)$/.exec(line);
      if (heading) {
        return { kind: "heading" as const, text: stripEmphasis(heading[1]).trim() };
      }

      const item = /^[*-]\s+(.*)$/.exec(line);
      if (item) {
        return { kind: "item" as const, text: stripEmphasis(item[1]).trim() };
      }

      return { kind: "text" as const, text: stripEmphasis(line).trim() };
    })
    .filter((l): l is NoteLine => l !== null);
}
