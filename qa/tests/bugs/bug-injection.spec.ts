import { test, expect, type Page } from '@playwright/test';

/**
 * Bug-injection verification (QA training).
 *
 * The app ships a "🐛 Bug Injection Panel" (js/bugs.js) that toggles known defects.
 * Active bugs persist in localStorage under `techshop-bugs` and re-apply on every page
 * load via `applyActiveBugs()`. These tests prove the QA suite *catches* an injected bug:
 * we assert the healthy state, inject the bug, then assert the broken state appears.
 *
 * ── IMPORTANT: instrumentation gap ───────────────────────────────────────────────
 * Because the app source is intentionally left untouched, only the bugs whose targets
 * already exist in the markup actually fire:
 *
 *   ✅ bug-primary-color  → flips the `--primary` CSS variable
 *   ✅ bug-hide-logo      → hides `[data-testid="logo"]`
 *
 * The other 8 panel bugs target hooks that are NOT in the current HTML
 * (`[data-testid="hero"]`, `product-name-*`, `product-price-*`, `add-to-cart-*`,
 * `[data-testid="product-grid"]`, `[data-testid="category-filter"]`,
 * `[data-testid="cart-count"]`, `[data-testid="checkout-btn"]`), so they are no-ops.
 * The final test below pins that gap. To enable those bugs, add the matching testids
 * to the product-card template and form controls, then write their verification here.
 */

/** Pre-seed active bugs so they apply during the page's own DOMContentLoaded handler. */
async function withBugs(page: Page, bugIds: string[]) {
  await page.addInitScript((ids) => {
    localStorage.setItem('techshop-bugs', JSON.stringify(ids));
  }, bugIds);
}

test.describe('Bugs that fire on the untouched app', () => {
  test('healthy: logo is visible and primary colour is the brand default', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByTestId('logo')).toBeVisible();

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    );
    expect(primary).not.toBe('#ff4444');
  });

  test('bug-hide-logo is caught: the navbar logo disappears', async ({ page }) => {
    await withBugs(page, ['bug-hide-logo']);
    await page.goto('/index.html');

    // A visibility check that passes on a healthy build now fails — bug caught.
    await expect(page.getByTestId('logo')).toBeHidden();
  });

  test('bug-primary-color is caught: --primary flips to red', async ({ page }) => {
    await withBugs(page, ['bug-primary-color']);
    await page.goto('/index.html');

    const primary = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--primary').trim()
    );
    expect(primary).toBe('#ff4444');
  });

  test('toggling a bug through the panel UI persists and applies', async ({ page }) => {
    await page.goto('/index.html');

    await page.getByTestId('bug-panel-toggle').click();
    await page.getByTestId('bug-toggle-bug-hide-logo').click();
    await expect(page.getByTestId('logo')).toBeHidden();

    // Persisted across reloads.
    await page.reload();
    await expect(page.getByTestId('logo')).toBeHidden();
  });
});

test.describe('Instrumentation gap (dormant bugs)', () => {
  test('panel bugs that need product-card / form testids are currently no-ops', async ({ page }) => {
    await page.goto('/products.html');

    // These are the hooks js/bugs.js reaches for but the markup does not provide.
    const missing = [
      '[data-testid="hero"]',
      '[data-testid="product-grid"]',
      '[data-testid="category-filter"]',
      '[data-testid="cart-count"]',
      '[data-testid="checkout-btn"]',
      '[data-testid^="product-name-"]',
      '[data-testid^="product-price-"]',
      '[data-testid^="add-to-cart-"]',
    ];

    for (const sel of missing) {
      await expect(
        page.locator(sel),
        `Expected ${sel} to be absent on the untouched app — add it to enable the matching bug`
      ).toHaveCount(0);
    }
  });
});
