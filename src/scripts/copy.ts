/*
 * <st-copy>: the copy button under a prompt (build plan B3 flow 6, C2).
 *
 * Astro renders the button `hidden` and an empty `role="status"` line; this element shows the
 * button, so without JavaScript there is no button that does nothing. Pressing it puts the whole
 * prompt — the `<pre>` in the same `<figure>`, with its line breaks — on the clipboard, changes the
 * label to "Copied" for a moment and says "Prompt 2 copied" in the status line (polite). When the
 * clipboard API is missing or refuses, the prompt's text is selected instead and the status line
 * says how to copy it by hand. Copied prompts are recorded in `promptsCopied` (`st.prompts.v1`).
 */
import { markPromptCopied } from '../lib/store';

/** How long the label says "Copied", and the status line its message, in milliseconds. */
export const COPIED_MS = 2000;
export const STATUS_MS = 4000;

/** The full text of the prompt: every character of the `<pre>`, line breaks included. */
export function promptText(pre: Element): string {
  return pre.textContent ?? '';
}

/** Selects the whole text of an element, for copying by hand. */
export function selectText(element: Element): void {
  const selection = element.ownerDocument.getSelection();
  if (!selection) return;
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

export class StCopy extends HTMLElement {
  #button: HTMLButtonElement | null = null;
  #label: Element | null = null;
  #status: Element | null = null;
  #labelText = '';
  #labelTimer: ReturnType<typeof setTimeout> | undefined;
  #statusTimer: ReturnType<typeof setTimeout> | undefined;

  readonly #onClick = (): void => {
    void this.copy();
  };

  connectedCallback(): void {
    this.#button = this.querySelector('button');
    this.#label = this.#button?.querySelector('.st-btn__label') ?? this.#button;
    this.#status = this.querySelector('[role="status"]');
    this.#labelText = this.#label?.textContent ?? '';
    if (!this.#button) return;
    this.#button.addEventListener('click', this.#onClick);
    this.#button.hidden = false;
  }

  disconnectedCallback(): void {
    this.#button?.removeEventListener('click', this.#onClick);
    clearTimeout(this.#labelTimer);
    clearTimeout(this.#statusTimer);
    if (this.#label) this.#label.textContent = this.#labelText;
  }

  /** The prompt this button copies. */
  get pre(): HTMLPreElement | null {
    return this.closest('figure')?.querySelector('pre') ?? null;
  }

  /** Copies the prompt; resolves `true` when it reached the clipboard. */
  async copy(): Promise<boolean> {
    const pre = this.pre;
    if (!pre) return false;
    const text = promptText(pre);
    let copied: boolean;
    try {
      if (!navigator.clipboard) throw new Error('No clipboard API');
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
    if (copied) {
      this.#showCopied();
      const id = this.dataset['promptId'];
      if (id) markPromptCopied(id);
    } else {
      selectText(pre);
      this.#say(this.dataset['failedMessage'] ?? '', false);
    }
    return copied;
  }

  #showCopied(): void {
    if (this.#label) this.#label.textContent = this.dataset['copied'] ?? this.#labelText;
    this.#button?.setAttribute('data-copied', 'true');
    clearTimeout(this.#labelTimer);
    this.#labelTimer = setTimeout(() => {
      if (this.#label) this.#label.textContent = this.#labelText;
      this.#button?.removeAttribute('data-copied');
    }, COPIED_MS);
    this.#say(this.dataset['copiedMessage'] ?? '', true);
  }

  /** Writes the status line; a success message clears itself, a failure stays. */
  #say(message: string, clears: boolean): void {
    if (!this.#status) return;
    clearTimeout(this.#statusTimer);
    this.#status.textContent = message;
    if (clears) {
      this.#statusTimer = setTimeout(() => {
        if (this.#status) this.#status.textContent = '';
      }, STATUS_MS);
    }
  }
}

if (!customElements.get('st-copy')) customElements.define('st-copy', StCopy);
