import type { ComponentType } from "react";
import {
  ArrowBigUp,
  ArrowBigUpDash,
  ArrowRightToLine,
  ChevronUp,
  Command,
  CornerDownLeft,
  Delete,
  Option,
  Volume1,
  Volume2,
} from "lucide-react";
import {
  hid_usage_get_labels,
  hid_usage_page_and_id_from_usage,
} from "../hid-usages";
import { SYMBOL_GLYPHS, isShiftOnly } from "../behaviors/keyGridTabs";

export interface HidUsageLabelProps {
  hid_usage: number;
}

type IconComponent = ComponentType<{
  className?: string;
  "aria-label"?: string;
}>;

interface IconSpec {
  Icon: IconComponent;
  // Extra classes, e.g. to mirror a glyph that lucide only ships one-way.
  className?: string;
}

// Explicit registry keyed by the kebab-case names used in
// hid-usage-name-overrides.json. Named imports keep the bundle tree-shaken
// to only the icons we actually reference. Add new icons here when an
// override starts using one.
const ICONS: Record<string, IconSpec> = {
  "arrow-big-up": { Icon: ArrowBigUp },
  "arrow-big-up-dash": { Icon: ArrowBigUpDash },
  "arrow-right-to-line": { Icon: ArrowRightToLine },
  "chevron-up": { Icon: ChevronUp },
  command: { Icon: Command },
  "corner-down-left": { Icon: CornerDownLeft },
  delete: { Icon: Delete },
  // Forward-delete: lucide only ships the backspace-direction glyph, so we
  // mirror it horizontally to get the ⌦ shape.
  "delete-forward": { Icon: Delete, className: "-scale-x-100" },
  option: { Icon: Option },
  "volume-1": { Icon: Volume1 },
  "volume-2": { Icon: Volume2 },
};

function remove_prefix(s?: string) {
  return s?.replace(/^Keyboard /, "");
}

export const HidUsageLabel = ({ hid_usage }: HidUsageLabelProps) => {
  const [page_raw, id] = hid_usage_page_and_id_from_usage(hid_usage);
  const page = page_raw & 0xff;

  // A base key carrying only a Shift renders as its shifted glyph (e.g. [ +
  // Shift → {), matching how the Symbols tab presents it. Other implicit
  // modifiers fall through to the plain key label.
  const mod_flags = (hid_usage >> 24) & 0xff;
  if (isShiftOnly(mod_flags)) {
    const glyph = SYMBOL_GLYPHS.get(hid_usage & 0x00ffffff);
    if (glyph) {
      return <span aria-label={glyph}>{glyph}</span>;
    }
  }

  const labels = hid_usage_get_labels(page, id);

  // If a known icon is defined, render it instead of the text label
  if (labels.icon) {
    const spec = ICONS[labels.icon];

    if (spec) {
      const { Icon, className } = spec;
      return (
        <Icon
          className={`w-4 h-4${className ? ` ${className}` : ""}`}
          aria-label={remove_prefix(labels.short)}
        />
      );
    }
  }

  return (
    <span
      className="@[10em]:before:content-[attr(data-long-content)] @[6em]:before:content-[attr(data-med-content)] before:content-[attr(aria-label)]"
      aria-label={remove_prefix(labels.short)}
      data-med-content={remove_prefix(labels.med || labels.short)}
      data-long-content={remove_prefix(
        labels.long || labels.med || labels.short
      )}
    />
  );
};
