/**
 * Plain-language help for the behaviour config fields whose names don't explain
 * themselves, shown in an `InfoTip` next to the field's label.
 *
 * Condensed from the ZMK docs, keyed by behaviour kind and then by the `key` the
 * firmware reports for the field. A field with no entry (and any kind with no
 * table) simply gets no info icon, so this never has to keep up with the
 * firmware's field list. It only covers the settings people actually trip over.
 *
 * House style for this copy: talk to the reader, say what they get rather than
 * what the firmware "resolves to", and keep it to short sentences. No em dashes.
 */

/** The ZMK docs page for a behaviour kind. */
const DOCS_URL: Record<string, string> = {
  "hold-tap": "https://zmk.dev/docs/keymaps/behaviors/hold-tap",
};

interface HelpEntry {
  text: string;
  /** Heading anchor within the kind's docs page, to land on the right section
   * rather than the top. Checked against the published page, not guessed from
   * the property name: several don't match (e.g. the key-positions section is
   * `positional-hold-tap-and-…`, and flavor is `interrupt-flavors`). */
  anchor?: string;
}

const FIELD_HELP: Record<string, Record<string, HelpEntry>> = {
  "hold-tap": {
    tapping_term_ms: {
      anchor: "tapping-term-ms",
      text: "How long you have to hold the key before you get the hold behavior. Let go sooner than this and you get the tap instead. It's also the window the flavor uses when you press another key. ZMK defaults to 200 ms.",
    },
    quick_tap_ms: {
      anchor: "quick-tap-ms",
      text: "Tap the key, then press it again within this time, and you get the tap behavior again and it stays held. So the key repeats instead of turning into a hold. Handy on keys like backspace. Set it to 0 to turn it off.",
    },
    require_prior_idle_ms: {
      anchor: "require-prior-idle-ms",
      text: "If you pressed another key less than this long ago, you always get the tap. This is the usual fix for home row mods firing by accident while you type fast. The bigger the number, the harder it gets to use the hold on purpose. Set it to 0 to turn it off.",
    },
    flavor: {
      anchor: "interrupt-flavors",
      text:
        "How the key decides between hold and tap when you press another key before the tapping term is up.\n\n" +
        "hold-preferred: any other key press gives you the hold.\n" +
        "balanced: you get the hold if you press and release another key. Usually the best pick for home row mods.\n" +
        "tap-preferred: only the tapping term gives you the hold, other keys don't.\n" +
        "tap-unless-interrupted: you get the tap unless you press another key first.",
    },
    hold_trigger_key_positions: {
      anchor: "positional-hold-tap-and-hold-trigger-key-positions",
      text: "You only get the hold if the next key you press is one of these. Press anything else and you get the tap. Normally you'd pick the other hand's keys, so home row mods don't fire while you roll across keys on the same hand. Leave it empty to allow the hold from any key.",
    },
    hold_trigger_on_release: {
      anchor: "hold-trigger-on-release",
      text: "Waits until you let go of the next key before checking the hold trigger key positions. That way you can stack several modifiers while you keep that key held, but a quick tap of it still gives you the tap. Only does anything if you've set hold trigger key positions.",
    },
    retro_tap: {
      anchor: "retro-tap",
      text: "Hold the key, press nothing else, and you still get the tap when you let go. The catch is that the hold won't activate until you press another key, so things like shift-click stop working.",
    },
  },
};

export interface FieldHelp {
  text: string;
  /** Deep link to the docs section, when the kind has a docs page. */
  href?: string;
}

/** Help copy for one config field, or undefined when we have nothing to add. */
export function fieldHelp(kind: string, key: string): FieldHelp | undefined {
  const entry = FIELD_HELP[kind]?.[key];
  if (!entry) return undefined;

  const docs = DOCS_URL[kind];
  return {
    text: entry.text,
    href: docs && entry.anchor ? `${docs}#${entry.anchor}` : docs,
  };
}
