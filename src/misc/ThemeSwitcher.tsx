import type { ReactNode } from "react";
import { Monitor, Sun, Moon, Check } from "lucide-react";

import { Button } from "./Button";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";
import { useTheme, type Theme } from "./theme";

const OPTIONS: { id: Theme; label: string; icon: ReactNode }[] = [
  { id: "system", label: "System", icon: <Monitor /> },
  { id: "light", label: "Light", icon: <Sun /> },
  { id: "dark", label: "Dark", icon: <Moon /> },
];

/**
 * Header control to pick the colour theme (System / Light / Dark). A ghost
 * icon button whose glyph reflects the current choice, opening the shared
 * `DropdownMenu`; the active option carries a trailing check. Selecting an
 * option flips the root `color-scheme` (see `theme.ts`).
 */
export function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  const active = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];

  return (
    <DropdownMenu
      trigger={
        <Button
          variant="ghost"
          icon={active.icon}
          aria-label={`Theme: ${active.label}`}
        />
      }
    >
      {OPTIONS.map((o) => (
        <DropdownMenuItem
          key={o.id}
          icon={o.icon}
          onAction={() => setTheme(o.id)}
        >
          <span className="flex w-full items-center justify-between gap-3">
            {o.label}
            {o.id === theme && <Check aria-hidden className="size-4 shrink-0" />}
          </span>
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
