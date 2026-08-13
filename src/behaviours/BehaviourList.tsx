import { useState } from "react";
import { Plus } from "lucide-react";

import type { CustomBehavior } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { Button } from "../misc/Button";
import { ErrorMessage } from "../misc/Field";
import { SidebarCard } from "../misc/SidebarCard";
import { AddBehaviourModal } from "./AddBehaviourModal";

/** One option for the "Add" kind picker (the kind string + its display label). */
export interface BehaviourKindOption {
  kind: string;
  label: string;
}

export interface BehaviourListProps {
  behaviours: CustomBehavior[];
  /**
   * Why the list is empty, when it's empty because the read failed. Shown in
   * place of the "none yet" line, which would otherwise report a broken
   * connection as a keyboard with nothing on it.
   */
  error?: string;
  /** Kinds the "Add" button can claim from the spare pool. */
  addableKinds: BehaviourKindOption[];
  /** False when the pool is full (or disconnected) — disables Add. */
  canAdd?: boolean;
  selectedId?: number;
  onSelect?: (id: number) => void;
  /** Add a behaviour of the chosen kind (kind picked in the modal). */
  onAdd?: (kind: string) => void;
}

// Behaviour list. Rows are clickable cards mirroring the combo list / layer
// picker on the left of the editor: each shows the behaviour's name and a muted
// kind chip so the list stays scannable. "Add behavior" opens a modal to pick
// the kind, then claims a new behaviour from the spare pool and selects it.
export const BehaviourList = ({
  behaviours,
  error,
  addableKinds,
  canAdd,
  selectedId,
  onSelect,
  onAdd,
}: BehaviourListProps) => {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase opacity-70">Behaviors</h2>
      {error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : behaviours.length === 0 ? (
        <p className="text-sm opacity-70">No custom behaviors yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {behaviours.map((beh) => {
            const selected = beh.id === selectedId;
            return (
              <SidebarCard
                key={beh.id}
                selected={selected}
                onSelect={() => onSelect?.(beh.id)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-base font-medium">
                    {beh.displayName || `Behavior #${beh.id}`}
                  </span>
                  <span className="truncate text-base opacity-70">
                    {beh.kind}
                  </span>
                </div>
              </SidebarCard>
            );
          })}
        </ul>
      )}
      <Button
        className="w-full justify-center"
        variant="ghost"
        icon={<Plus />}
        isDisabled={!canAdd || !onAdd}
        onPress={() => setAdding(true)}
      >
        Add behavior
      </Button>
      <AddBehaviourModal
        open={adding}
        kinds={addableKinds}
        onClose={() => setAdding(false)}
        onAdd={(kind) => onAdd?.(kind)}
      />
    </div>
  );
};
