// Dry-run tests for the full-replace import algorithm against an in-memory
// fake device. The fake implements just enough of the RPC surface (via a
// mocked call_rpc) to exercise the interesting paths: behaviour-id resolution
// by name after ids shift between firmware builds, custom behaviour id
// remapping (incl. behaviorRef config fields), layer-id param remapping,
// combo pool slot preservation, and every best-effort skip path.

import { describe, expect, test, vi } from "vitest";

import type { RpcConnection, Request } from "@zmkfirmware/zmk-studio-ts-client";
import type {
  Keymap,
  Layer,
  BehaviorBinding,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type {
  Combo,
  Combos,
  ComboEntry,
} from "@zmkfirmware/zmk-studio-ts-client/combos";
import type {
  ConfigField,
  CustomBehavior,
  CustomBehaviors,
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { buildBackup } from "./exportBackup";
import { importBackup } from "./importBackup";
import type { BackupV1 } from "./backupFormat";

// Route every call_rpc straight into the fake device that's passed where the
// real RpcConnection would be. fetchBehaviorMap uses the same module, so it's
// covered too.
vi.mock("../rpc/logging", () => ({
  call_rpc: async (conn: unknown, req: Omit<Request, "requestId">) =>
    (conn as FakeDevice).handle(req),
}));

type Resp = Record<string, unknown>;

interface FakeDeviceOpts {
  builtins: GetBehaviorDetailsResponse[];
  layers: Layer[];
  /** how many MORE layers can be added */
  availableLayers: number;
  /** ids handed to layers created by add_layer, in order */
  nextLayerIds: number[];
  maxCombos: number;
  maxKeysPerCombo: number;
  customPoolMax: number;
  /** ids handed to slots claimed by add_custom_behavior, in order */
  nextCustomIds: number[];
}

class FakeDevice {
  builtins: Map<number, GetBehaviorDetailsResponse>;
  customs = new Map<number, CustomBehavior>();
  layers: Layer[];
  availableLayers: number;
  nextLayerIds: number[];
  combos = new Map<number, Combo>();
  maxCombos: number;
  maxKeysPerCombo: number;
  customPoolMax: number;
  nextCustomIds: number[];
  saved: string[] = [];

  constructor(opts: FakeDeviceOpts) {
    this.builtins = new Map(opts.builtins.map((b) => [b.id, b]));
    this.layers = structuredClone(opts.layers);
    this.availableLayers = opts.availableLayers;
    this.nextLayerIds = [...opts.nextLayerIds];
    this.maxCombos = opts.maxCombos;
    this.maxKeysPerCombo = opts.maxKeysPerCombo;
    this.customPoolMax = opts.customPoolMax;
    this.nextCustomIds = [...opts.nextCustomIds];
  }

  handle(req: Omit<Request, "requestId">): Resp {
    if (req.behaviors) return { behaviors: this.handleBehaviors(req.behaviors) };
    if (req.keymap) return { keymap: this.handleKeymap(req.keymap) };
    if (req.combos) return { combos: this.handleCombos(req.combos) };
    throw new Error(`FakeDevice: unhandled request ${JSON.stringify(req)}`);
  }

  private handleBehaviors(req: NonNullable<Request["behaviors"]>): Resp {
    if (req.listAllBehaviors) {
      return {
        listAllBehaviors: {
          behaviors: [...this.builtins.keys(), ...this.customs.keys()],
        },
      };
    }
    if (req.getBehaviorDetails) {
      const id = req.getBehaviorDetails.behaviorId;
      const custom = this.customs.get(id);
      const details = custom
        ? { id, displayName: custom.displayName, metadata: [] }
        : this.builtins.get(id);
      return { getBehaviorDetails: details };
    }
    if (req.getCustomBehaviors) {
      return {
        getCustomBehaviors: {
          behaviors: structuredClone([...this.customs.values()]),
          max: this.customPoolMax,
        } satisfies CustomBehaviors,
      };
    }
    if (req.removeCustomBehavior) {
      const { id } = req.removeCustomBehavior;
      if (!this.customs.delete(id)) {
        return { removeCustomBehavior: { err: 2 /* NOT_FOUND */ } };
      }
      return { removeCustomBehavior: { ok: {} } };
    }
    if (req.addCustomBehavior) {
      if (this.customs.size >= this.customPoolMax) {
        return { addCustomBehavior: { err: 2 /* NO_SPACE */ } };
      }
      const id = this.nextCustomIds.shift();
      if (id === undefined) throw new Error("FakeDevice: nextCustomIds empty");
      const behavior: CustomBehavior = {
        id,
        displayName: req.addCustomBehavior.displayName,
        kind: req.addCustomBehavior.kind,
        config: structuredClone(req.addCustomBehavior.config),
      };
      this.customs.set(id, behavior);
      return { addCustomBehavior: { ok: { id, behavior } } };
    }
    if (req.setCustomBehavior) {
      const { id, config, displayName } = req.setCustomBehavior;
      const custom = this.customs.get(id);
      if (!custom) return { setCustomBehavior: 1 /* NOT_FOUND */ };
      if (displayName !== undefined) custom.displayName = displayName;
      for (const field of config) {
        const existing = custom.config.find((f) => f.key === field.key);
        if (existing) {
          existing.value = structuredClone(field.value);
        } else {
          custom.config.push(
            structuredClone({ ...field, schema: undefined }) as ConfigField
          );
        }
      }
      return { setCustomBehavior: 0 /* OK */ };
    }
    if (req.saveChanges) {
      this.saved.push("behaviors");
      return { saveChanges: { ok: true } };
    }
    throw new Error("FakeDevice: unhandled behaviors request");
  }

  private handleKeymap(req: NonNullable<Request["keymap"]>): Resp {
    if (req.getKeymap) {
      return {
        getKeymap: structuredClone({
          layers: this.layers,
          availableLayers: this.availableLayers,
          maxLayerNameLength: 20,
        }) satisfies Keymap,
      };
    }
    if (req.addLayer) {
      if (this.availableLayers <= 0) {
        return { addLayer: { err: 2 /* NO_SPACE */ } };
      }
      const id = this.nextLayerIds.shift();
      if (id === undefined) throw new Error("FakeDevice: nextLayerIds empty");
      const keyCount = this.layers[0]?.bindings.length ?? 0;
      const layer: Layer = {
        id,
        name: "",
        bindings: Array.from({ length: keyCount }, () => ({
          behaviorId: 0,
          param1: 0,
          param2: 0,
        })),
      };
      this.layers.push(layer);
      this.availableLayers--;
      return {
        addLayer: { ok: { index: this.layers.length - 1, layer: structuredClone(layer) } },
      };
    }
    if (req.removeLayer) {
      const { layerIndex } = req.removeLayer;
      if (layerIndex < 0 || layerIndex >= this.layers.length) {
        return { removeLayer: { err: 2 /* INVALID_INDEX */ } };
      }
      this.layers.splice(layerIndex, 1);
      this.availableLayers++;
      return { removeLayer: { ok: {} } };
    }
    if (req.setLayerProps) {
      const layer = this.layers.find((l) => l.id === req.setLayerProps!.layerId);
      if (!layer) return { setLayerProps: 2 /* ERR_INVALID_ID */ };
      layer.name = req.setLayerProps.name;
      return { setLayerProps: 0 /* OK */ };
    }
    if (req.setLayerBinding) {
      const { layerId, keyPosition, binding } = req.setLayerBinding;
      const layer = this.layers.find((l) => l.id === layerId);
      if (!layer || keyPosition >= layer.bindings.length) {
        return { setLayerBinding: 1 /* INVALID_LOCATION */ };
      }
      if (
        binding &&
        !this.builtins.has(binding.behaviorId) &&
        !this.customs.has(binding.behaviorId)
      ) {
        return { setLayerBinding: 2 /* INVALID_BEHAVIOR */ };
      }
      layer.bindings[keyPosition] = structuredClone(binding!);
      return { setLayerBinding: 0 /* OK */ };
    }
    if (req.saveChanges) {
      this.saved.push("keymap");
      return { saveChanges: { ok: true } };
    }
    throw new Error("FakeDevice: unhandled keymap request");
  }

  private handleCombos(req: NonNullable<Request["combos"]>): Resp {
    if (req.getCombos) {
      const entries: ComboEntry[] = [...this.combos.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, combo]) => ({ index, combo: structuredClone(combo) }));
      return {
        getCombos: {
          combos: entries,
          maxCombos: this.maxCombos,
          maxKeysPerCombo: this.maxKeysPerCombo,
        } satisfies Combos,
      };
    }
    if (req.removeCombo) {
      if (!this.combos.delete(req.removeCombo.index)) {
        return { removeCombo: { err: 2 /* INVALID_INDEX */ } };
      }
      return { removeCombo: { ok: {} } };
    }
    if (req.setCombo) {
      const { index, combo } = req.setCombo;
      if (index >= this.maxCombos) {
        return { setCombo: 1 /* INVALID_LOCATION */ };
      }
      this.combos.set(index, structuredClone(combo!));
      return { setCombo: 0 /* OK */ };
    }
    if (req.addCombo) {
      if (this.combos.size >= this.maxCombos) {
        return { addCombo: { err: 2 /* NO_SPACE */ } };
      }
      let index = 0;
      while (this.combos.has(index)) index++;
      this.combos.set(index, structuredClone(req.addCombo.combo!));
      return { addCombo: { ok: { index, combo: req.addCombo.combo } } };
    }
    if (req.saveChanges) {
      this.saved.push("combos");
      return { saveChanges: { ok: true } };
    }
    throw new Error("FakeDevice: unhandled combos request");
  }
}

