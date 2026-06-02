import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { GenericModal } from "../GenericModal";
import { useModalRef } from "../misc/useModalRef";
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
// is just selection + reorder). Two plain icon buttons: a pencil that opens the
// rename dialog and a trash that opens a delete confirm. Delete is undoable, but
// it's a destructive jump so we still confirm.
export function LayerToolbar({
  name,
  placeholder,
  onRename,
  onDelete,
  canDelete,
}: LayerToolbarProps) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayName = name.trim() || placeholder;

  return (
    <div className="absolute left-0 top-0 flex items-center gap-1 p-2">
      <Button
        variant="ghost"
        size="sm"
        icon={<Pencil aria-hidden />}
        aria-label="Rename layer"
        onPress={() => setRenaming(true)}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={<Trash2 aria-hidden />}
        aria-label="Delete layer"
        isDisabled={!canDelete}
        onPress={() => setDeleting(true)}
      />
      <RenameLayerModal
        open={renaming}
        name={name}
        placeholder={placeholder}
        onClose={() => setRenaming(false)}
        onRename={onRename}
      />
      <DeleteLayerModal
        open={deleting}
        name={displayName}
        onClose={() => setDeleting(false)}
        onDelete={onDelete}
      />
    </div>
  );
}

interface RenameLayerModalProps {
  open: boolean;
  name: string;
  placeholder: string;
  onClose: () => void;
  onRename: (name: string) => void;
}

// Rename dialog. Prefills the current name; commits the trimmed value (rejecting
// empty) on Save or Enter. Built on the shared TextField so it matches the rest
// of the app's forms.
function RenameLayerModal({
  open,
  name,
  placeholder,
  onClose,
  onRename,
}: RenameLayerModalProps) {
  const ref = useModalRef(open, true);
  const [text, setText] = useState(name);

  // Reset to the layer's current name each time the dialog opens.
  useEffect(() => {
    if (open) setText(name);
  }, [open, name]);

  const save = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed !== name) onRename(trimmed);
    onClose();
  };

  return (
    <GenericModal
      ref={ref}
      className="min-w-[20rem]"
      onClose={onClose}
      title="Rename layer"
      actions={
        <>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isDisabled={text.trim().length === 0}
            onPress={save}
          >
            Save
          </Button>
        </>
      }
    >
      <TextField
        label="Name"
        placeholder={placeholder}
        value={text}
        onChange={setText}
        inputProps={{
          maxLength: 47,
          autoFocus: true,
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          },
        }}
      />
    </GenericModal>
  );
}

interface DeleteLayerModalProps {
  open: boolean;
  name: string;
  onClose: () => void;
  onDelete: () => void;
}

// Delete confirm. The action is undoable, which we say so the prompt doesn't
// read as scarier than it is.
function DeleteLayerModal({
  open,
  name,
  onClose,
  onDelete,
}: DeleteLayerModalProps) {
  const ref = useModalRef(open, true);

  return (
    <GenericModal
      ref={ref}
      className="min-w-[20rem]"
      onClose={onClose}
      title="Delete layer"
      actions={
        <>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 aria-hidden />}
            onPress={() => {
              onDelete();
              onClose();
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm opacity-80">
        Delete <span className="font-medium">{name}</span>? You can undo this.
      </p>
    </GenericModal>
  );
}
