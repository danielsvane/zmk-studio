import { Trash2 } from "lucide-react";

import type {
  ConfigValue,
  CustomBehavior,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { Button } from "../misc/Button";
import { Select } from "../misc/Select";
import { BehaviourNameEditor } from "./BehaviourNameEditor";
import { ConfigFieldEdit } from "./ConfigFieldEditor";

export interface BehaviourEditorProps {
  behaviour: CustomBehavior;
  /** Physical-layout keys for the key-position picker; index is the position. */
  layoutKeys?: KeyPhysicalAttrs[];
  /** Commit a new display name. */
  onRename: (name: string) => void;
  /** Commit a single config field (the caller issues the set RPC + undo). */
  onApplyField: (
    fieldKey: string,
    value: ConfigValue,
    oldValue: ConfigValue,
  ) => void;
  onDelete?: () => void;
}

// Edit a single custom behaviour in place. The name and every config field save
// live (commit-on-blur / on-change, one set_custom_behavior RPC each) — unlike
// the combo editor's batched Apply, since behaviour fields are independent and
// there's no validation that spans them. Mirrors the combo editor's header
// (title + ghost Delete) and field rhythm (gap-4) so the two pages feel the
// same. The config fields render generically from their schema via
// ConfigFieldEdit, so adding a behaviour kind never touches this component.
export const BehaviourEditor = ({
  behaviour,
  layoutKeys,
  onRename,
  onApplyField,
  onDelete,
}: BehaviourEditorProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase opacity-70">
          Edit behaviour
        </h2>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 aria-hidden />}
            onPress={onDelete}
          >
            Delete
          </Button>
        )}
      </div>

      <BehaviourNameEditor
        label="Name"
        className="max-w-sm"
        name={behaviour.displayName ?? ""}
        placeholder={`Behaviour #${behaviour.id}`}
        onCommit={onRename}
      />

      {/* Type is fixed for the life of a behaviour, so it reads as a field but
          renders as a disabled Select — it matches the other controls' look
          while being non-editable. */}
      <Select
        label="Type"
        className="max-w-sm"
        description="Type can't be changed — create a new behaviour and delete the old one if another type is needed."
        items={[{ id: behaviour.kind, name: behaviour.kind }]}
        selectedKey={behaviour.kind}
        isDisabled
      />

      {behaviour.config.map((field) => (
        <ConfigFieldEdit
          key={field.key}
          field={field}
          layoutKeys={layoutKeys}
          onCommit={(value) =>
            onApplyField(field.key, value, field.value ?? {})
          }
        />
      ))}
    </div>
  );
};
