import React from 'react';

export interface GenericModalProps {
  onClose?: () => void;
  className?: string;
  /**
   * Heading shown at the top of the modal. Rendered as the standard modal
   * title; pass plain text (or inline nodes) rather than your own heading.
   */
  title?: React.ReactNode;
  /**
   * Footer slot for action buttons, right-aligned with consistent spacing.
   * Drop `<Button>`s straight in — the layout (`justify-end gap-3`) is provided.
   */
  actions?: React.ReactNode;
  /** The modal body. */
  children: React.ReactNode;
}

// The shared modal shell every dialog in the app builds on: a styled native
// <dialog> on the `base-200` panel surface (matching the header and sidebars),
// with optional `title` and `actions` slots wrapping the `children` body so
// every modal's heading and footer line up identically.
export const GenericModal = React.forwardRef(({ onClose, children, className, title, actions }: GenericModalProps, ref: React.Ref<HTMLDialogElement>) => {
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`p-5 rounded-lg bg-base-200 text-base-content backdrop:bg-[rgba(0,0,0,0.5)] ${className}`}
    >
      {title != null && <h2 className="mb-3 text-lg font-medium">{title}</h2>}
      {children}
      {actions != null && (
        <div className="mt-5 flex justify-end gap-3">{actions}</div>
      )}
    </dialog>
  );
});
