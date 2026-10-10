import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { routeSameOrigin } from './helpers/network';

/**
 * Find my path, wherever the reader is and whatever they do first (WP-50a review passes 4 and 5).
 *
 * 1. The script arrives: the wizard's top at every 60px from the top of the screen to past the end
 *    of the form as it is before the script, each step's end near the bottom of the screen, and the
 *    end of the page. Each position is a fresh load with the modules held, scrolled there, then
 *    released: from the release, layout shift ≤ 0.1 and `scrollY` moves by at most 1px.
 * 2. An ordinary load: the empty page between question 1's Next and the footer stays within 150px
 *    of `204a2a2`'s (119 to 141px). Pass 4's height hold left 1,514 to 2,315px there.
 * 3. The reader's first tap and their Next and Back, from the top and with question 1's last answer
 *    near the bottom of the screen: the tapped answer stays within 1px, the page does not scroll, the
 *    footer does not come up into view, and nothing shifts that the reader did not cause.
 *
 * Shift is counted after the web fonts have landed. A late font swap moves wrapped text everywhere
 * on the page, the reader's question included (0.28 to 0.40 at 320px), which is the fallback fonts'
 * metrics and the revamp's to fix (WP-50, Phase 2), not the wizard's. Shifts within 500ms of the
 * reader's own input do not count, as in the browser's own measure.
 *
 * Chromium only (`playwright.config.ts`): the sizes are set here.
 */
const SIZES = [
  { width: 412, height: 839 },
  { width: 360, height: 740 },
  { width: 320, height: 568 },
  { width: 1280, height: 720 },
] as const;
const STEP = 60;

interface Run {
  readonly y: number;
  readonly shift: number;
  readonly moved: number;
}

/** The scroll positions to try, from one load with the modules running. */
async function positions(page: Page): Promise<number[]> {
  const layout = await page.evaluate(() => {
    const wizard = document.querySelector('st-wizard')?.getBoundingClientRect();
    const steps = [...document.querySelectorAll('[data-step]')].map(
      (step) => step.getBoundingClientRect().bottom + window.scrollY,
    );
    return {
      top: (wizard?.top ?? 0) + window.scrollY,
      bottom: (wizard?.bottom ?? 0) + window.scrollY,
      steps,
      max: document.documentElement.scrollHeight - window.innerHeight,
      height: window.innerHeight,
    };
  });
  const ys = new Set<number>([0, layout.max]);
  for (let y = layout.top; y <= layout.bottom + STEP; y += STEP) ys.add(Math.round(y));
  // The end of each question just above the bottom of the screen.
  for (const bottom of layout.steps) ys.add(Math.round(bottom - layout.height + 40));
  return [...ys].filter((y) => y >= 0 && y <= layout.max).sort((a, b) => a - b);
}