const asConn = (device: FakeDevice) => device as unknown as RpcConnection;

// ---- shared fixtures --------------------------------------------------------

const HID = { keyboardMax: 0xff, consumerMax: 0xff };
const KEY_A = 0x70004; // HID usage page 7 / keycode 4

const builtinDetails = (
  id: number,
  displayName: string,
  metadata: GetBehaviorDetailsResponse["metadata"] = []
): GetBehaviorDetailsResponse => ({ id, displayName, metadata });

// Built-in behaviours on the SOURCE device (where the backup was exported).
const SRC_BUILTINS = {
  transparent: builtinDetails(0, "Transparent"),
  keyPress: builtinDetails(1, "Key Press", [
    { param1: [{ name: "Key", hidUsage: HID }], param2: [] },
  ]),
  layerTap: builtinDetails(5, "Layer-Tap", [
    {
      param1: [{ name: "Layer", layerId: {} }],
      param2: [{ name: "Key", hidUsage: HID }],
    },
  ]),
  studioUnlock: builtinDetails(9, "Studio Unlock"),
};

// The same built-ins on the TARGET device, with every id shifted (a firmware
// rebuild renumbered the registry) — name resolution must take over.
const TARGET_BUILTINS = [
  builtinDetails(100, "Transparent"),
  builtinDetails(101, "Key Press"),
  builtinDetails(105, "Layer-Tap"),
  builtinDetails(109, "Studio Unlock"),
];

