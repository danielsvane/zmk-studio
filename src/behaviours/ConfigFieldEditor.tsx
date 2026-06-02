import { useEffect, useId, useState } from "react";
import type {
  ConfigField,
  ConfigValue,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { FieldLabel, GroupLabel } from "../misc/Field";
import { TextField } from "../misc/TextField";
import { Select } from "../misc/Select";
import { Checkbox } from "../misc/Checkbox";
import { KeyPositionPicker } from "../keyboard/KeyPositionPicker";

/**
 * Generic, behaviour-kind-agnostic renderer for one custom-behaviour
 * ConfigField. It dispatches purely on the field's `schema` (and falls back to
 * the shape of `value`), so adding a new behaviour kind never touches this
 * component — the firmware just reports new fields with the same schema vocab.
 *
 * `ConfigFieldView` is the read-only rendering (M1). `ConfigFieldEdit` (M3) is
 * the editable form, built entirely on the shared design-system controls so it
 * lines up with the combo editor: int → {@link TextField}, enum →
 * {@link Select}, bool → {@link Checkbox}, key-positions → a click-to-toggle
 * physical-layout picker (falls back to a comma-separated {@link TextField} when
 * no layout is available), all keyed off the same schema discriminant. It
 * commits a new `ConfigValue` via `onCommit`; the caller turns that into a
 * set_custom_behavior RPC. Field kinds not yet editable (behaviour-ref /
 * hold-tap sub-bindings) fall back to the read-only rendering.
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
    <div className="flex flex-col gap-1.5">
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
function IntField({ field, onCommit }: ConfigFieldEditProps) {
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
    <TextField
      label={field.displayName || field.key}
      description={renderSchemaHint(field)}
      type="number"
      className="max-w-[10rem]"
      value={text}
      onChange={setText}
      inputProps={{
        min,
        max,
        inputMode: "numeric",
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        },
      }}
    />
  );
}

/** Pick-one editor for an enum field; commits immediately on change. */
function EnumField({ field, onCommit }: ConfigFieldEditProps) {
  const names = field.schema?.enumOptions?.names ?? [];
  const value = field.value?.enumValue ?? 0;
  const items = names.map((name, id) => ({ id, name }));

  return (
    <Select
      label={field.displayName || field.key}
      className="max-w-sm"
      triggerClassName="w-full"
      items={items}
      selectedKey={value}
      onSelectionChange={(key) => onCommit({ enumValue: Number(key) })}
    />
  );
}

/** Boolean toggle; the field's display name is the checkbox label. */
function BoolField({ field, onCommit }: ConfigFieldEditProps) {
  return (
    <Checkbox
      isSelected={field.value?.boolValue ?? false}
      onChange={(selected) => onCommit({ boolValue: selected })}
    >
      {field.displayName || field.key}
    </Checkbox>
  );
}

/**
 * Comma/space-separated list of key positions, committed on blur / Enter. The
 * text fallback for a key-positions field when no physical layout is available
 * to click on. Keeps its own raw-text buffer so typing "1, 2," doesn't get
 * reformatted mid-edit, and emits the parsed list on commit.
 */
function PositionsTextField({ field, onCommit }: ConfigFieldEditProps) {
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
    const bounded = max !== undefined ? parsed.slice(0, max) : parsed;
    setText(bounded.join(", "));
    onCommit({ positions: { positions: bounded } });
  };

  return (
    <TextField
      label={field.displayName || field.key}
      description={renderSchemaHint(field)}
      placeholder="e.g. 0, 1, 2"
      value={text}
      onChange={setText}
      inputProps={{
        inputMode: "numeric",
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        },
      }}
    />
  );
}

/**
 * Key-positions field: the click-to-toggle physical-layout picker when we have
 * a layout, falling back to {@link PositionsTextField} otherwise. Rendered as a
 * full-width labelled group (the picker has its own selection counter).
 */
function PositionsField({ field, onCommit, layoutKeys }: ConfigFieldEditProps) {
  const labelId = useId();

  if (!layoutKeys || layoutKeys.length === 0) {
    return <PositionsTextField field={field} onCommit={onCommit} />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <GroupLabel id={labelId}>{field.displayName || field.key}</GroupLabel>
      <div role="group" aria-labelledby={labelId}>
        <KeyPositionPicker
          layoutKeys={layoutKeys}
          value={field.value?.positions?.positions ?? []}
          max={field.schema?.positions?.max}
          onChange={(positions) => onCommit({ positions: { positions } })}
        />
      </div>
    </div>
  );
}

/** Editable rendering of one ConfigField, dispatched on its schema. */
export function ConfigFieldEdit({
  field,
  onCommit,
  layoutKeys,
}: ConfigFieldEditProps) {
  const { value, schema } = field;

  if (schema?.positions) {
    return (
      <PositionsField field={field} onCommit={onCommit} layoutKeys={layoutKeys} />
    );
  }
  if (schema?.enumOptions && value?.enumValue !== undefined) {
    return <EnumField field={field} onCommit={onCommit} />;
  }
  if (schema?.boolSchema && value?.boolValue !== undefined) {
    return <BoolField field={field} onCommit={onCommit} />;
  }
  if (value?.intValue !== undefined) {
    return <IntField field={field} onCommit={onCommit} />;
  }

  // Not yet editable (behaviour-ref): show the read-only value.
  return <ConfigFieldView field={field} />;
}
