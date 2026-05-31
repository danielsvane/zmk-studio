import { useEffect, useState } from "react";

/**
 * Inline editable display name for a custom behaviour (M9 rename). Commits on
 * blur / Enter via `onCommit`, which the caller turns into a set_custom_behavior
 * request carrying the new name. Mirrors the commit-on-blur + external-resync
 * pattern used by the numeric config editors so undo/reload don't clobber
 * in-progress typing. Empty / whitespace-only names are rejected (revert).
 */
export interface BehaviourNameEditorProps {
  name: string;
  /** Stable fallback label (e.g. "Behaviour #3") shown when the name is empty. */
  placeholder: string;
  /** Max length (matches the firmware/proto name capacity). */
  maxLength?: number;
  onCommit: (name: string) => void;
}

export function BehaviourNameEditor({
  name,
  placeholder,
  maxLength = 47,
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
    <input
      type="text"
      aria-label="Behaviour name"
      placeholder={placeholder}
      maxLength={maxLength}
      className="text-lg font-medium text-base-content bg-transparent rounded px-1 -mx-1 border border-transparent hover:border-white/15 focus:border-white/30 focus:bg-base-100 min-w-0"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setText(name);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
