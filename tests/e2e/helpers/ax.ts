/**
 * The accessible name the browser itself computed for an element, read from Chromium's
 * accessibility tree over the DevTools protocol (`Accessibility.getPartialAXTree`).
 *
 * Playwright's `toHaveAccessibleName` and `ariaSnapshot` compute names in their own code, so they
 * can pass while the browser exposes no name at all: main repair review pass 2, blocker 1, found
 * the sources checkbox named "" in Chromium's tree while both said "Show the other 38 sources".
 * Chromium only (CDP); every project that uses it runs on Chromium.
 */
import type { Page } from '@playwright/test';

export async function browserName(page: Page, selector: string): Promise<string> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('Accessibility.enable');
    const { root } = await session.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`No element for ${selector}`);
    const { nodes } = await session.send('Accessibility.getPartialAXTree', {
      nodeId,
      fetchRelatives: false,
    });
    const value = nodes[0]?.name?.value;
    return typeof value === 'string' ? value.trim() : '';
  } finally {
    await session.detach();
  }
}
