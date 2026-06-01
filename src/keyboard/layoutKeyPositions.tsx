import type { ReactNode } from "react";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import type { KeyPosition } from "./PhysicalLayout";

/** Per-key content for {@link keyPhysicalAttrsToPositions}; index is the key
 * position number. Return a header (the small label at the top of a key) and/or
 * children (the body). Omit either to leave it blank. */
export type RenderLayoutKey = (index: number) => {
  header?: string;
  children?: ReactNode;
};

/**
 * Map a physical layout's keys (as reported by the device — coordinates and
 * sizes are stored ×100) into the 1u-relative {@link KeyPosition}s the
 * {@link PhysicalLayout} component renders. Keeps the ×100 conversion in one
 * place; previously each caller (Keymap, KeyPositionPicker) repeated it.
 */
export function keyPhysicalAttrsToPositions(
  keys: KeyPhysicalAttrs[],
  renderKey?: RenderLayoutKey,
): KeyPosition[] {
  return keys.map((k, i) => {
    const content = renderKey?.(i);
    return {
      id: String(i),
      header: content?.header,
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100.0,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children: content?.children ?? <span />,
    };
  });
}
