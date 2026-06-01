import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "../misc/ToggleGroup";
import { LabeledGroup } from "../misc/Field";
import { KeyGrid } from "./KeyGrid";
import { resolveCell, type KeyTab } from "./keyGridTabs";

export interface KeyTabsProps {
  /** Currently bound usage (full value, incl. modifier bits). */
  value?: number;
  /** Called with the picked cell's full usage. */
  onPick: (usage: number) => void;
  tabs: KeyTab[];
}

/**
 * The picker CANVAS: a tab strip (Basic / Symbols / Numpad / …) over a
 * {@link KeyGrid} of the selected tab. Editing an existing binding snaps to the
 * tab that {@link resolveCell} says it lives in — derived at render from a
 * previous-value compare (not an effect), the same way the mod-tap slot picker
 * resets, so picking elsewhere then re-opening lands on the right tab while the
 * user can still switch tabs freely between picks.
 */
export const KeyTabs = ({ value, onPick, tabs }: KeyTabsProps) => {
  const resolved = resolveCell(value, tabs);
  const fallbackTab = tabs[0]?.id;

  const [selectedTab, setSelectedTab] = useState(resolved?.tabId ?? fallbackTab);
  const [prevValue, setPrevValue] = useState(value);

  // Snap to the resolved tab when the value changes to something living in a
  // different tab (e.g. an existing binding loaded for edit).
  if (value !== prevValue) {
    setPrevValue(value);
    if (resolved && resolved.tabId !== selectedTab) {
      setSelectedTab(resolved.tabId);
    }
  }

  // Guard against a selected tab that no longer exists (usagePages changed).
  const activeTab =
    tabs.find((t) => t.id === selectedTab) ?? tabs.find((t) => t.id === fallbackTab);
  if (!activeTab) return null;

  const activeUsage = resolved?.tabId === activeTab.id ? resolved.cellUsage : undefined;

  return (
    <LabeledGroup label="Keyboard" className="flex flex-col gap-2">
      {tabs.length > 1 && (
        <ToggleGroup
          aria-label="Key category"
          size="sm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([activeTab.id])}
          onSelectionChange={(keys) => {
            const [id] = [...keys];
            if (typeof id === "string") setSelectedTab(id);
          }}
        >
          {tabs.map((tab) => (
            <ToggleGroupItem key={tab.id} id={tab.id}>
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      <KeyGrid rows={activeTab.rows} activeUsage={activeUsage} onPick={onPick} />
    </LabeledGroup>
  );
};
