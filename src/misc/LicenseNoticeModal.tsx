import { useModalRef } from "./useModalRef";

import NOTICE from "../../NOTICE?raw";
import { GenericModal } from "../GenericModal";
import { Button } from "./Button";

export interface LicenseNoticeModalProps {
  open: boolean;
  onClose: () => void;
}

export const LicenseNoticeModal = ({
  open,
  onClose,
}: LicenseNoticeModalProps) => {
  const ref = useModalRef(open, true);

  return (
    <GenericModal
      ref={ref}
      className="min-w-min w-[60vw]"
      onClose={onClose}
      title="License notice"
      actions={
        <Button variant="secondary" onPress={onClose}>
          Close
        </Button>
      }
    >
      <p>
        ZMK Studio is released under the open source Apache 2.0 license. A copy
        of the NOTICE file from the ZMK Studio repository is included here:
      </p>
      <pre className="m-4 font-mono text-xs">{NOTICE}</pre>
    </GenericModal>
  );
};
