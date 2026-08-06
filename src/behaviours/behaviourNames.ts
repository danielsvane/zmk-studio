/**
 * Default display name for a newly claimed custom behaviour, e.g. "Hold-Tap 2".
 *
 * A new behaviour is named up front rather than left nameless: with an empty
 * `display_name` the firmware reports the claimed slot's devicetree label
 * ("Spare Hold-Tap 1"), which reads as an *unclaimed* spare for something that
 * is now a real behaviour. The user renames it in the editor; this is only what
 * the list and the binding picker show until then.
 *
 * The ordinal is the lowest not already taken, so names stay unique (and a gap
 * left by a deletion gets reused). `taken` is every existing behaviour's display
 * name, not just those of the same kind, so the name is unique across the list
 * the binding picker shows.
 */
export function defaultBehaviourName(kind: string, taken: Set<string>): string {
  // "hold-tap" -> "Hold-Tap": keep the hyphen ZMK spells the kind with, but
  // case it like a name so it doesn't read as an echo of the kind chip below it.
  const base = kind
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");

  let n = 1;
  while (taken.has(`${base} ${n}`)) {
    n++;
  }
  return `${base} ${n}`;
}
