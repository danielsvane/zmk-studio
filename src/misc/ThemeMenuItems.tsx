import { Monitor, Sun, Moon, Check } from "lucide-react";
import type { ReactNode } from "react";

import { DropdownMenuItem } from "./DropdownMenu";
import { useTheme, type Theme } from "./theme";

const OPTIONS: { id: Theme; label: string; icon: ReactNode }[] = [
  { id: "system", label: "System", icon: <Monitor /> },
  { id: "light", label: "Light", icon: <Sun /> },
  { id: "dark", label: "Dark", icon: <Moon /> },
];

/**
 * The colour theme rows (System / Light / Dark), for dropping into a
 * `DropdownMenu`. The active option carries a trailing check; selecting one
 * flips the root `color-scheme` (see `theme.ts`).
 *
 * Rows rather than a control of its own: picking a theme is app chrome, so it
 * lives in the header's app menu next to About and the version. It used to be a
 * standalone header icon button whose glyph doubled as the current-theme
 * readout, which spent a permanent toolbar slot on something touched once per
 * install, and told you the state only if you already knew the glyphs.
 */
export function ThemeMenuItems() {
  const [theme, setTheme] = useTheme();

  return (
    <>
      {OPTIONS.map((o) => (
        <DropdownMenuItem
          key={o.id}
          icon={o.icon}
          onAction={() => setTheme(o.id)}
        >
          <span className="flex w-full items-center justify-between gap-3">
            {o.label}
            {o.id === theme && (
              <Check aria-hidden className="size-4 shrink-0" />
            )}
          </span>
        </DropdownMenuItem>
      ))}
    </>
  );
}