test.describe('Find my path: nothing moves when the script arrives, at any scroll position', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Each position is a new load of the same address, which Chromium treats like a reload and
      // would scroll back to the last position once the page has loaded.
      window.history.scrollRestoration = 'manual';
      const shifts: number[] = [];
      Object.assign(window, { stShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) shifts.push(shift.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
  });

  for (const size of SIZES) {
    for (const lang of ['en', 'af'] as const) {
      test(`${lang}, ${size.width}×${size.height}`, async ({ page, baseURL }) => {
        test.setTimeout(240_000);
        await page.setViewportSize(size);
        const url = `${lang === 'en' ? '' : 'af/'}find-my-path/`;
        // One route for the whole sweep; each load gets its own gate.
        let gate: Promise<void> = Promise.resolve();
        let open: () => void = () => {};
        await routeSameOrigin(
          page,
          baseURL,
          (target) =>
            /\/_astro\/.+\.js$/.test(target.pathname) && !target.pathname.includes('theme-init'),
          async (route) => {
            await gate;
            await route.continue();
          },
        );
        const load = async (): Promise<void> => {
          gate = new Promise<void>((resolve) => {
            open = resolve;
          });
          await page.goto(url, { waitUntil: 'commit' });
          await expect(page.locator('footer.st-footer')).toBeAttached();
          await page.evaluate(() => document.fonts.ready);
        };

        // The positions come from the page as it is before the script: the no-JavaScript form.
        await load();
        const ys = await positions(page);

        const runs: Run[] = [];
        for (const y of ys) {
          open();
          await load();
          const before = await page.evaluate(async (target) => {
            window.scrollTo(0, target);
            await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
            (window as unknown as { stShifts: number[] }).stShifts.length = 0;
            return window.scrollY;
          }, y);
          open();
          await expect(page.locator('st-wizard')).toHaveAttribute('data-ready', '');
          const after = await page.evaluate(async () => {
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150))),
            );
            const shifts = (window as unknown as { stShifts: number[] }).stShifts;
            return { y: window.scrollY, shift: shifts.reduce((sum, value) => sum + value, 0) };
          });
          runs.push({ y: before, shift: after.shift, moved: after.y - before });
        }
        open();

        const worst = {
          shift: Math.max(...runs.map((run) => run.shift)),
          moved: Math.max(...runs.map((run) => Math.abs(run.moved))),
        };
        test.info().annotations.push({
          type: 'sweep',
          description: `${runs.length} positions; worst layout shift ${worst.shift.toFixed(3)}, worst scroll movement ${worst.moved.toFixed(1)}px`,
        });
        console.log(
          `wizard arrival ${lang} ${size.width}x${size.height}: ${runs.length} positions, worst shift ${worst.shift.toFixed(3)}, worst scroll movement ${worst.moved.toFixed(1)}px`,
        );
        const bad = runs
          .filter((run) => run.shift > 0.1 || Math.abs(run.moved) > 1)
          .map((run) => `at ${run.y}px: shift ${run.shift.toFixed(3)}, scrolled ${run.moved}px`);
        expect(bad).toEqual([]);
      });
    }
  }
});

/** Empty page between question 1's Next and the footer at `204a2a2`, from review pass 5. */
const GAP_204A2A2: Record<string, number> = {
  'en 412': 119,
  'af 412': 141,
  'en 360': 141,
  'af 360': 141,
  'en 320': 141,
  'af 320': 141,
  'en 1280': 120,
  'af 1280': 120,
};