const bind = (behaviorId: number, param1 = 0, param2 = 0): BehaviorBinding => ({
  behaviorId,
  param1,
  param2,
});

const emptyLayer = (id: number, name: string, keys: number): Layer => ({
  id,
  name,
  bindings: Array.from({ length: keys }, () => bind(0)),
});

/** A realistic source-device export: 2 layers × 4 keys, 2 combos, 1 custom hold-tap. */
function makeSourceBackup(): BackupV1 {
  const customHrm: CustomBehavior = {
    id: 32,
    displayName: "HRM (L)",
    kind: "hold-tap",
    config: [
      { key: "tapping_term_ms", displayName: "", value: { intValue: 200 }, schema: undefined },
      { key: "flavor", displayName: "", value: { enumValue: 1 }, schema: undefined },
      { key: "retro_tap", displayName: "", value: { boolValue: false }, schema: undefined },
      {
        key: "hold_trigger_key_positions",
        displayName: "",
        value: { positions: { positions: [1, 2] } },
        schema: undefined,
      },
      {
        key: "hold_behavior",
        displayName: "",
        value: { behaviorRef: { behaviorId: 1 } }, // → Key Press, must remap to 101
        schema: undefined,
      },
    ],
  };

  const keymap: Keymap = {
    layers: [
      {
        id: 0,
        name: "",
        bindings: [
          bind(1, KEY_A), // Key Press
          bind(5, 1, KEY_A), // Layer-Tap → layer id 1 (remap target)
          bind(32, KEY_A), // the custom hold-tap
          bind(0), // Transparent
        ],
      },
      { ...emptyLayer(1, "Nav", 4) },
    ],
    availableLayers: 2,
    maxLayerNameLength: 20,
  };

  const combos: Combos = {
    combos: [
      {
        index: 0,
        combo: {
          keyPositions: [0, 1],
          layers: 0, // all layers
          binding: bind(9), // Studio Unlock
          timeoutMs: 50,
          requirePriorIdleMs: -1,
          slowRelease: false,
        },
      },
      {
        index: 2,
        combo: {
          keyPositions: [1, 2],
          layers: 0b10, // layer index 1 only
          binding: bind(1, KEY_A),
          timeoutMs: 40,
          requirePriorIdleMs: 100,
          slowRelease: true,
        },
      },
    ],
    maxCombos: 4,
    maxKeysPerCombo: 2,
  };

  const behaviorMap = {
    0: SRC_BUILTINS.transparent,
    1: SRC_BUILTINS.keyPress,
    5: SRC_BUILTINS.layerTap,
    9: SRC_BUILTINS.studioUnlock,
    32: builtinDetails(32, "HRM (L)", [
      {
        param1: [{ name: "Hold", hidUsage: HID }],
        param2: [{ name: "Tap", hidUsage: HID }],
      },
    ]),
  };

  return buildBackup({
    keymap,
    combos,
    customBehaviors: { behaviors: [customHrm], max: 4 },
    behaviorMap,
    deviceInfo: { name: "Engrammer", serialNumber: new Uint8Array([1, 2]) },
    exportedAt: new Date("2026-06-03T12:00:00Z"),
  });
}

