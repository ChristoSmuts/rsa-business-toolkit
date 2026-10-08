/*
 * Opens a `ConfirmDialog` (`src/components/ui/ConfirmDialog.astro`) and reports the answer.
 *
 * The dialog's own `<form method="dialog">` closes it and sets `returnValue`; Escape closes it
 * with the value left empty, which counts as "no". Focus goes back to the control that opened
 * it, whichever way it closed.
 */

/** Shows the dialog modally; resolves `true` only when the confirm button closed it. */
export function askToConfirm(
  dialog: HTMLDialogElement,
  opener?: HTMLElement | null,
): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.returnValue = '';
    const onClose = (): void => {
      dialog.removeEventListener('close', onClose);
      opener?.focus();
      resolve(dialog.returnValue === 'confirm');
    };
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

/** Writes a message into a polite status line and clears it after `ms` (0 keeps it). */
export function announce(region: Element | null, message: string, ms = 6000): void {
  if (!region) return;
  region.textContent = '';
  // A fresh text node in an existing live region is what screen readers announce reliably.
  region.textContent = message;
  if (ms > 0) {
    setTimeout(() => {
      if (region.textContent === message) region.textContent = '';
    }, ms);
  }
}
