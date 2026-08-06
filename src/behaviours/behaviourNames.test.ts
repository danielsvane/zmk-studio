import { describe, expect, test } from "vitest";

import { defaultBehaviourName } from "./behaviourNames";

describe("defaultBehaviourName", () => {
  test("cases the kind and starts at 1", () => {
    expect(defaultBehaviourName("hold-tap", new Set())).toBe("Hold-Tap 1");
    expect(defaultBehaviourName("sticky-key", new Set())).toBe("Sticky-Key 1");
  });

  test("takes the lowest free ordinal, reusing gaps", () => {
    const taken = new Set(["Hold-Tap 1", "Hold-Tap 3"]);
    expect(defaultBehaviourName("hold-tap", taken)).toBe("Hold-Tap 2");
    taken.add("Hold-Tap 2");
    expect(defaultBehaviourName("hold-tap", taken)).toBe("Hold-Tap 4");
  });

  test("ignores names of other kinds", () => {
    const taken = new Set(["Sticky-Key 1", "Home Row Mods"]);
    expect(defaultBehaviourName("hold-tap", taken)).toBe("Hold-Tap 1");
  });
});
