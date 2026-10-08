/**
 * Keyboard shortcuts, as pure functions over a key event (build plan B5).
 *
 * | Key           | Action                         | Owner | Switchable in `/about/` |
 * | ------------- | ------------------------------ | ----- | ----------------------- |
 * | `?`           | go to the shortcuts list       | WP-30 | yes (single key)        |
 * | Alt+← / Alt+→ | previous / next page (pager)   | WP-30 | no                      |
 * | Escape        | close the open dialog or menu  | WP-30 | no                      |
 * | `/`, Ctrl+K   | open search                    | WP-33 | `/` yes, Ctrl+K no      |
 *
 * No shortcut ever fires while focus is in a field (`isTypingTarget`). WP-33 should handle `/`
 * and Ctrl+K in its own listener, checking `isTypingTarget(event.target)` first and, for `/`,
 * `shortcutsEnabled()` from `src/lib/store.ts`.
 */

export type ShortcutAction = 'help' | 'previous' | 'next';

/** The parts of a `KeyboardEvent` the matcher reads, so it can be tested without a DOM. */
export interface KeyLike {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey?: boolean;
  readonly isComposing?: boolean;
  readonly defaultPrevented?: boolean;
}

/** Input types that do not take typed text; a key pressed on them is not typing. */
const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * `true` when a key pressed on `target` is typing: a text field, a textarea, a select or anything
 * editable. Shortcuts must never fire then.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

/**
 * The action a key press asks for, or `undefined`. `singleKey` is the reader's setting; it only
 * gates the shortcuts that are one key with no modifier.
 */
export function matchShortcut(event: KeyLike, singleKey: boolean): ShortcutAction | undefined {
  if (event.defaultPrevented || event.isComposing) return undefined;
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    if (event.key === 'ArrowLeft') return 'previous';
    if (event.key === 'ArrowRight') return 'next';
    return undefined;
  }
  if (event.key === '?' && singleKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    return 'help';
  }
  return undefined;
}

/** The id of the shortcuts heading on `/about/`, which `?` goes to. */
export const SHORTCUTS_ANCHOR = 'keyboard-shortcuts';
