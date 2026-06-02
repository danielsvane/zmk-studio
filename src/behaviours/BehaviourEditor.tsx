import { Trash2 } from "lucide-react";

import type {
  ConfigValue,
  CustomBehavior,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import { Button } from "../misc/Button";
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
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold uppercase opacity-70">
            Edit behaviour
          </h2>
          <span className="text-xs opacity-60">{behaviour.kind}</span>
        </div>
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
