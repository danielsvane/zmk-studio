import type { ConfigField } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { FieldLabel } from "../misc/Field";

/**
 * Generic, behaviour-kind-agnostic renderer for one custom-behaviour
 * ConfigField. It dispatches purely on the field's `schema` (and falls back to
 * the shape of `value`), so adding a new behaviour kind never touches this
 * component — the firmware just reports new fields with the same schema vocab.
 *
 * M1: read-only display. Later milestones (M3+) swap the read-only value
 * renderings for editable inputs (number, Select, toggle, key-grid) keyed off
 * the same schema discriminant.
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
