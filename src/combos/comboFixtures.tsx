import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { Combos } from "@zmkfirmware/zmk-studio-ts-client/combos";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

// Shared fixtures for the combo-editing Storybook stories. Stories can't talk to
// a real keyboard, so these stand in for what the device would report.

/** Build a physical layout from simple 1u-relative key boxes (the device reports
 * these ×100). */
function makeLayout(
  boxes: Array<{ x: number; y: number; w?: number; h?: number }>,
): KeyPhysicalAttrs[] {
  return boxes.map(({ x, y, w = 1, h = 1 }) => ({
    x: x * 100,
    y: y * 100,
    width: w * 100,
    height: h * 100,
    r: 0,
    rx: 0,
    ry: 0,
  }));
}

// A compact 3×10 ortho block + two thumb keys — enough positions to make combo
// highlights legible without needing a full board.
export const FIXTURE_LAYOUT: KeyPhysicalAttrs[] = makeLayout([
  ...Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 })),
  ...Array.from({ length: 10 }, (_, i) => ({ x: i, y: 1 })),
  ...Array.from({ length: 10 }, (_, i) => ({ x: i, y: 2 })),
  { x: 3, y: 3, w: 2 },
  { x: 5, y: 3, w: 2 },
]);

export const FIXTURE_BEHAVIORS: GetBehaviorDetailsResponse[] = [
  {
    id: 0,
    displayName: "Key Press",
    metadata: [
      {
        param1: [
          { name: "Key", hidUsage: { keyboardMax: 0xff, consumerMax: 0x29c } },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 1,
    displayName: "Mod-Tap",
    metadata: [
      {
        param1: [
          { name: "Hold", hidUsage: { keyboardMax: 0xff, consumerMax: 0 } },
        ],
        param2: [
          { name: "Tap", hidUsage: { keyboardMax: 0xff, consumerMax: 0x29c } },
        ],
      },
    ],
  },
];

export const FIXTURE_BEHAVIOR_MAP: Record<number, GetBehaviorDetailsResponse> =
  Object.fromEntries(FIXTURE_BEHAVIORS.map((b) => [b.id, b]));

export const FIXTURE_LAYERS = [
  { id: 0, name: "Base" },
  { id: 1, name: "Nav" },
  { id: 2, name: "Num" },
];

// A handful of combos with distinct key positions so the list previews differ.
export const FIXTURE_COMBOS: Combos = {
  maxCombos: 16,
  maxKeysPerCombo: 4,
  combos: [
    {
      index: 0,
      combo: {
        keyPositions: [0, 1],
        layers: 0,
        binding: { behaviorId: 0, param1: 0x0007002b, param2: 0 }, // Tab
        timeoutMs: 50,
        requirePriorIdleMs: -1,
        slowRelease: false,
      },
    },
    {
      index: 1,
      combo: {
        keyPositions: [11, 12, 13],
        layers: 0,
        binding: { behaviorId: 0, param1: 0x00070029, param2: 0 }, // Escape
        timeoutMs: 40,
        requirePriorIdleMs: 100,
        slowRelease: false,
      },
    },
    {
      index: 2,
      combo: {
        keyPositions: [30, 31],
        layers: 0,
        binding: { behaviorId: 0, param1: 0x00070028, param2: 0 }, // Enter
        timeoutMs: 60,
        requirePriorIdleMs: -1,
        slowRelease: true,
      },
    },
  ],
};
