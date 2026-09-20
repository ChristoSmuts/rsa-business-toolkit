import { expect, test } from './fixtures';

test('home page renders under the base path', async ({ page }) => {
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
