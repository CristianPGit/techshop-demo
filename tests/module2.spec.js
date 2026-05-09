// tests/module2.spec.js
// ============================================================
// MODULE 2 — Locator Generation & Auto-fixing Tests
// These tests use intentional data-testid locators (stable)
// and include some INTENTIONALLY FRAGILE locators for demo.
// ============================================================

const { test, expect } = require('@playwright/test');

// ============================================================
// Chapter 2.1 — Smart Locator Generation
// ============================================================

test.describe('2.1 - Smart Locator Generation', () => {

  test('2.1.1 - Navbar renders with correct links @smoke', async ({ page }) => {
    await page.goto('/');
    // STABLE locator — data-testid (what Claude recommends)
    await expect(page.getByTestId('logo')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-products')).toBeVisible();
    await expect(page.getByTestId('nav-cart')).toBeVisible();
  });

  test('2.1.2 - Hero section renders correctly', async ({ page }) => {
    await page.goto('/');
    const title = page.getByTestId('hero-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Next-Gen Tech');

    const cta = page.getByTestId('hero-cta');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', 'products.html');
  });

  test('2.1.3 - Featured products grid renders 4 cards', async ({ page }) => {
    await page.goto('/');
    const grid = page.getByTestId('product-grid');
    await expect(grid).toBeVisible();
    const cards = grid.locator('[data-testid^="product-card-"]');
    await expect(cards).toHaveCount(4);
  });

  test('2.1.4 - FRAGILE: product card by CSS class (breaks easily)', async ({ page }) => {
    // ⚠️ DEMO: This is the kind of locator Claude should REPLACE
    // It relies on DOM structure, not semantic attributes
    await page.goto('/products.html');
    const firstPrice = page.locator('.product-grid > div:first-child .product-price');
    await expect(firstPrice).toBeVisible();
  });

  test('2.1.5 - Products page: all 8 products render @smoke', async ({ page }) => {
    await page.goto('/products.html');
    const cards = page.locator('[data-testid^="product-card-"]');
    await expect(cards).toHaveCount(8);
  });

  test('2.1.6 - Category filter works correctly', async ({ page }) => {
    await page.goto('/products.html');
    await page.getByTestId('category-filter').selectOption('audio');
    const cards = page.locator('[data-testid^="product-card-"]');
    // Only audio products: Headphones + Earbuds = 2
    await expect(cards).toHaveCount(2);
  });

});

  // Login page — complex DOM structure example for 2.1.1
  test('2.1.7 - Login page: complex DOM with validation states', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('demo-hint')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
    await expect(page.getByTestId('toggle-password')).toBeVisible();
    await expect(page.getByTestId('remember-me')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeVisible();
  });

  test('2.1.8 - Login: field-level validation errors appear @smoke', async ({ page }) => {
    await page.goto('/login.html');
    // Submit with empty fields
    await page.getByTestId('login-btn').click();
    await expect(page.getByTestId('error-email')).toBeVisible();
    await expect(page.getByTestId('error-password')).toBeVisible();
  });

  test('2.1.9 - Login: wrong credentials shows error banner', async ({ page }) => {
    await page.goto('/login.html');
    await page.getByTestId('input-email').fill('wrong@example.com');
    await page.getByTestId('input-password').fill('wrongpassword');
    await page.getByTestId('login-btn').click();
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 2000 });
  });

  test('2.1.10 - Login: valid credentials shows success state @smoke', async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(() => localStorage.removeItem('techshop-user'));
    await page.reload();
    await page.getByTestId('input-email').fill('demo@techshop.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('login-btn').click();
    await expect(page.getByTestId('login-success')).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId('success-username')).toHaveText('demo@techshop.com');
  });

});

// ============================================================
// Chapter 2.2 — Self-Healing Debate (flaky test demos)
// ============================================================

test.describe('2.2 - Self-Healing vs Auto-Fixing Demo', () => {

  test('2.2.1 - FLAKY: locator by position (classic self-healing target)', async ({ page }) => {
    // ⚠️ DEMO: nth-child locators break when products are reordered
    await page.goto('/products.html');
    const firstCard = page.locator('.product-card').nth(0);
    await expect(firstCard).toBeVisible();
    // This "works" but would break if products list is reordered
  });

  test('2.2.2 - STABLE: same assertion with data-testid (auto-fix result)', async ({ page }) => {
    // ✅ This is what Claude generates to replace the above
    await page.goto('/products.html');
    const headphones = page.getByTestId('product-card-p001');
    await expect(headphones).toBeVisible();
    await expect(page.getByTestId('product-name-p001')).toHaveText('Pro Wireless Headphones');
  });

  test('2.2.3 - Add to cart updates cart count @smoke', async ({ page }) => {
    await page.goto('/products.html');
    const initialCount = await page.getByTestId('cart-count').textContent();
    await page.getByTestId('add-to-cart-p001').click();
    const toast = page.getByTestId('toast');
    await expect(toast).toBeVisible();
    // Count should have increased
    const newCount = await page.getByTestId('cart-count').textContent();
    expect(parseInt(newCount)).toBeGreaterThan(parseInt(initialCount));
  });

});

// ============================================================
// Chapter 2.3 — Controlled Auto-Fixing
// ============================================================

test.describe('2.3 - Controlled Auto-Fixing Flow', () => {

  test('2.3.1 - Cart page renders empty state', async ({ page }) => {
    await page.goto('/cart.html');
    // Ensure fresh cart for test isolation
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();
    const empty = page.getByTestId('cart-empty');
    await expect(empty).toBeVisible();
  });

  test('2.3.2 - Full add-to-cart → cart page flow @smoke', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();

    // Add two products
    await page.getByTestId('add-to-cart-p001').click();
    await page.getByTestId('add-to-cart-p003').click();

    // Navigate to cart
    await page.getByTestId('nav-cart').click();
    await expect(page).toHaveURL(/cart\.html/);

    // Both items present
    await expect(page.getByTestId('cart-item-p001')).toBeVisible();
    await expect(page.getByTestId('cart-item-p003')).toBeVisible();
  });

  test('2.3.3 - Checkout form has all required fields', async ({ page }) => {
    await page.goto('/checkout.html');
    await expect(page.getByTestId('input-name')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-address')).toBeVisible();
    await expect(page.getByTestId('input-city')).toBeVisible();
    await expect(page.getByTestId('input-zip')).toBeVisible();
    await expect(page.getByTestId('place-order-btn')).toBeVisible();
  });

  test('2.3.4 - INTENTIONALLY BROKEN: wrong testid (triggers auto-fix)', async ({ page }) => {
    // 🔴 THIS TEST WILL FAIL
    // This simulates a broken locator after a UI rename
    // The auto-fixing agent should detect: "add-to-cart-btn" → "add-to-cart-p001"
    await page.goto('/products.html');
    await page.getByTestId('add-to-cart-btn').click(); // ← broken locator
    await expect(page.getByTestId('toast')).toBeVisible();
  });

});
