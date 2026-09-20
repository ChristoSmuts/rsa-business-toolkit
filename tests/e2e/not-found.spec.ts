import { randomUUID } from 'node:crypto';
import { allowConsoleError, expect, test } from './fixtures';
import { documentUrlProblems } from './helpers/page-checks';
import { hasNotFoundPage } from './helpers/routes';

/**
 * Unknown URLs under the base path must get the 404 page with a 404 status. The page contract, the
 * no-JS check and axe also run on `/404.html` itself (it is part of `pageRoutes()`).
 */

const notFoundBuilt = hasNotFoundPage();
const SKIP_REASON =
  'dist/404.html does not exist yet (src/pages/404.astro arrives in a later package). Run `pnpm build` after it lands.';

const cases = [
  { name: 'English', prefix: '' },
  { name: 'Afrikaans', prefix: 'af/' },
] as const;

test.describe('404 under the base path', () => {
  for (const { name, prefix } of cases) {
    test(
      `unknown ${name} URL serves the 404 page`,
      {
        annotation: allowConsoleError(
          '/status of 404/',
          'Browsers log the 404 status of the document itself as a console error.',
        ),
      },
      async ({ page, basePath }) => {
        test.skip(!notFoundBuilt, SKIP_REASON);
        const url = `${prefix}nonexistent-${randomUUID().slice(0, 8)}/`;
        const response = await page.goto(url);
        expect(response?.status(), `status for ${basePath}${url}`).toBe(404);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await documentUrlProblems(page, basePath), 'URL problems').toEqual([]);
      },
    );
  }
});
