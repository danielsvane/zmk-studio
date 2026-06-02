import { useEffect, useState, type ReactNode } from "react";

import { TextField } from "../misc/TextField";

/**
 * Editable display name for a custom behaviour (M9 rename), built on the shared
 * {@link TextField} so it lines up with the rest of the form. Commits on blur /
 * Enter via `onCommit` (which the caller turns into a set_custom_behavior
 * request carrying the new name) and reverts on Escape. Mirrors the
 * commit-on-blur + external-resync pattern used by the numeric config editors so
 * undo/reload don't clobber in-progress typing. Empty / whitespace-only names
 * are rejected (revert).
 */
export interface BehaviourNameEditorProps {
  name: string;
  /** Stable fallback label (e.g. "Behaviour #3") shown when the name is empty. */
  placeholder: string;
  /** Field label rendered above the input; omit for an aria-label-only field. */
  label?: ReactNode;
  /** Max length (matches the firmware/proto name capacity). */
  maxLength?: number;
  /** Wrapper (the field column) className. */
  className?: string;
  onCommit: (name: string) => void;
}

export function BehaviourNameEditor({
  name,
  placeholder,
  label,
  maxLength = 47,
  className,
  onCommit,
}: BehaviourNameEditorProps) {
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
      onCommit(trimmed);
    } else {
      setText(trimmed);
    }
  };

  return (
    <TextField
      label={label}
      aria-label={label ? undefined : "Behaviour name"}
      className={className}
      placeholder={placeholder}
      value={text}
      onChange={setText}
      inputProps={{
        maxLength,
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
  );
}
