/**
 * Parses markup off the page, then connects it, as a browser does when a module script runs after
 * the document is parsed. happy-dom connects elements set through `innerHTML` before their
 * children are parsed, which a real page never does, so tests mount through this instead.
 */
export function mount(html: string, parent: Element = document.body): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  parent.append(template.content);
}

/** A key press on `target` (default: the focused element), bubbling to the document. */
export function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document.activeElement ?? document.body,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}
