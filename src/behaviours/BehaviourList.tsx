import { useState } from "react";
import { Plus } from "lucide-react";

import type { CustomBehavior } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { Button } from "../misc/Button";
import { SidebarCard } from "../misc/SidebarCard";
import { AddBehaviourModal } from "./AddBehaviourModal";

/** One option for the "Add" kind picker (the kind string + its display label). */
export interface BehaviourKindOption {
  kind: string;
  label: string;
}

export interface BehaviourListProps {
  behaviours: CustomBehavior[];
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
// kind chip so the list stays scannable. "Add behaviour" opens a modal to pick
// the kind, then claims a new behaviour from the spare pool and selects it.
export const BehaviourList = ({
  behaviours,
  addableKinds,
  canAdd,
  selectedId,
  onSelect,
  onAdd,
}: BehaviourListProps) => {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase opacity-70">Behaviours</h2>
      {behaviours.length === 0 ? (
        <p className="text-sm opacity-70">No custom behaviours yet.</p>
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
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {beh.displayName || `Behaviour #${beh.id}`}
                  </span>
                  <span className="ml-auto shrink-0 text-xs opacity-60">
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
        Add behaviour
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
