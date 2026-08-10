import { test, expect } from '@playwright/test';
import { addToCartButton } from './_selectors';

async function seedCart(page: import('@playwright/test').Page) {
  await page.goto('/products.html');
  await addToCartButton(page, 'p001').click();
  await addToCartButton(page, 'p004').click();
}

test.describe('Checkout', () => {
  test('placing an order shows the success state and clears the cart', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout.html');

    // The order summary mirrors the cart.
    await expect(page.locator('#order-items .summary-row')).toHaveCount(2);

    await page.locator('#input-name').fill('Jane Smith');
    await page.locator('#input-email').fill('jane@example.com');
    await page.locator('#input-address').fill('123 Main Street');
    await page.locator('#input-city').fill('Springfield');
    await page.locator('#input-zip').fill('62701');
    await page.locator('#input-country').selectOption('us');
    await page.locator('#input-card').fill('4242424242424242');

    await page.getByRole('button', { name: 'Place Order' }).click();

    const success = page.locator('#order-success');
    await expect(success).toBeVisible();
    await expect(success).toContainText('Order Placed Successfully');
    await expect(page.locator('#order-num')).not.toBeEmpty();

    // Cart is emptied after a successful order.
    await expect(page.locator('#cart-count')).toHaveText('0');
  });

  test('required fields block submission (browser validation)', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout.html');

    // Submit with empty required fields — the success panel must NOT appear.
    await page.getByRole('button', { name: 'Place Order' }).click();
    await expect(page.locator('#order-success')).toBeHidden();

    const nameInvalid = await page
      .locator('#input-name')
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(nameInvalid).toBe(true);
  });
});
