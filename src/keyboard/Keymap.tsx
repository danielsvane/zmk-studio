import {
  PhysicalLayout,
  Keymap as KeymapMsg,
  BehaviorBinding,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { PhysicalLayout as PhysicalLayoutComp } from "./PhysicalLayout";
import { HidUsageLabel } from "./HidUsageLabel";
import { matchDescriptor, validateValue } from "../behaviors/parameters";

export type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface KeymapProps {
  layout: PhysicalLayout;
  keymap: KeymapMsg;
  behaviors: BehaviorMap;
  layers: { id: number; name: string }[];
  selectedLayerIndex: number;
  selectedKeyPosition: number | undefined;
  onKeyPositionClicked: (keyPosition: number) => void;
}

// A layer param renders as the target layer's name rather than as a (meaningless)
// HID usage — this is what makes a layer-tap show the layer it goes to, next to
// its tap key, the way a mod-tap shows its modifier glyph.
const LayerLabel = ({ name }: { name: string }) => (
  <span className="text-xs leading-none text-nowrap" aria-label={name}>
    {name}
  </span>
);

// Render a binding's editable params, most-significant first (e.g. the tap key
// before the hold of a mod-tap, or before the target layer of a layer-tap). A
// param the behavior describes as a layer is shown by name; everything else
// goes through the HID usage label. Falls back to the HID label for every
// non-zero param when the behavior's metadata isn't loaded yet.
function renderBindingParams(
  binding: BehaviorBinding,
  behavior: GetBehaviorDetailsResponse | undefined,
  layers: { id: number; name: string }[]
) {
  const layerIds = layers.map((l) => l.id);
  const md = behavior?.metadata ?? [];

  // The set whose param1 the current value satisfies (mirrors the picker), so a
  // multi-set behavior is classified against the set actually in effect.
  const set =
    md.find((s) => validateValue(layerIds, binding.param1, s.param1)) ??
    (md.length === 1 ? md[0] : undefined);

  return [
    { value: binding.param2, descriptors: set?.param2 },
    { value: binding.param1, descriptors: set?.param1 },
  ]
    .map((p) => ({
      ...p,
      descriptor: matchDescriptor(layerIds, p.value, p.descriptors),
    }))
    // Drop unused params (the empty hold of a plain key press), but keep a
    // layer param even when it points at layer 0 — that's a real target.
    .filter((p) => p.value !== 0 || !!p.descriptor?.layerId)
    .map((p, index) => {
      if (p.descriptor?.layerId) {
        const layer = layers.find((l) => l.id === p.value);
        return <LayerLabel key={index} name={layer?.name ?? `${p.value}`} />;
      }
      return <HidUsageLabel key={index} hid_usage={p.value} />;
    });
}

export const Keymap = ({
  layout,
  keymap,
  behaviors,
  layers,
  selectedLayerIndex,
  selectedKeyPosition,
  onKeyPositionClicked,
}: KeymapProps) => {
  if (!keymap.layers[selectedLayerIndex]) {
    return <></>;
  }

  const positions = layout.keys.map((k, i) => {
    if (i >= keymap.layers[selectedLayerIndex].bindings.length) {
      return {
        id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
        x: k.x / 100.0,
        y: k.y / 100.0,
        width: k.width / 100,
        height: k.height / 100.0,
        children: <span></span>,
      };
    }

    const binding = keymap.layers[selectedLayerIndex].bindings[i];

    return {
      id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children: renderBindingParams(binding, behaviors[binding.behaviorId], layers),
    };
  });

  return (
    <PhysicalLayoutComp
      positions={positions}
      oneU={48}
      zoom="auto"
      selectedPosition={selectedKeyPosition}
      onPositionClicked={onKeyPositionClicked}
    />
  );
};
