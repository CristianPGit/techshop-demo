import { test, expect } from '@playwright/test';
import { addToCartButton, card, cartCount, PRODUCTS } from './_selectors';

/**
 * Simple end-to-end smoke test — the single most important journey:
 *
 *   home → catalog → add 2 items → cart totals correct → checkout → order placed
 *
 * One linear test on purpose: if this goes red, the store's core happy path is
 * broken. It uses only the stable hooks in `_selectors.ts`, so it runs unchanged
 * against localhost OR the live GitHub Pages build:
 *
 *   npm run qa:e2e
 *   WEB_URL=https://cristianpgit.github.io/techshop-demo npx playwright test --project=chromium smoke
 *
 * Verified by exploratory run (2026-07-01): order #11252 placed, cart cleared.
 */
test('smoke: browse → add to cart → correct totals → checkout succeeds', async ({ page }) => {
  // 1. Home renders the hero and featured grid.
  await page.goto('index.html');
  await expect(page.getByTestId('hero-title')).toHaveText('Next-Gen Tech, Delivered Fast');
  await expect(page.locator('#featured-grid .product-card')).toHaveCount(4);

  // 2. Go to the catalog (all 8 products) and add two known items.
  await page.getByTestId('hero-cta').click();
  await expect(page.locator('#product-grid .product-card')).toHaveCount(8);
  await addToCartButton(page, 'p001').click(); // Pro Wireless Headphones — $149.99
  await addToCartButton(page, 'p004').click(); // Smart Watch Ultra       — $299.99
  await expect(cartCount(page)).toHaveText('2');

  // 3. Cart shows both line items and the correct money.
  //    Subtotal 449.98; > $50 → free shipping; total == subtotal.
  await page.goto('cart.html');
  await expect(page.locator('.cart-item')).toHaveCount(2);
  const expectedSubtotal = PRODUCTS.p001.price + PRODUCTS.p004.price; // 449.98
  await expect(page.locator('#subtotal')).toHaveText(`$${expectedSubtotal.toFixed(2)}`);
  await expect(page.locator('#shipping')).toHaveText('$0.00');
  await expect(page.locator('#total')).toHaveText(`$${expectedSubtotal.toFixed(2)}`);

  // 4. Checkout with valid details → success panel + order number, cart cleared.
  await page.goto('checkout.html');
  await page.locator('#input-name').fill('Jane Tester');
  await page.locator('#input-email').fill('jane@example.com');
  await page.locator('#input-address').fill('1 Test Street');
  await page.locator('#input-city').fill('Vienna');
  await page.locator('#input-zip').fill('1010');
  await page.locator('#input-country').selectOption('us');
  await page.locator('#input-card').fill('4242424242424242');
  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(page.locator('#order-success')).toContainText('Order Placed Successfully');
  await expect(page.locator('#order-num')).not.toBeEmpty();
  await expect(cartCount(page)).toHaveText('0');
});
