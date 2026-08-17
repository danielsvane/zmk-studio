import { useState } from "react";
import { ChevronDown, Info, Scale } from "lucide-react";

import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { Button } from "./misc/Button";
import { DropdownMenu, DropdownMenuItem } from "./misc/DropdownMenu";

/**
 * The application menu: everything about the app itself, as opposed to the
 * keyboard plugged into it. It sits beside the device menu in the header but is
 * deliberately separate and always present — the device menu is labelled with
 * the keyboard's name and doesn't exist until you connect, so About and the
 * license notice had no home there. They were mounted in `App.tsx` with state
 * nothing ever set, which meant neither modal could be opened at all.
 *
 * The version is the trigger's label rather than a row inside the menu. It's the
 * one thing here worth reading without a click, it's the first thing anyone asks
 * for in a bug report, and once the updater lands it gives the "new version
 * available" badge somewhere to hang that already means "version".
 */
export const AppMenu = () => {
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);

  return (
    <>
      <DropdownMenu
        trigger={
          // `aria-label` because the visible label is a bare number: "0.4.1"
          // announced on its own says nothing about what the button does, or
          // that the number is a version.
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronDown />}
            iconPosition="end"
            aria-label={`Application menu, version ${__APP_VERSION__}`}
          >
            {__APP_VERSION__}
          </Button>
        }
      >
        <DropdownMenuItem icon={<Info />} onAction={() => setShowAbout(true)}>
          About ZMK Studio
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<Scale />}
          onAction={() => setShowLicenseNotice(true)}
        >
          License notice
        </DropdownMenuItem>
      </DropdownMenu>
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <LicenseNoticeModal
        open={showLicenseNotice}
        onClose={() => setShowLicenseNotice(false)}
      />
    </>
  );
};
