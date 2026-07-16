// tests/fixtures/checkout.spec.js
// Fixture for lessons 2.3.5 / 2.3.8 — contains ONE broken locator.
// The data-testid below is stale: the real button in checkout.html carries
// data-testid="confirm-order-btn". The auto-fix workflow repairs this file.
//
// Correct locator after fix:  button[data-testid="confirm-order-btn"]
//
// Reset between runs:  git checkout tests/fixtures/checkout.spec.js
const { test, expect } = require('@playwright/test');

test('checkout - submit order', async ({ page }) => {
  await page.goto('/checkout.html');
  await page.locator('button[data-testid="confirm-order-btn"]').click(); // ← stale
  await expect(page.getByTestId('order-success')).toBeVisible();
});
