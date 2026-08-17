import { describe, expect, test } from "vitest";

import { parseReleaseNotes } from "./releaseNotes";

// The real body of the v0.4.1 manifest, copied from
// https://github.com/danielsvane/zmk-studio/releases/latest/download/latest.json
// — the exact string the updater will hand the dialog.
const REAL_BODY =
  "## [0.4.1](https://github.com/danielsvane/zmk-studio/compare/v0.4.0...v0.4.1) (2026-08-12)\n" +
  "\n" +
  "\n" +
  "### Bug Fixes\n" +
  "\n" +
  "* **download:** address the rolling release by tag, not /releases/latest " +
  "([b79cb58](https://github.com/danielsvane/zmk-studio/commit/b79cb585ea9abd5ee8a5a4a25a7d184d977a5bd1))";

describe("parseReleaseNotes", () => {
  test("renders a real release-please body with no URLs left in it", () => {
    const lines = parseReleaseNotes(REAL_BODY);

    expect(lines).toEqual([
      { kind: "heading", text: "0.4.1 (2026-08-12)" },
      { kind: "heading", text: "Bug Fixes" },
      {
        // The parens around the short sha are release-please's own, outside the
        // link, so they survive: `… ([b79cb58](url))` reads as `… (b79cb58)`.
        kind: "item",
        text: "download: address the rolling release by tag, not /releases/latest (b79cb58)",
      },
    ]);
    // The whole point: no dialog full of https://.
    expect(lines.some((l) => l.text.includes("http"))).toBe(false);
  });

  test("keeps the url when that's all a link has to offer", () => {
    expect(parseReleaseNotes("See <https://zmk.dev/>")).toEqual([
      { kind: "text", text: "See https://zmk.dev/" },
    ]);
  });

  test("drops blank lines but keeps unrecognised prose", () => {
    expect(parseReleaseNotes("First.\n\n\nSecond.")).toEqual([
      { kind: "text", text: "First." },
      { kind: "text", text: "Second." },
    ]);
  });

  test("handles both bullet markers and every heading depth", () => {
    expect(parseReleaseNotes("###### Deep\n- dashed\n* starred")).toEqual([
      { kind: "heading", text: "Deep" },
      { kind: "item", text: "dashed" },
      { kind: "item", text: "starred" },
    ]);
  });

  // A bullet is `* text`; emphasis is `*text*`. Stripping emphasis first would
  // eat the bullet marker, so the order the two run in matters.
  test("does not mistake a bullet marker for emphasis", () => {
    expect(parseReleaseNotes("* *emphatic* news")).toEqual([
      { kind: "item", text: "emphatic news" },
    ]);
  });

  test("returns nothing for a missing or empty body", () => {
    expect(parseReleaseNotes(undefined)).toEqual([]);
    expect(parseReleaseNotes("")).toEqual([]);
    expect(parseReleaseNotes("\n \n")).toEqual([]);
  });
});
