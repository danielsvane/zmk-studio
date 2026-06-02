import { ChevronRight, Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  Selection,
  useDragAndDrop,
} from "react-aria-components";

import { Button } from "../misc/Button";
import { controlFocusRing, cx, selectableCard } from "../misc/controlStyles";

interface Layer {
  id: number;
  name?: string;
}

export type LayerClickCallback = (index: number) => void;
export type LayerMovedCallback = (index: number, destination: number) => void;

interface LayerPickerProps {
  layers: Array<Layer>;
  selectedLayerIndex: number;
  canAdd?: boolean;

  onLayerClicked?: LayerClickCallback;
  onLayerMoved?: LayerMovedCallback;
  onAddClicked?: () => void | Promise<void>;
}

// Layer list. Mirrors the Combos/Behaviours sidebars: a plain title, a
// full-width Add button, and selectable cards (shared `selectableCard` surface +
// drill-in chevron). Renaming and deleting the selected layer live in the
// keyboard area (see LayerToolbar), so the sidebar is purely selection + reorder
// — drag a card to move that layer.
export const LayerPicker = ({
  layers,
  selectedLayerIndex,
  canAdd,
  onLayerClicked,
  onLayerMoved,
  onAddClicked,
  ...props
}: LayerPickerProps) => {
  const layer_items = useMemo(() => {
    return layers.map((l, i) => ({
      name: l.name || i.toLocaleString(),
      id: l.id,
      index: i,
      selected: i === selectedLayerIndex,
    }));
  }, [layers, selectedLayerIndex]);

  const selectionChanged = useCallback(
    (s: Selection) => {
      if (s === "all") {
        return;
      }

      onLayerClicked?.(layer_items.findIndex((l) => s.has(l.id)));
    },
    [onLayerClicked, layer_items]
  );

  const { dragAndDropHooks } = useDragAndDrop({
    renderDropIndicator(target) {
      return (
        <DropIndicator
          target={target}
          className={"data-[drop-target]:outline outline-1 outline-accent"}
        />
      );
    },
    getItems: (keys) =>
      [...keys].map((key) => ({ "text/plain": key.toLocaleString() })),
    onReorder(e) {
      const startIndex = layer_items.findIndex((l) => e.keys.has(l.id));
      const endIndex = layer_items.findIndex((l) => l.id === e.target.key);
      onLayerMoved?.(startIndex, endIndex);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase opacity-70">Layers</h2>
      <Button
        className="w-full justify-center"
        variant="secondary"
        icon={<Plus />}
        isDisabled={!canAdd || !onAddClicked}
        onPress={() => onAddClicked?.()}
      >
        Add layer
      </Button>
      <ListBox
        aria-label="Keymap Layer"
        selectionMode="single"
        items={layer_items}
        disallowEmptySelection={true}
        selectedKeys={
          layer_items[selectedLayerIndex]
            ? [layer_items[selectedLayerIndex].id]
            : []
        }
        className="flex flex-col gap-2"
        onSelectionChange={selectionChanged}
        dragAndDropHooks={dragAndDropHooks}
        {...props}
      >
        {(layer_item) => (
          <ListBoxItem
            textValue={layer_item.name}
            className={({ isSelected }) =>
              cx(
                selectableCard.base,
                "flex items-center gap-2",
                controlFocusRing,
                isSelected ? selectableCard.selected : selectableCard.resting
              )
            }
          >
            {({ isSelected }) => (
              <>
                <span className="min-w-0 flex-1 truncate text-base font-medium">
                  {layer_item.name}
                </span>
                <ChevronRight
                  aria-hidden
                  className={cx(
                    "size-4 shrink-0 transition-colors",
                    isSelected ? "text-primary" : "opacity-40"
                  )}
                />
              </>
            )}
          </ListBoxItem>
        )}
      </ListBox>
    </div>
  );
};
