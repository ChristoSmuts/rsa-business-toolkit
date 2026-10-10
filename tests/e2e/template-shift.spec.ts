import { expect, test } from './fixtures';
import { routeSameOrigin } from './helpers/network';

/**
 * A fillable template, wherever the reader is in the form when its script arrives (WP-50a review
 * pass 9, M1). With the reader in or below the line items, "Remove line" and "Add line" appeared,
 * the no-JavaScript totals line went, and the field they were filling in jumped 52 to 133px
 * (0.156 to 0.248). The sweep: the invoice, the quotation, the tax invoice and the privacy notice
 * (pass 10, m1), in both languages, at 360×740 and 320×568, the reader at every 120px from the
 * form's top to past the end of the tool, below the required items and the actions. Each position
 * is a fresh load with the modules held, scrolled there, then released: layout shift ≤ 0.1,
 * `scrollY` within 1px, and the field or text nearest the top of the screen within 2px.
 *
 * Shift is counted after the web fonts have landed (the fallback fonts' metrics are WP-50 Phase 2's).
 * Chromium only (`playwright.config.ts`): the sizes are set here.
 */
const SIZES = [
  { width: 360, height: 740 },
  { width: 320, height: 568 },
] as const;
const STEP = 120;

interface Run {
  readonly y: number;
  readonly shift: number;
  readonly scrolled: number;
  readonly field: string;
  readonly moved: number;
}

test.describe('a template: nothing moves when its script arrives, wherever the reader is', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
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

  for (const slug of ['invoice', 'quotation', 'tax-invoice', 'privacy-notice'] as const) {
    for (const lang of ['en', 'af'] as const) {
      for (const size of SIZES) {
        test(`${lang} ${slug}, ${size.width}×${size.height}`, async ({ page, baseURL }) => {
          test.setTimeout(180_000);
          await page.setViewportSize(size);
          const url = `${lang === 'en' ? '' : 'af/'}templates/${slug}/`;
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

          // The positions come from the page as it is before the script: from the form's top to
          // past the end of the template tool, below the required items and the actions (pass 10).
          await load();
          const ys = await page.evaluate((step) => {
            const form = document.querySelector('.st-tform')?.getBoundingClientRect();
            const tool = document.querySelector('st-template-form')?.getBoundingClientRect();
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const top = (form?.top ?? 0) + window.scrollY;
            const bottom = (tool?.bottom ?? 0) + window.scrollY + step;
            const out: number[] = [];
            for (let y = top; y <= bottom; y += step) out.push(Math.min(Math.round(y), max));
            return [...new Set(out)];
          }, STEP);

          const runs: Run[] = [];
          for (const y of ys) {
            open();
            await load();
            const before = await page.evaluate(async (target) => {
              window.scrollTo(0, target);
              await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
              (window as unknown as { stShifts: number[] }).stShifts.length = 0;
              // What the reader is looking at: the first field, heading, list item or paragraph,
              // in the tool or after it, whose top is on screen.
              const fields = [
                ...document.querySelectorAll<HTMLElement>(
                  '.st-tform input, .st-tform textarea, main h2, main h3, main li, main p',
                ),
              ];
              const field = fields.find((element) => {
                const box = element.getBoundingClientRect();
                // Not the waiting line, which the buttons replace by design.
                if (element.classList.contains('st-tool__waiting')) return false;
                return (
                  box.height > 0 &&
                  box.top >= 0 &&
                  box.top < window.innerHeight &&
                  getComputedStyle(element).visibility === 'visible'
                );
              });
              if (field) field.dataset['sweep'] = '';
              return {
                y: window.scrollY,
                field: field
                  ? field.id ||
                    field.getAttribute('name') ||
                    (field.textContent ?? '').trim().slice(0, 30) ||
                    field.tagName
                  : '',
                top: field?.getBoundingClientRect().top ?? Number.NaN,
              };
            }, y);
            open();
            await expect(page.locator('st-template-form')).toHaveAttribute('data-ready', '');
            const after = await page.evaluate(async () => {
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150))),
              );
              const shifts = (window as unknown as { stShifts: number[] }).stShifts;
              const field = document.querySelector<HTMLElement>('[data-sweep]');
              return {
                y: window.scrollY,
                shift: shifts.reduce((sum, value) => sum + value, 0),
                top: field?.getBoundingClientRect().top ?? Number.NaN,
              };
            });
            runs.push({
              y: before.y,
              shift: after.shift,
              scrolled: after.y - before.y,
              field: before.field,
              moved: before.field ? after.top - before.top : 0,
            });
          }
          open();

          const worst = {
            shift: Math.max(...runs.map((run) => run.shift)),
            scrolled: Math.max(...runs.map((run) => Math.abs(run.scrolled))),
            moved: Math.max(...runs.map((run) => Math.abs(run.moved))),
          };
          console.log(
            `template sweep ${lang} ${slug} ${size.width}x${size.height}: ${runs.length} positions, worst shift ${worst.shift.toFixed(3)}, worst scroll ${worst.scrolled.toFixed(1)}px, worst field movement ${worst.moved.toFixed(1)}px`,
          );
          const bad = runs
            .filter(
              (run) => run.shift > 0.1 || Math.abs(run.scrolled) > 1 || Math.abs(run.moved) > 2,
            )
            .map(
              (run) =>
                `at ${run.y}px: shift ${run.shift.toFixed(3)}, scrolled ${run.scrolled}px, ${run.field} moved ${run.moved.toFixed(1)}px`,
            );
          expect(bad).toEqual([]);
        });
      }
    }
  }
});
