import React from 'react';
import { UNSAFE_PortalProvider } from 'react-aria';

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
  // `showModal()` puts the <dialog> in the browser's *top layer*, which paints
  // above everything in the normal stacking context no matter its z-index. A
  // react-aria overlay (Tooltip, Select/Combobox popover, DropdownMenu, InfoTip)
  // portals to document.body by default — outside the dialog, therefore *under*
  // it, where it's half-occluded by the panel and dimmed by the backdrop. Giving
  // every overlay inside the modal a portal container *within* the <dialog> puts
  // it in the same top layer, so it paints on top like it does anywhere else.
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  // Merge our ref with the caller's (`useModalRef`, which drives open/close):
  // we need the element too, and a bare `ref={ref}` would hand it over entirely.
  const setDialog = React.useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDialogElement | null>).current = node;
    },
    [ref]
  );

  return (
    <dialog
      ref={setDialog}
      onClose={onClose}
      // `overflow-visible` overrides the UA default `overflow: auto`, which
      // clips an overlay to the dialog's box — a tooltip or popover hanging off
      // a control near the edge of a small dialog is mostly *outside* it, so the
      // portal above only gets it into the top layer; this is what lets it be
      // seen. A modal with more content than fits should own an inner
      // `overflow-auto` region (the pattern the app's panels already use, see
      // index.css) rather than lean on the dialog scrolling.
      className={`p-5 rounded-lg bg-base-200 text-base-content overflow-visible backdrop:bg-[rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Read lazily, when an overlay actually opens — by then the ref is set. */}
      <UNSAFE_PortalProvider getContainer={() => dialogRef.current}>
        {title != null && (
          <h2 className="mb-3 text-lg font-semibold text-base-content-strong">
            {title}
          </h2>
        )}
        {children}
        {actions != null && (
          <div className="mt-5 flex justify-end gap-3">{actions}</div>
        )}
      </UNSAFE_PortalProvider>
    </dialog>
  );
});
