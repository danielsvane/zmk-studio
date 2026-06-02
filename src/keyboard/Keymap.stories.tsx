import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import type {
  BehaviorBinding,
  Keymap as KeymapMsg,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { Keymap } from "./Keymap";
import {
  FIXTURE_BEHAVIOR_MAP,
  FIXTURE_LAYERS,
  FIXTURE_LAYOUT,
} from "../combos/comboFixtures";

const KEY = (id: number): BehaviorBinding => ({
  behaviorId: 0,
  param1: 0x00070000 | id,
  param2: 0,
});
// Mod-tap: hold a modifier (HID usage), tap a key.
const MOD_TAP = (mod: number, tap: number): BehaviorBinding => ({
  behaviorId: 1,
  param1: 0x00070000 | mod,
  param2: 0x00070000 | tap,
});
// Layer-tap: hold to reach a layer (by id), tap a key.
const LAYER_TAP = (layer: number, tap: number): BehaviorBinding => ({
  behaviorId: 2,
  param1: layer,
  param2: 0x00070000 | tap,
});

// HID ids for the keys/mods used below.
const A = 0x04,
  S = 0x16,
  D = 0x07,
  F = 0x09,
  LCTRL = 0xe0,
  LSHIFT = 0xe1,
  LGUI = 0xe3;

// A home-row-mods style top + bottom of key presses with the middle row mixing
// mod-taps and layer-taps, so one screenshot shows mod glyphs and layer names
// side by side.
const bindings: BehaviorBinding[] = [
  ...[0x14, 0x1a, 0x08, 0x15, 0x17, 0x1c, 0x18, 0x0c, 0x12, 0x13].map(KEY), // QWERTYUIOP
  LAYER_TAP(1, A), // A → tap A / hold Nav
  MOD_TAP(LGUI, S), // S → tap S / hold GUI
  MOD_TAP(LCTRL, D), // D → tap D / hold Ctrl
  MOD_TAP(LSHIFT, F), // F → tap F / hold Shift
  ...[0x0a, 0x0b, 0x0d, 0x0e, 0x0f, 0x33].map(KEY),
  ...[0x1d, 0x1b, 0x06, 0x19, 0x05].map(KEY), // ZXCVB
  LAYER_TAP(2, 0x11), // N → tap N / hold Num
  ...[0x10, 0x36, 0x37, 0x38].map(KEY),
  KEY(0x2c), // space
  LAYER_TAP(1, 0x28), // enter / hold Nav
];

const keymap: KeymapMsg = {
  availableLayers: 0,
  maxLayerNameLength: 16,
  layers: [{ id: 0, name: "Base", bindings }],
};

const meta = {
  title: "Keyboard/Keymap",
  component: Keymap,
  args: {
    layout: { name: "Fixture", keys: FIXTURE_LAYOUT },
    keymap,
    behaviors: FIXTURE_BEHAVIOR_MAP,
    layers: FIXTURE_LAYERS,
    selectedLayerIndex: 0,
    selectedKeyPosition: undefined,
    onKeyPositionClicked: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 760 }} className="bg-base-200 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Keymap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mod-taps show their modifier glyph (⌘/^/⇧) and layer-taps now show the
 * target layer's name (Nav/Num) beside the tapped key. */
export const HomeRowModsAndLayerTaps: Story = {};
