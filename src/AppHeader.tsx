import { Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import { Button, ToggleButton } from "./misc/Button";
import type { Page } from "./keyboard/Keyboard";
import { useConnectedDeviceData } from "./rpc/useConnectedDeviceData";
import { useSub } from "./usePubSub";
import { useContext, useEffect, useState } from "react";
import { useModalRef } from "./misc/useModalRef";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { ChevronDown, Undo2, Redo2, Save, Trash2 } from "lucide-react";
import { Tooltip } from "./misc/Tooltip";
import { GenericModal } from "./GenericModal";

export interface AppHeaderProps {
  connectedDeviceLabel?: string;
  page?: Page;
  onPageChange?: (page: Page) => void;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void | Promise<void>;
  onUndo?: () => Promise<void>;
  onRedo?: () => Promise<void>;
  onResetSettings?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  canUndo?: boolean;
  canRedo?: boolean;
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "layers", label: "Layers" },
  { id: "combos", label: "Combos" },
  { id: "behaviours", label: "Behaviours" },
];

export const AppHeader = ({
  connectedDeviceLabel,
  page,
  onPageChange,
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  onSave,
  onDiscard,
  onDisconnect,
  onResetSettings,
}: AppHeaderProps) => {
  const [showSettingsReset, setShowSettingsReset] = useState(false);

  const lockState = useContext(LockStateContext);
  const connectionState = useContext(ConnectionContext);

  useEffect(() => {
    if (
      (!connectionState.conn ||
        lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) &&
      showSettingsReset
    ) {
      setShowSettingsReset(false);
    }
  }, [lockState, showSettingsReset, connectionState.conn]);

  const showSettingsRef = useModalRef(showSettingsReset);
  const [keymapUnsaved, setKeymapUnsaved] = useConnectedDeviceData<boolean>(
    { keymap: { checkUnsavedChanges: true } },
    (r) => r.keymap?.checkUnsavedChanges
  );

  useSub<boolean>("rpc_notification.keymap.unsavedChangesStatusChanged", (unsaved) =>
    setKeymapUnsaved(unsaved)
  );

  // Combos share the same unsaved indicator + Save/Discard buttons as the
  // keymap (M3). Track their unsaved state independently and OR the two.
  const [combosUnsaved, setCombosUnsaved] = useConnectedDeviceData<boolean>(
    { combos: { checkUnsavedChanges: true } },
    (r) => r.combos?.checkUnsavedChanges
  );

  useSub<boolean>("rpc_notification.combos.unsavedChangesStatusChanged", (unsaved) =>
    setCombosUnsaved(unsaved)
  );

  // Custom behaviours share the same unsaved indicator + Save/Discard buttons
  // (M6). Track their unsaved state independently and OR it into the rest.
  const [behaviorsUnsaved, setBehaviorsUnsaved] = useConnectedDeviceData<boolean>(
    { behaviors: { checkUnsavedChanges: true } },
    (r) => r.behaviors?.checkUnsavedChanges
  );

  useSub<boolean>("rpc_notification.behaviors.unsavedChangesStatusChanged", (unsaved) =>
    setBehaviorsUnsaved(unsaved)
  );

  const unsaved = !!keymapUnsaved || !!combosUnsaved || !!behaviorsUnsaved;

  return (
    <header className="top-0 left-0 right-0 flex items-center justify-between gap-2 h-10 max-w-full">
      <div className="flex items-center gap-3 px-3 min-w-0">
        <div className="flex items-center gap-1">
          <img src="/zmk.svg" alt="ZMK Logo" className="h-8 rounded" />
          <p>Studio</p>
        </div>
        {connectedDeviceLabel && (
          <nav aria-label="Sections" className="flex items-center gap-1">
            {NAV_ITEMS.map(({ id, label }) => (
              <ToggleButton
                key={id}
                variant="ghost"
                isSelected={page === id}
                onPress={() => onPageChange?.(id)}
              >
                {label}
              </ToggleButton>
            ))}
          </nav>
        )}
      </div>
      <GenericModal ref={showSettingsRef} className="max-w-[50vw]">
        <h2 className="my-2 text-lg">Restore Stock Settings</h2>
        <div>
          <p>
            Settings reset will remove any customizations previously made in ZMK
            Studio and restore the stock keymap
          </p>
          <p>Continue?</p>
          <div className="flex justify-end my-2 gap-3">
            <Button
              variant="secondary"
              onPress={() => setShowSettingsReset(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                setShowSettingsReset(false);
                onResetSettings?.();
              }}
            >
              Restore Stock Settings
            </Button>
          </div>
        </div>
      </GenericModal>
      <div className="flex items-center justify-end gap-1 px-2">
        {onUndo && (
          <Tooltip label="Undo">
            <Button
              variant="ghost"
              icon={<Undo2 />}
              aria-label="Undo"
              isDisabled={!canUndo}
              onPress={onUndo}
            />
          </Tooltip>
        )}

        {onRedo && (
          <Tooltip label="Redo">
            <Button
              variant="ghost"
              icon={<Redo2 />}
              aria-label="Redo"
              isDisabled={!canRedo}
              onPress={onRedo}
            />
          </Tooltip>
        )}
        <Tooltip label="Save">
          <Button
            variant="ghost"
            icon={<Save />}
            aria-label="Save"
            isDisabled={!unsaved}
            onPress={onSave}
          />
        </Tooltip>
        <Tooltip label="Discard">
          <Button
            variant="ghost"
            icon={<Trash2 />}
            aria-label="Discard"
            onPress={onDiscard}
            isDisabled={!unsaved}
          />
        </Tooltip>
        {connectedDeviceLabel && (
          <MenuTrigger>
            <Button variant="ghost" icon={<ChevronDown />} iconPosition="end">
              {connectedDeviceLabel}
            </Button>
            <Popover>
              <Menu className="shadow-md rounded bg-base-100 text-base-content cursor-pointer overflow-hidden">
                <MenuItem
                  className="px-2 py-1 hover:bg-base-200"
                  onAction={onDisconnect}
                >
                  Disconnect
                </MenuItem>
                <MenuItem
                  className="px-2 py-1 hover:bg-base-200"
                  onAction={() => setShowSettingsReset(true)}
                >
                  Restore Stock Settings
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        )}
      </div>
    </header>
  );
};