function makeTargetDevice(overrides: Partial<FakeDeviceOpts> = {}): FakeDevice {
  return new FakeDevice({
    builtins: TARGET_BUILTINS,
    layers: [emptyLayer(0, "default", 4)],
    availableLayers: 3,
    nextLayerIds: [7, 8, 9], // fresh layer ids ≠ exported ids → forces remap
    maxCombos: 4,
    maxKeysPerCombo: 2,
    customPoolMax: 2,
    nextCustomIds: [40, 41],
    ...overrides,
  });
}

// ---- tests -------------------------------------------------------------------

describe("importBackup", () => {
  test("clean round-trip onto a rebuilt firmware (shifted ids, fresh layer/custom ids)", async () => {
    const backup = makeSourceBackup();
    const device = makeTargetDevice();

    const report = await importBackup(asConn(device), backup);

    expect(report.fatal).toBeUndefined();
    expect(report.skipped).toEqual([]);
    expect(report.applied).toEqual({
      layers: 2,
      bindings: 8,
      combos: 2,
      customBehaviors: 1,
    });

    // Custom behaviour recreated with a fresh id and full config, behaviorRef
    // remapped to the target's Key Press id.
    expect([...device.customs.keys()]).toEqual([40]);
    const hrm = device.customs.get(40)!;
    expect(hrm.displayName).toBe("HRM (L)");
    expect(hrm.kind).toBe("hold-tap");
    expect(Object.fromEntries(hrm.config.map((f) => [f.key, f.value]))).toEqual({
      tapping_term_ms: { intValue: 200 },
      flavor: { enumValue: 1 },
      retro_tap: { boolValue: false },
      hold_trigger_key_positions: { positions: { positions: [1, 2] } },
      hold_behavior: { behaviorRef: { behaviorId: 101 } },
    });

    // Layers reconciled: count 2, names restored, second layer has the fresh id.
    expect(device.layers.map((l) => ({ id: l.id, name: l.name }))).toEqual([
      { id: 0, name: "" },
      { id: 7, name: "Nav" },
    ]);

    // Bindings: behaviour ids resolved by name; layer-tap's param1 remapped
    // from exported layer id 1 to live layer id 7.
    expect(device.layers[0].bindings).toEqual([
      bind(101, KEY_A),
      bind(105, 7, KEY_A),
      bind(40, KEY_A),
      bind(100),
    ]);

    // Combos recreated at their original pool slots, layer mask re-encoded.
    expect([...device.combos.keys()].sort()).toEqual([0, 2]);
    expect(device.combos.get(0)!.binding).toEqual(bind(109));
    expect(device.combos.get(0)!.layers).toBe(0);
    expect(device.combos.get(2)!.layers).toBe(0b10);
    expect(device.combos.get(2)!.slowRelease).toBe(true);

    // Auto-saved all three subsystems.
    expect(device.saved).toEqual(["keymap", "combos", "behaviors"]);
  });

  test("pre-existing customs and combos are removed (full replace)", async () => {
    const backup = makeSourceBackup();
    const device = makeTargetDevice();
    device.customs.set(50, {
      id: 50,
      displayName: "Old Mod",
      kind: "sticky-key",
      config: [],
    });
    device.combos.set(3, {
      keyPositions: [2, 3],
      layers: 0,
      binding: bind(100),
      timeoutMs: 30,
      requirePriorIdleMs: -1,
      slowRelease: false,
    });

    const report = await importBackup(asConn(device), backup);

    expect(report.skipped).toEqual([]);
    expect([...device.customs.keys()]).toEqual([40]);
    expect([...device.combos.keys()].sort()).toEqual([0, 2]);
  });

  test("layer shrink: extra layers, their bindings, and orphaned layer refs are skipped", async () => {
    const backup = makeSourceBackup();
    // Target can't add any layers: stuck at 1.
    const device = makeTargetDevice({ availableLayers: 0 });

    const report = await importBackup(asConn(device), backup);

    expect(report.fatal).toBeUndefined();
    // The dropped layer is reported once...
    expect(report.skipped).toContainEqual(
      expect.objectContaining({ kind: "layer" })
    );
    // ...and the layer-tap that targeted it is skipped, not written stale.
    expect(report.skipped).toContainEqual(
      expect.objectContaining({
        kind: "binding",
        reason: expect.stringContaining("param1"),
      })
    );
    // The combo restricted to the dropped layer is skipped too.
    expect(report.skipped).toContainEqual(
      expect.objectContaining({
        kind: "combo",
        reason: "all target layers were dropped",
      })
    );
    // The layer-tap key keeps its previous (empty) binding.
    expect(device.layers[0].bindings[1]).toEqual(bind(0));
    // Everything else still landed.
    expect(device.layers[0].bindings[0]).toEqual(bind(101, KEY_A));
    expect(device.combos.has(0)).toBe(true);
    expect(device.combos.has(2)).toBe(false);
  });

  test("unknown behavior name is skipped and reported, the rest still applies", async () => {
    const backup = makeSourceBackup();
    // Remove Layer-Tap from the target registry entirely.
    const device = makeTargetDevice({
      builtins: TARGET_BUILTINS.filter((b) => b.displayName !== "Layer-Tap"),
    });

    const report = await importBackup(asConn(device), backup);

    expect(report.skipped).toEqual([
      expect.objectContaining({
        kind: "binding",
        reason: 'behavior "Layer-Tap" not found',
      }),
    ]);
    expect(report.applied.bindings).toBe(7);
    expect(device.layers[0].bindings[0]).toEqual(bind(101, KEY_A));
  });

  test("combo slot overflow falls back to add_combo, NO_SPACE is reported", async () => {
    const backup = makeSourceBackup();
    // Slot 2 no longer exists (maxCombos 1) and the pool is full after combo #0.
    const device = makeTargetDevice({ maxCombos: 1 });

    const report = await importBackup(asConn(device), backup);

    expect(report.applied.combos).toBe(1);
    expect(report.skipped).toEqual([
      expect.objectContaining({
        kind: "combo",
        location: "combo #2",
        reason: "no free combo slot",
      }),
    ]);
    expect([...device.combos.keys()]).toEqual([0]);
  });

  test("custom behavior NO_SPACE: slot and its bindings are skipped", async () => {
    const backup = makeSourceBackup();
    const device = makeTargetDevice({ customPoolMax: 0 });

    const report = await importBackup(asConn(device), backup);

    expect(report.skipped).toContainEqual(
      expect.objectContaining({
        kind: "customBehavior",
        location: '"HRM (L)"',
        reason: "no free pool slot",
      })
    );
    expect(report.skipped).toContainEqual(
      expect.objectContaining({
        kind: "binding",
        reason: 'behavior "HRM (L)" not found',
      })
    );
    expect(report.applied.customBehaviors).toBe(0);
    expect(device.customs.size).toBe(0);
  });

  test("malformed device read aborts with fatal, nothing applied", async () => {
    const backup = makeSourceBackup();
    const device = makeTargetDevice();
    // Simulate a transport-level failure shape: call_rpc resolved to an error
    // object with no usable payload.
    device.handle = () => ({});

    const report = await importBackup(asConn(device), backup);

    expect(report.fatal).toBeDefined();
    expect(report.applied).toEqual({
      layers: 0,
      bindings: 0,
      combos: 0,
      customBehaviors: 0,
    });
  });
});
