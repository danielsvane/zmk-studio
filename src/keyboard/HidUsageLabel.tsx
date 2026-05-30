import type { ComponentType } from "react";
import {
  ArrowBigUp,
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

export interface HidUsageLabelProps {
  hid_usage: number;
}

type IconComponent = ComponentType<{
  className?: string;
  "aria-label"?: string;
}>;

// Explicit registry keyed by the kebab-case names used in
// hid-usage-name-overrides.json. Named imports keep the bundle tree-shaken
// to only the icons we actually reference. Add new icons here when an
// override starts using one.
const ICONS: Record<string, IconComponent> = {
  "arrow-big-up": ArrowBigUp,
  "arrow-right-to-line": ArrowRightToLine,
  "chevron-up": ChevronUp,
  command: Command,
  "corner-down-left": CornerDownLeft,
  delete: Delete,
  option: Option,
  "volume-1": Volume1,
  "volume-2": Volume2,
};

function remove_prefix(s?: string) {
  return s?.replace(/^Keyboard /, "");
}

export const HidUsageLabel = ({ hid_usage }: HidUsageLabelProps) => {
  const [page_raw, id] = hid_usage_page_and_id_from_usage(hid_usage);

  // TODO: Do something with implicit mods!
  const page = page_raw & 0xff;

  const labels = hid_usage_get_labels(page, id);

  // If a known icon is defined, render it instead of the text label
  if (labels.icon) {
    const Icon = ICONS[labels.icon];

    if (Icon) {
      return (
        <Icon className="w-4 h-4" aria-label={remove_prefix(labels.short)} />
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
