import { test, expect } from '@playwright/test';
import { addToCartButton, cartCount, cartItem, PRODUCTS } from './_selectors';

test.describe('Cart', () => {
  test('add-to-cart increments the navbar badge and shows a toast', async ({ page }) => {
    await page.goto('/products.html');
    await expect(cartCount(page)).toHaveText('0');

    await addToCartButton(page, 'p001').click();
    await expect(page.locator('.toast')).toContainText('Added to cart');
    await expect(cartCount(page)).toHaveText('1');

    await addToCartButton(page, 'p002').click();
    await expect(cartCount(page)).toHaveText('2');
  });

  test('cart page lists items and computes the correct totals', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p001').click(); // 149.99
    await addToCartButton(page, 'p002').click(); // 89.99

    await page.goto('/cart.html');
    await expect(page.locator('.cart-item')).toHaveCount(2);

    const subtotal = PRODUCTS.p001.price + PRODUCTS.p002.price; // 239.98
    await expect(page.locator('#subtotal')).toHaveText(`$${subtotal.toFixed(2)}`);
    // Free shipping over $50.
    await expect(page.locator('#shipping')).toHaveText('$0.00');
    await expect(page.locator('#total')).toHaveText(`$${subtotal.toFixed(2)}`);
  });

  test('quantity controls update the line and order totals', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p001').click();
    await page.goto('/cart.html');

    const item = cartItem(page, 'p001');
    await expect(item.locator('.qty-val')).toHaveText('1');

    await item.getByRole('button', { name: '+' }).click();
    await expect(item.locator('.qty-val')).toHaveText('2');
    await expect(item.locator('.cart-item-total')).toHaveText(`$${(PRODUCTS.p001.price * 2).toFixed(2)}`);

    // Quantity floors at 1.
    await item.getByRole('button', { name: '−' }).click();
    await item.getByRole('button', { name: '−' }).click();
    await expect(item.locator('.qty-val')).toHaveText('1');
  });

  test('remove button empties the cart', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p003').click();
    await page.goto('/cart.html');

    await cartItem(page, 'p003').getByRole('button', { name: '✕' }).click();
    await expect(page.locator('.cart-empty')).toBeVisible();
    await expect(cartCount(page)).toHaveText('0');
  });

  test('small order applies a $9.99 shipping fee', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p007').click(); // 39.99 → under $50
    await page.goto('/cart.html');

    await expect(page.locator('#shipping')).toHaveText('$9.99');
    await expect(page.locator('#total')).toHaveText('$49.98');
  });
});

test.describe('Cart persistence', () => {
  test('cart survives navigation across pages (localStorage)', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p001').click();
    await addToCartButton(page, 'p001').click();
    await expect(cartCount(page)).toHaveText('2');

    await page.goto('/index.html');
    await expect(cartCount(page)).toHaveText('2');

    await page.goto('/cart.html');
    await expect(cartItem(page, 'p001').locator('.qty-val')).toHaveText('2');
  });
});
