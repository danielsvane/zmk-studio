import { useEffect, useState } from "react";
import type {
  ConfigField,
  ConfigValue,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { FieldLabel } from "../misc/Field";
import { KeyPositionPicker } from "../keyboard/KeyPositionPicker";

/**
 * Generic, behaviour-kind-agnostic renderer for one custom-behaviour
 * ConfigField. It dispatches purely on the field's `schema` (and falls back to
 * the shape of `value`), so adding a new behaviour kind never touches this
 * component — the firmware just reports new fields with the same schema vocab.
 *
 * `ConfigFieldView` is the read-only rendering (M1). `ConfigFieldEdit` (M3) is
 * the editable form: int → number input, enum → select, bool → checkbox,
 * key-positions → a click-to-toggle physical-layout picker (M9; falls back to a
 * comma-separated text box when no layout is available, M5), all keyed off the
 * same schema discriminant. It commits a new `ConfigValue` via `onCommit`; the
 * caller turns that into a set_custom_behavior RPC. Field kinds not yet editable
 * (behaviour-ref / hold-tap sub-bindings) fall back to the read-only rendering.
 */
export interface ConfigFieldViewProps {
  field: ConfigField;
}

/** Read-only text rendering of a ConfigField's current value, from its schema. */
function renderValue(field: ConfigField): string {
  const { value, schema } = field;

  // enum: show the selected option's name from the schema.
  if (schema?.enumOptions && value?.enumValue !== undefined) {
    return schema.enumOptions.names[value.enumValue] ?? `#${value.enumValue}`;
  }

  // bounded / plain integer.
  if (value?.intValue !== undefined) {
    return String(value.intValue);
  }

  // boolean toggle.
  if (value?.boolValue !== undefined) {
    return value.boolValue ? "On" : "Off";
  }

  // key positions.
  if (value?.positions) {
    const ps = value.positions.positions;
    return ps.length ? ps.join(", ") : "(none)";
  }

  // behaviour reference (hold/tap sub-binding).
  if (value?.behaviorRef !== undefined) {
    return `behaviour #${value.behaviorRef.behaviorId}`;
  }

  if (value?.hidUsage !== undefined) {
    return `0x${value.hidUsage.toString(16)}`;
  }

  return "—";
}

/** Short description of the field's constraints, drawn from the schema. */
function renderSchemaHint(field: ConfigField): string | undefined {
  const { schema } = field;
  if (schema?.intRange) {
    return `${schema.intRange.min}–${schema.intRange.max}`;
  }
  if (schema?.positions) {
    return `up to ${schema.positions.max} positions`;
  }
  return undefined;
}

export function ConfigFieldView({ field }: ConfigFieldViewProps) {
  const hint = renderSchemaHint(field);
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{field.displayName || field.key}</FieldLabel>
      <div className="flex items-baseline gap-2">
        <span className="text-base-content">{renderValue(field)}</span>
        {hint && <span className="text-xs text-base-content/60">({hint})</span>}
      </div>
    </div>
  );
}

export interface ConfigFieldEditProps {
  field: ConfigField;
  /** Commit a new value for this field (the caller issues the set RPC). */
  onCommit: (value: ConfigValue) => void;
  /** Physical-layout keys (index = position number) for the key-position
   * picker. When absent, a key-position field falls back to a text editor. */
  layoutKeys?: KeyPhysicalAttrs[];
}

/** Editable number input for an int-range field; commits on blur / Enter. */
function IntEditor({ field, onCommit }: ConfigFieldEditProps) {
  const current = field.value?.intValue ?? 0;
  const min = field.schema?.intRange?.min;
  const max = field.schema?.intRange?.max;
  const [text, setText] = useState(String(current));

  // Re-sync when the value changes externally (undo/redo, reload). We only
  // commit on blur, so `current` is stable while the user types and this won't
  // clobber in-progress input.
  useEffect(() => {
    setText(String(current));
  }, [current]);

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (Number.isNaN(parsed)) {
      setText(String(current)); // revert invalid input
      return;
    }
    let clamped = parsed;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    if (clamped !== parsed) setText(String(clamped));
    if (clamped !== current) onCommit({ intValue: clamped });
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      className="h-8 rounded px-2 bg-base-100 border border-white/15"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/**
 * Minimal editable key-positions field: a comma/space-separated list of position
 * numbers, committed on blur / Enter. Enough to exercise a long
 * hold_trigger_key_positions list end-to-end (M5 RX-buffer sizing). A proper
 * KeyGrid picker replaces this in M9.
 */
function PositionsEditor({ field, onCommit }: ConfigFieldEditProps) {
  const current = field.value?.positions?.positions ?? [];
  const max = field.schema?.positions?.max;
  const [text, setText] = useState(current.join(", "));

  useEffect(() => {
    setText(current.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.join(",")]);

  const commit = () => {
    const parsed = text
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => parseInt(t, 10))
      .filter((n) => !Number.isNaN(n) && n >= 0);
    const bounded =
      max !== undefined ? parsed.slice(0, max) : parsed;
    setText(bounded.join(", "));
    onCommit({ positions: { positions: bounded } });
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="e.g. 0, 1, 2"
      className="h-8 rounded px-2 bg-base-100 border border-white/15 min-w-0 flex-1"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/** Editable rendering of one ConfigField, dispatched on its schema. */
export function ConfigFieldEdit({
  field,
  onCommit,
  layoutKeys,
}: ConfigFieldEditProps) {
  const { value, schema } = field;
  const hint = renderSchemaHint(field);

  // Key-positions field: prefer the physical-layout picker when we have a
  // layout, falling back to the comma-separated text editor otherwise. Rendered
  // here (not in the shared control block) so it can span the full width.
  if (schema?.positions) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel>{field.displayName || field.key}</FieldLabel>
        {layoutKeys && layoutKeys.length > 0 ? (
          <KeyPositionPicker
            layoutKeys={layoutKeys}
            value={value?.positions?.positions ?? []}
            max={schema.positions.max}
            onChange={(positions) => onCommit({ positions: { positions } })}
          />
        ) : (
          <div className="flex items-center gap-2">
            <PositionsEditor field={field} onCommit={onCommit} />
            {hint && (
              <span className="text-xs text-base-content/60">({hint})</span>
            )}
          </div>
        )}
      </div>
    );
  }

  let control;
  if (schema?.enumOptions && value?.enumValue !== undefined) {
    const names = schema.enumOptions.names;
    control = (
      <select
        className="h-8 rounded px-2 bg-base-100 border border-white/15"
        value={value.enumValue}
        onChange={(e) => onCommit({ enumValue: parseInt(e.target.value, 10) })}
      >
        {names.map((name, i) => (
          <option key={i} value={i}>
            {name}
          </option>
        ))}
      </select>
    );
  } else if (schema?.boolSchema && value?.boolValue !== undefined) {
    control = (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.boolValue}
          onChange={(e) => onCommit({ boolValue: e.target.checked })}
        />
        <span className="text-sm text-base-content/80">
          {value.boolValue ? "On" : "Off"}
        </span>
      </label>
    );
  } else if (value?.intValue !== undefined) {
    control = <IntEditor field={field} onCommit={onCommit} />;
  } else {
    // Not yet editable (behaviour-ref): show read-only value. (Key-positions
    // are handled by the early return above.)
    control = <span className="text-base-content">{renderValue(field)}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{field.displayName || field.key}</FieldLabel>
      <div className="flex items-center gap-2">
        {control}
        {hint && <span className="text-xs text-base-content/60">({hint})</span>}
      </div>
    </div>
  );
}
