import type { CustomBehavior } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

// Shared fixtures for the custom-behaviour Storybook stories. Stories can't talk
// to a real keyboard, so these stand in for what get_custom_behaviors reports —
// each ConfigField carries both a current `value` and the `schema` the generic
// editor renders from. (The physical layout for the key-position picker is
// reused from comboFixtures.)

/** A hold-tap with the full spread of field kinds (int / enum / bool / positions). */
export const FIXTURE_HOLD_TAP: CustomBehavior = {
  id: 1,
  displayName: "Home Row Mods (L)",
  kind: "hold-tap",
  config: [
    {
      key: "tapping_term_ms",
      displayName: "Tapping term (ms)",
      value: { intValue: 200 },
      schema: { intRange: { min: 0, max: 5000 } },
    },
    {
      key: "quick_tap_ms",
      displayName: "Quick tap (ms)",
      value: { intValue: 250 },
      schema: { intRange: { min: 0, max: 5000 } },
    },
    {
      key: "require_prior_idle_ms",
      displayName: "Require prior idle (ms)",
      value: { intValue: 200 },
      schema: { intRange: { min: -1, max: 5000 } },
    },
    {
      key: "flavor",
      displayName: "Flavor",
      value: { enumValue: 1 },
      schema: {
        enumOptions: {
          names: ["hold-preferred", "balanced", "tap-preferred", "tap-unless-interrupted"],
        },
      },
    },
    {
      key: "hold_trigger_on_release",
      displayName: "Hold trigger on release",
      value: { boolValue: true },
      schema: { boolSchema: {} },
    },
    {
      key: "retro_tap",
      displayName: "Retro tap",
      value: { boolValue: false },
      schema: { boolSchema: {} },
    },
    {
      key: "hold_trigger_key_positions",
      displayName: "Hold trigger key positions",
      value: { positions: { positions: [5, 6, 7, 8, 9, 15, 16, 17, 18, 19] } },
      schema: { positions: { max: 32 } },
    },
  ],
};

/** A second, smaller behaviour so the list has more than one row. */
export const FIXTURE_STICKY_KEY: CustomBehavior = {
  id: 2,
  displayName: "Sticky Shift",
  kind: "sticky-key",
  config: [
    {
      key: "release_after_ms",
      displayName: "Release after (ms)",
      value: { intValue: 1000 },
      schema: { intRange: { min: 0, max: 5000 } },
    },
    {
      key: "quick_release",
      displayName: "Quick release",
      value: { boolValue: false },
      schema: { boolSchema: {} },
    },
  ],
};

export const FIXTURE_BEHAVIOURS: CustomBehavior[] = [
  FIXTURE_HOLD_TAP,
  FIXTURE_STICKY_KEY,
];

export const FIXTURE_ADDABLE_KINDS = [
  { kind: "hold-tap", label: "hold-tap" },
  { kind: "sticky-key", label: "sticky-key" },
];
