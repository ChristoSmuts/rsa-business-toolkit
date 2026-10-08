import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAll, promptsCopied } from '../../src/lib/store';
import { COPIED_MS, promptText, StCopy, STATUS_MS } from '../../src/scripts/copy';
import { mount } from './helpers';

const PROMPT = 'Line one with [YOUR NAME]\n\n  Line three, indented\n';

function figure(): string {
  return `
    <figure class="st-code" data-variant="prompt">
      <st-code-scroll><pre><code>Line one with <mark class="st-placeholder">[YOUR NAME]</mark>

  Line three, indented
</code></pre></st-code-scroll>
      <st-copy data-prompt-id="branding/x#b2" data-copied="Copied" data-copied-message="Prompt 2 copied" data-failed-message="Could not copy. The text is selected.">
        <button type="button" class="st-btn" aria-label="Copy prompt 2: Logo brief" hidden><span class="st-btn__label">Copy prompt</span></button>
        <p role="status"></p>
      </st-copy>
    </figure>`;
}

const button = (): HTMLButtonElement =>
  document.querySelector('st-copy button') as HTMLButtonElement;
const label = (): string => button().querySelector('.st-btn__label')?.textContent ?? '';
const status = (): string => document.querySelector('[role="status"]')?.textContent ?? '';

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

beforeEach(() => {
  clearAll();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('<st-copy>', () => {
  it('shows the server-rendered button only once it is connected', () => {
    const template = document.createElement('template');
    template.innerHTML = figure();
    expect(template.content.querySelector('button')?.hidden).toBe(true);
    document.body.append(template.content);
    expect(document.querySelector('st-copy')).toBeInstanceOf(StCopy);
    expect(button().hidden).toBe(false);
  });

  it('copies the whole prompt, line breaks and placeholders included', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    mount(figure());
    const copied = await (document.querySelector('st-copy') as StCopy).copy();
    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith(PROMPT);
  });

  it('says "Copied", announces it politely, then goes back', async () => {
    stubClipboard(async () => {});
    mount(figure());
    button().click();
    await vi.waitFor(() => expect(label()).toBe('Copied'));
    expect(status()).toBe('Prompt 2 copied');
    expect(button().getAttribute('aria-label')).toBe('Copy prompt 2: Logo brief');
    vi.advanceTimersByTime(COPIED_MS);
    expect(label()).toBe('Copy prompt');
    vi.advanceTimersByTime(STATUS_MS);
    expect(status()).toBe('');
  });

  it('records the copied prompt in the store', async () => {
    stubClipboard(async () => {});
    mount(figure());
    await (document.querySelector('st-copy') as StCopy).copy();
    expect(Object.keys(promptsCopied.get())).toEqual(['branding/x#b2']);
  });

  it('selects the text and says how to copy it when the clipboard refuses', async () => {
    stubClipboard(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    mount(figure());
    const copied = await (document.querySelector('st-copy') as StCopy).copy();
    expect(copied).toBe(false);
    expect(status()).toBe('Could not copy. The text is selected.');
    expect(document.getSelection()?.toString()).toBe(PROMPT);
    vi.advanceTimersByTime(STATUS_MS * 2);
    expect(status()).toBe('Could not copy. The text is selected.');
    expect(promptsCopied.get()).toEqual({});
  });

  it('falls back the same way when there is no clipboard API', async () => {
    mount(figure());
    expect(await (document.querySelector('st-copy') as StCopy).copy()).toBe(false);
    expect(status()).toMatch(/Could not copy/);
  });

  it('is pressed with Enter or Space like any button', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    mount(figure());
    button().focus();
    expect(document.activeElement).toBe(button());
    // A native <button> turns Enter and Space into a click; the element listens for the click.
    button().click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  });

  it('stops listening and restores its label when it disconnects', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    mount(figure());
    button().click();
    await vi.waitFor(() => expect(label()).toBe('Copied'));
    const element = document.querySelector('st-copy') as StCopy;
    const kept = button();
    element.remove();
    expect(kept.querySelector('.st-btn__label')?.textContent).toBe('Copy prompt');
    kept.click();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a prompt or a button', async () => {
    mount('<st-copy><p role="status"></p></st-copy>');
    expect(await (document.querySelector('st-copy') as StCopy).copy()).toBe(false);
  });
});

describe('promptText', () => {
  it('is the text of the <pre>, unchanged', () => {
    mount(figure());
    expect(promptText(document.querySelector('pre') as Element)).toBe(PROMPT);
  });
});
