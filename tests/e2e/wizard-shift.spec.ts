import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { routeSameOrigin } from './helpers/network';

/**
 * WP-50a review pass 4, M1: wherever the reader is when the wizard's script arrives, nothing on
 * screen moves and the page does not scroll by itself. Three passes in a row found a shift at a
 * scroll position the tests had not tried (the help lines at question 2, the stepper at the top,
 * the footer near the end of a question), so this sweeps them: the wizard's top at every 60px from
 * the top of the screen to past the end of the form, each step's end near the bottom of the
 * screen, and the page scrolled to the end, with the footer in view. No answers are given, so
 * every "earlier question" line that can show does.
 *
 * Each position is a fresh load with the modules held, scrolled there, then released. Layout shift
 * is counted from the release only. Before it, the web fonts land: a late font swap moves wrapped
 * text everywhere on the page, the reader's question included (0.28 to 0.40 at 320px), which is the
 * fallback fonts' metrics and the revamp's to fix (WP-50, Phase 2), not the wizard's.
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
          shifts.push((entry as PerformanceEntry & { value: number }).value);
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
          `wizard sweep ${lang} ${size.width}x${size.height}: ${runs.length} positions, worst shift ${worst.shift.toFixed(3)}, worst scroll movement ${worst.moved.toFixed(1)}px`,
        );
        const bad = runs
          .filter((run) => run.shift > 0.1 || Math.abs(run.moved) > 1)
          .map((run) => `at ${run.y}px: shift ${run.shift.toFixed(3)}, scrolled ${run.moved}px`);
        expect(bad).toEqual([]);
      });
    }
  }
});
