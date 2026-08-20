import { useState } from "react";
import { EllipsisVertical, Info, Scale, Sparkles } from "lucide-react";

import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { Button } from "./misc/Button";
import { DropdownMenu, DropdownMenuItem } from "./misc/DropdownMenu";
import { ThemeMenuItems } from "./misc/ThemeMenuItems";
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
 * An overflow `...` rather than a labelled trigger, and the last thing in the
 * header: everything behind it is about the app, so it shouldn't compete with
 * the keymap actions (undo/redo/save/discard) or the device menu beside it. The
 * version used to *be* the trigger, a bordered pill reading "0.5.0" with a
 * chevron, which is the app's input look plus a value plus a picker affordance:
 * it read as a version *selector*. A version is a fact, so it's now a static
 * line at the foot of the menu (and in About, which is the copy a screen reader
 * can reach).
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
        footer={`Version ${__APP_VERSION__}`}
        trigger={
          <Button
            variant="ghost"
            className="relative"
            icon={
              <>
                <EllipsisVertical />
                {update && (
                  // Anchored to the *glyph's* top-right corner, not the 48px
                  // button's: at the button corner it floats in empty space and
                  // stops reading as a mark on the icon.
                  //
                  // `action` rather than a warning colour: an update is news
                  // worth acting on, not something wrong, and this is the same
                  // blue as the Update button the dot leads to. One of the few
                  // direct uses of the token outside `variant="primary"`, since
                  // there's no button here to carry it.
                  <span
                    aria-hidden
                    className="absolute top-3 right-3 size-2 rounded-full bg-action"
                  />
                )}
              </>
            }
            // The dot is decorative, so the label is the only place an update is
            // announced. No version here: on a `...` it would be noise, and the
            // menu carries it.
            aria-label={
              update ? "Application menu, update available" : "Application menu"
            }
          />
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
        {/* Theme sits above About/License because it's the only thing here
            anyone changes more than once. */}
        <ThemeMenuItems />
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
