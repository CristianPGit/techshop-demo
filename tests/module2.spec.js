// tests/module2.spec.js
// ============================================================
// MODULE 2 — Locator Generation, Auto-fixing vs. Self-healing
//
// Broken states come from the Bug Injection Panel (js/bugs.js),
// injected via localStorage before navigation — not from
// hand-edited locators. This means:
//   • the app breaks, not the test file (that is the real-world case)
//   • every broken state is deterministic and revertible
//   • students can toggle the same bug in the browser by hand (🐛 button)
//
// Lesson map:
//   2.1.7  → lessons 2.1.4 / 2.1.5  (fix a renamed locator with Claude)
//   2.1.8  → lesson 2.1.5           (dynamic element: the toast)
//   2.3.4  → lesson 2.3.5           (auto-fix agent target)
// ============================================================

const { test, expect } = require('@playwright/test');
const { injectBugs, clearBugs, clearCart } = require('./helpers');
// injectBugs drives the 🐛 Bug Injection Panel (js/bugs.js) via localStorage.
// Used in 2.2.4 to manufacture a 'healed green'. The 2.1.7 / 2.3.4 broken
// states stay hardcoded so they match the worked examples in the lessons.

// ============================================================
// Chapter 2.1 — Smart Locator Generation
// ============================================================
test.describe('2.1 - Smart Locator Generation', () => {

  test.beforeEach(async ({ page }) => {
    await clearBugs(page);
    await clearCart(page);
  });

  test('2.1.1 - Navbar renders with correct links', async ({ page }) => {
    await page.goto('/');
    // STABLE locators: data-testid, explicitly maintained (lesson 2.1.1)
    await expect(page.getByTestId('logo')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-products')).toBeVisible();
    await expect(page.getByTestId('nav-cart')).toBeVisible();
  });

  test('2.1.2 - Hero section renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('hero-title')).toContainText('Next-Gen Tech');
    await expect(page.getByTestId('hero-cta')).toHaveAttribute('href', 'products.html');
  });

  test('2.1.3 - Featured products grid renders 4 cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('featured-grid').locator('[data-testid^="product-card-"]');
    await expect(cards).toHaveCount(4);
  });

  test('2.1.4 - FRAGILE: product price by CSS class chain (teaching example)', async ({ page }) => {
    // ⚠️ DEMO for lesson 2.1.1/2.1.2: this is the kind of locator Claude replaces.
    // It encodes DOM structure, not the element's identity. It passes today —
    // fragility is not the same as failure. It breaks the day a wrapper appears.
    await page.goto('/products.html');
    await expect(page.locator('.product-grid > div:first-child .product-price')).toBeVisible();
  });

  test('2.1.5 - Products page: all 8 products render', async ({ page }) => {
    await page.goto('/products.html');
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(8);
  });

  test('2.1.6 - Category filter works correctly', async ({ page }) => {
    await page.goto('/products.html');
    await page.getByTestId('category-filter').selectOption('audio');
    // audio products: Pro Wireless Headphones + Wireless Earbuds Pro = 2
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(2);
  });

  test('2.1.7 - BROKEN: stale test ID (lessons 2.1.4 / 2.1.5 target)', async ({ page }) => {
    // 🔴 FAILS BY DESIGN — the lesson 2.1.4 / 2.1.5 practice target.
    //
    // 'add-to-cart-btn' is a STALE locator: the element was renamed to
    // add-to-cart-p001. Students fix it with the prompt template from 2.1.3.
    // This produces exactly the error the lessons open with:
    //   Error: locator('[data-testid="add-to-cart-btn"]') - element not found
    //
    // Do NOT fix on main — this is the lesson's starting state.
    await page.goto('/products.html');
    await page.getByTestId('add-to-cart-btn').click(); // ← stale
    await expect(page.getByTestId('toast')).toBeVisible();
  });

  test('2.1.8 - BROKEN: dynamic element asserted without interaction (lesson 2.1.5)', async ({ page }) => {
    // 🔴 THIS TEST FAILS BY DESIGN — lesson 2.1.5 practice target.
    //
    // The toast is created by JS only after Add to Cart is clicked, and it
    // removes itself ~2s later (see showToast in js/cart.js). This asserts it
    // in the DEFAULT DOM, where it does not exist.
    //
    // The fix is the INTERACTION SEQUENCE, not a cleverer locator:
    // the DOM snippet must be captured in the state where the toast exists.
    await page.goto('/products.html');
    await expect(page.getByTestId('toast')).toBeVisible(); // ← not in the default DOM
  });

});

