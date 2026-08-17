import { useState } from "react";
import { ChevronDown, Info, Scale, Sparkles } from "lucide-react";

import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { Button } from "./misc/Button";
import { DropdownMenu, DropdownMenuItem } from "./misc/DropdownMenu";
import { UpdateModal } from "./updater/UpdateModal";
import { useUpdater, type InstallState } from "./updater/useUpdater";

/**
 * Just the fields the UI reads off an update. Declared here rather than reusing
 * the plugin's `Update` so the view has no Tauri dependency and can be rendered
 * anywhere; `Update` satisfies it structurally, so the container passes one
 * straight through.
 */
export interface AvailableUpdate {
  currentVersion: string;
  version: string;
  body?: string;
}

export interface AppMenuViewProps {
  update: AvailableUpdate | null;
  install: InstallState;
  onInstall: () => void;
}

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
 *
 * Split from `AppMenu` for the same reason `UpdateModal` takes plain props: the
 * update states are Tauri-only through the hook, so this is the seam that lets
 * them be seen and tested without a release to install.
 */
export const AppMenuView = ({
  update,
  install,
  onInstall,
}: AppMenuViewProps) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

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
          onInstall={onInstall}
          onClose={() => setShowUpdate(false)}
        />
      )}
    </>
  );
};

/** The live menu: {@link AppMenuView} wired to the real updater. */
export const AppMenu = () => {
  const { update, install, installAndRelaunch } = useUpdater();

  return (
    <AppMenuView
      update={update}
      install={install}
      onInstall={installAndRelaunch}
    />
  );
};
