// import { UsagePages } from "./HidUsageTables-1.5.json";
// Filtered with `cat src/HidUsageTables-1.5.json | jq '{ UsagePages: [.UsagePages[] | select([.Id] |inside([7, 12]))] }' > src/keyboard-and-consumer-usage-tables.json`
import { UsagePages } from "./keyboard-and-consumer-usage-tables.json";
import HidOverrides from "./hid-usage-name-overrides.json";

interface HidLabels {
  short?: string;
  med?: string;
  long?: string;
  icon?: string;
}

const overrides: Record<string, Record<string, HidLabels>> = HidOverrides;

export interface UsageId {
  Id: number;
  Name: string;
}

export interface UsagePageInfo {
  Name: string;
  UsageIds: UsageId[];
}

export const hid_usage_from_page_and_id = (page: number, id: number) =>
  (page << 16) + id;

export const hid_usage_page_and_id_from_usage = (
  usage: number
): [number, number] => [(usage >> 16) & 0xffff, usage & 0xffff];

export const hid_usage_page_get_ids = (
  usage_page: number
): UsagePageInfo | undefined => UsagePages.find((p) => p.Id === usage_page);

export const hid_usage_get_label = (
  usage_page: number,
  usage_id: number
): string | undefined =>
  overrides[usage_page.toString()]?.[usage_id.toString()]?.short ||
  UsagePages.find((p) => p.Id === usage_page)?.UsageIds?.find(
    (u) => u.Id === usage_id
  )?.Name;

export const hid_usage_get_labels = (
  usage_page: number,
  usage_id: number
): { short?: string; med?: string; long?: string; icon?: string } =>
  overrides[usage_page.toString()]?.[usage_id.toString()] || {
    short: UsagePages.find((p) => p.Id === usage_page)?.UsageIds?.find(
      (u) => u.Id === usage_id
    )?.Name,
  };

export interface HidUsagePage {
  id: number;
  min?: number;
  max?: number;
}

/**
 * The usage pages a hidUsage parameter descriptor can pick from: keyboard
 * (page 7, ids 4..keyboardMax, plus the modifier usages) and consumer
 * (page 12, up to consumerMax).
 */
export function usagePagesFor(hidUsage: {
  keyboardMax: number;
  consumerMax: number;
}): HidUsagePage[] {
  return [
    { id: 7, min: 4, max: hidUsage.keyboardMax },
    { id: 12, max: hidUsage.consumerMax },
  ];
}
