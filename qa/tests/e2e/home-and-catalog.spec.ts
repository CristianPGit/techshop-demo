import { test, expect } from '@playwright/test';
import { card } from './_selectors';

test.describe('Home page', () => {
  test('renders hero and four featured products', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.getByTestId('hero-title')).toHaveText('Next-Gen Tech, Delivered Fast');
    await expect(page.getByTestId('hero-cta')).toBeVisible();

    // Featured grid shows the first 4 products (p001–p004).
    await expect(page.locator('#featured-grid .product-card')).toHaveCount(4);
    await expect(card(page, 'p001')).toBeVisible();
    await expect(card(page, 'p004')).toBeVisible();
  });

  test('Shop Now CTA navigates to the catalog', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByTestId('hero-cta').click();
    // `serve` strips the .html extension (clean URLs), so accept either form.
    await expect(page).toHaveURL(/\/products(\.html)?$/);
    await expect(page.locator('#product-grid .product-card')).toHaveCount(8);
  });
});

test.describe('Catalog filtering & sorting', () => {
  test('shows all 8 products by default', async ({ page }) => {
    await page.goto('/products.html');
    await expect(page.locator('#product-grid .product-card')).toHaveCount(8);
  });

  test('category filter narrows to the audio products', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('#category-filter').selectOption('audio');

    const cards = page.locator('#product-grid .product-card');
    await expect(cards).toHaveCount(2); // p001 + p006
    await expect(card(page, 'p001')).toBeVisible();
    await expect(card(page, 'p006')).toBeVisible();
  });

  test('sort price low-to-high orders cards ascending', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('#sort-filter').selectOption('price-asc');

    const prices = await page.locator('#product-grid .product-price').allTextContents();
    const numbers = prices.map((p) => parseFloat(p.replace('$', '')));
    const sorted = [...numbers].sort((a, b) => a - b);
    expect(numbers).toEqual(sorted);
  });

  test('sort by name orders cards A–Z', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('#sort-filter').selectOption('name');

    const names = await page.locator('#product-grid .product-name').allTextContents();
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});