// ============================================================
// Chapter 2.2 — The Self-Healing Debate
// ============================================================
test.describe('2.2 - Self-Healing vs Auto-Fixing', () => {

  test.beforeEach(async ({ page }) => {
    await clearBugs(page);
    await clearCart(page);
  });

  test('2.2.1 - FLAKY: locator by position (classic self-healing target)', async ({ page }) => {
    // ⚠️ Positional locator. Passes now; silently targets the WRONG card the
    // day a product is inserted above. A self-healing tool would "fix" this
    // and never tell you — lesson 2.2.1.
    await page.goto('/products.html');
    await expect(page.locator('.product-card').nth(0)).toBeVisible();
  });

  test('2.2.2 - STABLE: same assertion by identity (the auto-fix result)', async ({ page }) => {
    // ✅ What Claude proposes instead: tied to intent, not position.
    await page.goto('/products.html');
    await expect(page.getByTestId('product-name-p001')).toHaveText('Pro Wireless Headphones');
  });

  test('2.2.3 - Add to cart updates the cart count', async ({ page }) => {
    await page.goto('/products.html');
    await page.getByTestId('add-to-cart-p001').click();
    await expect(page.getByTestId('toast')).toBeVisible();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });

  test('2.2.4 - A healed green: positional locator survives, tests the wrong thing', async ({ page }) => {
    // Demonstrates the 2.2.1 principle concretely: with a duplicated first
    // card, the positional locator still resolves and the test still passes —
    // while no longer testing what its name claims. A green that certifies
    // nothing. This is what self-healing manufactures on purpose.
    await injectBugs(page, ['bug-duplicate-card']);
    await page.goto('/products.html');
    await expect(page.locator('.product-card').nth(1)).toBeVisible(); // green, meaningless
  });

});

// ============================================================
// Chapter 2.3 — Controlled Auto-Fixing
// ============================================================
test.describe('2.3 - Controlled Auto-Fixing', () => {

  test.beforeEach(async ({ page }) => {
    await clearBugs(page);
    await clearCart(page);
  });

  test('2.3.1 - Cart page renders empty state', async ({ page }) => {
    await page.goto('/cart.html');
    await expect(page.getByTestId('cart-empty')).toBeVisible();
  });

  test('2.3.2 - Full add-to-cart → cart page flow', async ({ page }) => {
    await page.goto('/products.html');
    await page.getByTestId('add-to-cart-p001').click();
    await page.getByTestId('add-to-cart-p003').click();
    await page.getByTestId('nav-cart').click();
    await expect(page).toHaveURL(/cart\.html/);
    await expect(page.getByTestId('cart-item-p001')).toBeVisible();
    await expect(page.getByTestId('cart-item-p003')).toBeVisible();
  });

  test('2.3.3 - Checkout form has all required fields', async ({ page }) => {
    await page.goto('/checkout.html');
    await expect(page.getByTestId('input-name')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-address')).toBeVisible();
    await expect(page.getByTestId('place-order-btn')).toBeVisible();
  });

  test('2.3.4 - BROKEN: stale test ID (auto-fix AGENT target, lesson 2.3.5)', async ({ page }) => {
    // 🔴 FAILS BY DESIGN — the auto-fix AGENT's target.
    // Distinct from 2.1.7, which students fix BY HAND in lesson 2.1.5.
    // Here scripts/autofix-limited.js reads the failure, asks Claude for a
    // replacement, validates it, then writes the fix or escalates.
    // Keep BOTH broken on main — each is a different lesson's starting state.
    await page.goto('/products.html');
    await page.getByTestId('add-to-cart-button').click(); // ← stale (real: add-to-cart-p002)
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
