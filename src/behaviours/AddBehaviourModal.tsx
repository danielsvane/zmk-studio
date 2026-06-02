import { useEffect, useState } from "react";

import { GenericModal } from "../GenericModal";
import { useModalRef } from "../misc/useModalRef";
import { Button } from "../misc/Button";
import { ToggleGroup, ToggleGroupItem } from "../misc/ToggleGroup";
import type { BehaviourKindOption } from "./BehaviourList";

export interface AddBehaviourModalProps {
  open: boolean;
  /** Kinds that can be claimed from the spare pool. */
  kinds: BehaviourKindOption[];
  onClose: () => void;
  /** Confirm: add a behaviour of the chosen kind. */
  onAdd: (kind: string) => void;
}

// "Add behaviour" dialog: the user picks which kind to claim from the spare
// pool, then confirms. The kind is chosen here rather than via a control in the
// sidebar so the list stays a clean list. Uses an inline ToggleGroup (not a
// dropdown) since a Select's portal would render behind the native <dialog>'s
// top layer.
export const AddBehaviourModal = ({
  open,
  kinds,
  onClose,
  onAdd,
}: AddBehaviourModalProps) => {
  const ref = useModalRef(open, true);
  const [kind, setKind] = useState(kinds[0]?.kind ?? "");

  // Reset to the first kind each time the dialog opens.
  useEffect(() => {
    if (open) {
      setKind(kinds[0]?.kind ?? "");
    }
  }, [open, kinds]);

  return (
    <GenericModal ref={ref} className="min-w-[20rem]" onClose={onClose}>
      <h2 className="mb-3 text-lg font-medium">Add behaviour</h2>
      <ToggleGroup
        label="Kind"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set([kind])}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next !== undefined) setKind(String(next));
        }}
      >
        {kinds.map((k) => (
          <ToggleGroupItem key={k.kind} id={k.kind}>
            {k.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onPress={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={!kind}
          onPress={() => {
            onAdd(kind);
            onClose();
          }}
        >
          Add
        </Button>
      </div>
    </GenericModal>
  );
};
