import type { Page } from '@playwright/test';

/**
 * Waits until the page is parsed and no web font is still loading, then two frames for layout.
 *
 * Use it instead of `document.fonts.ready` on a page whose modules are held (`holdModules`):
 * WebKit resolves `fonts.ready` only after the `load` event, which a held module blocks, so the
 * test timed out there on every run (CI, 10 October 2026). Each face's own `status` does not wait
 * for `load` in any engine.
 */
export async function fontsSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      document.readyState !== 'loading' &&
      [...document.fonts].every((face) => face.status !== 'loading'),
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
