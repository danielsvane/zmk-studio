import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "../misc/Button";
import { TextField } from "../misc/TextField";

export interface LayerToolbarProps {
  /** Current name of the selected layer ("" when the layer is unnamed). */
  name: string;
  /** Stable fallback shown when the layer is unnamed (its index). */
  placeholder: string;
  /** Rename: commit a new, non-empty name. */
  onRename: (name: string) => void;
  /** Delete the selected layer. */
  onDelete: () => void;
  /** False when only one layer remains (the last layer can't be deleted). */
  canDelete?: boolean;
}

// Controls for the *selected* layer, anchored to the top-left corner of the
// keymap canvas — rename and delete live here rather than in the sidebar (which
// is just selection + reorder). The name edits in place: commit on blur/Enter,
// revert on empty/Escape, resync when the layer changes underneath — the same
// pattern as the behaviour name editor. Delete is undoable, so there's no
// confirm step.
export function LayerToolbar({
  name,
  placeholder,
  onRename,
  onDelete,
  canDelete,
}: LayerToolbarProps) {
  const [text, setText] = useState(name);

  useEffect(() => {
    setText(name);
  }, [name]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setText(name); // reject empty — revert to the current name
      return;
    }
    if (trimmed !== name) {
      onRename(trimmed);
    } else {
      setText(trimmed);
    }
  };

  return (
    <div className="absolute left-0 top-0 flex items-center gap-2 p-2">
      <TextField
        aria-label="Layer name"
        size="sm"
        className="w-44"
        placeholder={placeholder}
        value={text}
        onChange={setText}
        inputProps={{
          maxLength: 47,
          onBlur: commit,
          onKeyDown: (e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setText(name);
              e.currentTarget.blur();
            }
          },
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={<Trash2 aria-hidden />}
        isDisabled={!canDelete}
        onPress={onDelete}
      >
        Delete
      </Button>
    </div>
  );
}