test.describe('Find my path: no gap below the question, and nothing moves under the reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { stShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) shifts.push(shift.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
  });

  /** Shift since the last call, with nothing the reader caused counted. */
  const takeShift = (page: Page): Promise<number> =>
    page.evaluate(() => {
      const shifts = (window as unknown as { stShifts: number[] }).stShifts;
      const sum = shifts.reduce((total, value) => total + value, 0);
      shifts.length = 0;
      return sum;
    });
  const settle = (page: Page): Promise<unknown> =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150))),
        ),
    );
  const where = (page: Page, selector: string) =>
    page.evaluate((target) => {
      const element = document.querySelector(target);
      const footer = document.querySelector('footer.st-footer');
      return {
        y: window.scrollY,
        top: element?.getBoundingClientRect().top ?? Number.NaN,
        footer: footer?.getBoundingClientRect().top ?? Number.NaN,
        height: window.innerHeight,
      };
    }, selector);

  for (const size of SIZES) {
    for (const lang of ['en', 'af'] as const) {
      test(`${lang}, ${size.width}×${size.height}`, async ({ page }) => {
        await page.setViewportSize(size);
        const url = `${lang === 'en' ? '' : 'af/'}find-my-path/`;
        await page.goto(url);
        await expect(page.locator('st-wizard')).toHaveAttribute('data-ready', '');
        await page.evaluate(() => document.fonts.ready);

        // 2. The gap below question 1's Next.
        const gap = await page.evaluate(() => {
          const nav = document.querySelector('[data-step="entity"] .st-wizard__nav');
          const footer = document.querySelector('footer.st-footer');
          return (
            (footer?.getBoundingClientRect().top ?? 0) - (nav?.getBoundingClientRect().bottom ?? 0)
          );
        });
        const base = GAP_204A2A2[`${lang} ${size.width}`] ?? 141;
        expect(gap, `empty page below Next (204a2a2: ${base}px)`).toBeLessThanOrEqual(base + 150);

        // 3. The first tap, then Next and Back, from the top and with the last answer low on screen.
        const notes: string[] = [];
        let worstShift = 0;
        let worstTapScroll = 0;
        let worstFocusScroll = 0;
        for (const position of [
          'first answer near the top',
          'last answer near the bottom',
        ] as const) {
          await page.goto(url);
          await expect(page.locator('st-wizard')).toHaveAttribute('data-ready', '');
          await page.evaluate(() => document.fonts.ready);
          // The reader scrolls the answer they tap into view first, as Playwright would otherwise.
          const low = position === 'last answer near the bottom';
          const answer = `[data-step="entity"] .st-choice:${low ? 'last' : 'first'}-of-type input`;
          await page.evaluate(
            ([target, bottom]) => {
              const box = document.querySelector(target)?.closest('label')?.getBoundingClientRect();
              if (!box) return;
              window.scrollBy(0, bottom ? box.bottom - window.innerHeight + 40 : box.top - 80);
            },
            [answer, low] as const,
          );
          await settle(page);
          await takeShift(page);

          const before = await where(page, answer);
          await page.locator(answer).check();
          await settle(page);
          const tapped = await where(page, answer);
          const tapShift = await takeShift(page);
          worstShift = Math.max(worstShift, tapShift);
          worstTapScroll = Math.max(worstTapScroll, Math.abs(tapped.y - before.y));
          if (Math.abs(tapped.top - before.top) > 1)
            notes.push(`${position}: the tapped answer moved ${tapped.top - before.top}px`);
          if (Math.abs(tapped.y - before.y) > 1)
            notes.push(`${position}: the tap scrolled the page ${tapped.y - before.y}px`);
          if (before.footer >= before.height && tapped.footer < before.height)
            notes.push(`${position}: the footer came up into view on the tap`);
          if (tapShift > 0.1) notes.push(`${position}: the tap gave a shift of ${tapShift}`);

          for (const [button, heading] of [
            ['[data-step="entity"] [data-next]', '#wz-h-type'],
            ['[data-step="type"] [data-back]', '#wz-h-entity'],
          ] as const) {
            if (button.includes('data-back')) {
              await page.locator('[data-step="type"] input').first().check();
              await settle(page);
            }
            await page.locator(button).scrollIntoViewIfNeeded();
            await settle(page);
            const pressed = await where(page, button);
            await page.locator(button).click();
            await expect(page.locator(heading)).toBeFocused();
            await expect(page.locator(heading)).toBeInViewport();
            await settle(page);
            const after = await where(page, heading);
            const shift = await takeShift(page);
            worstShift = Math.max(worstShift, shift);
            worstFocusScroll = Math.max(worstFocusScroll, Math.abs(after.y - pressed.y));
            if (shift > 0.1) notes.push(`${position}, ${button}: a shift of ${shift}`);
            // Moving focus to the new heading may scroll up to it; never down past it.
            if (after.y > pressed.y + 1)
              notes.push(`${position}, ${button}: the page scrolled down ${after.y - pressed.y}px`);
          }
        }
        console.log(
          `wizard reader ${lang} ${size.width}x${size.height}: gap below Next ${Math.round(gap)}px (204a2a2 ${base}px), worst shift ${worstShift.toFixed(3)}, worst scroll on a tap ${worstTapScroll.toFixed(1)}px, worst scroll up to the new heading on Next or Back ${worstFocusScroll.toFixed(1)}px`,
        );
        expect(notes).toEqual([]);
      });
    }
  }
});
