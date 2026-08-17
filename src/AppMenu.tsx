import { useState } from "react";
import { ChevronDown, Info, Scale, Sparkles } from "lucide-react";

import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { Button } from "./misc/Button";
import { DropdownMenu, DropdownMenuItem } from "./misc/DropdownMenu";
import { UpdateModal } from "./updater/UpdateModal";
import { useUpdater } from "./updater/useUpdater";

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
 * for in a bug report, and it gives the "new version available" dot somewhere to
 * hang that already means "version".
 */
export const AppMenu = () => {
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const { update, install, installAndRelaunch } = useUpdater();

  return (
    <>
      <DropdownMenu
        trigger={
          // `aria-label` because the visible label is a bare number: "0.4.1"
          // announced on its own says nothing about what the button does, or
          // that the number is a version. The dot is decorative, so the label
          // is also the only place an update gets announced.
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronDown />}
            iconPosition="end"
            aria-label={
              `Application menu, version ${__APP_VERSION__}` +
              (update ? ", update available" : "")
            }
          >
            {__APP_VERSION__}
            {update && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-action"
              />
            )}
          </Button>
        }
      >
        {/* An available update is the only thing here anyone is waiting for, so
            it goes first and is absent the rest of the time. */}
        {update ? (
          <DropdownMenuItem
            icon={<Sparkles />}
            onAction={() => setShowUpdate(true)}
          >
            Update to {update.version}
          </DropdownMenuItem>
        ) : null}
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
      {update && (
        <UpdateModal
          open={showUpdate}
          currentVersion={update.currentVersion}
          version={update.version}
          notes={update.body}
          install={install}
          onInstall={installAndRelaunch}
          onClose={() => setShowUpdate(false)}
        />
      )}
    </>
  );
};
