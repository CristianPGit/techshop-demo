import { test, expect, type Page } from '@playwright/test';
import { addToCartButton, cartCount, cartItem } from './_selectors';

/**
 * TRI-5 — Fix cart total rounding to 2 decimals
 * https://linear.app/tripleten-pandele/issue/TRI-5
 *
 * Bug: cart total in js/cart.js leaks floating-point artifacts (e.g. 19.989999…).
 *
 * Acceptance criteria:
 *   1. Total displayed with exactly 2 decimal places.
 *   2. No regression to the add-to-cart flow.
 *
 * All "float-prone" amounts below were verified to be float-dirty in raw JS
 * arithmetic, so an unrounded render WOULD expose the bug. Confirmed via Node:
 *   p007            39.99 + 9.99 shipping  = 49.980000000000004
 *   p003            49.99 + 9.99 shipping  = 59.980000000000004
 *   p006 + p007     79.99 + 39.99 subtotal = 119.97999999999999
 *   p006 × 3        79.99 × 3 line total   = 239.96999999999997
 *   p008 × 3       119.99 × 3 line total   = 359.96999999999997
 */

/** A monetary string with EXACTLY two decimal places, e.g. "$49.98". */
const MONEY_2DP = /^\$\d+\.\d{2}$/;

/** Add each id once; repeat an id to bump its quantity (each click = +1). */
async function addAll(page: Page, ids: string[]) {
  await page.goto('/products.html');
  for (const id of ids) {
    await addToCartButton(page, id).click();
  }
  await page.goto('/cart.html');
}

/** Assert subtotal / shipping / total are all 2dp on whatever page is open. */
async function expectSummary2dp(page: Page) {
  await expect(page.locator('#subtotal')).toHaveText(MONEY_2DP);
  await expect(page.locator('#shipping')).toHaveText(MONEY_2DP);
  await expect(page.locator('#total')).toHaveText(MONEY_2DP);
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — totals render with exactly 2 decimals (format + exact value)
// ─────────────────────────────────────────────────────────────────────────────

const CASES = [
  { ids: ['p007'], label: 'single $39.99 item, shipping (float-prone)', subtotal: '$39.99', shipping: '$9.99', total: '$49.98' },
  { ids: ['p003'], label: 'single $49.99 item, shipping (float-prone)', subtotal: '$49.99', shipping: '$9.99', total: '$59.98' },
  { ids: ['p005'], label: 'single $59.99 item, just over free-ship boundary', subtotal: '$59.99', shipping: '$0.00', total: '$59.99' },
  { ids: ['p006', 'p007'], label: 'two items, free shipping (float-prone subtotal)', subtotal: '$119.98', shipping: '$0.00', total: '$119.98' },
  { ids: ['p001', 'p002', 'p003'], label: 'three distinct items, free shipping', subtotal: '$289.97', shipping: '$0.00', total: '$289.97' },
  { ids: ['p006', 'p006', 'p006'], label: 'quantity ×3 (float-prone line + subtotal)', subtotal: '$239.97', shipping: '$0.00', total: '$239.97' },
  { ids: ['p004', 'p004'], label: 'quantity ×2 (clean control)', subtotal: '$599.98', shipping: '$0.00', total: '$599.98' },
];

test.describe('TRI-5 · AC1 — cart totals render with exactly 2 decimals', () => {
  for (const c of CASES) {
    test(`cart page: ${c.label}`, async ({ page }) => {
      await addAll(page, c.ids);

      // Format: no float noise in any money field.
      await expectSummary2dp(page);
      for (const t of await page.locator('.cart-item-total').allTextContents()) {
        expect(t, 'each line-item total is 2dp').toMatch(MONEY_2DP);
      }

      // Value: the rounded amounts are correct.
      await expect(page.locator('#subtotal')).toHaveText(c.subtotal);
      await expect(page.locator('#shipping')).toHaveText(c.shipping);
      await expect(page.locator('#total')).toHaveText(c.total);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Line-item rounding (price × quantity)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · line-item totals round to 2 decimals', () => {
  test('p006 × 3 renders the line total as $239.97, not 239.9699…', async ({ page }) => {
    await addAll(page, ['p006', 'p006', 'p006']);
    const line = cartItem(page, 'p006').locator('.cart-item-total');
    await expect(line).toHaveText(MONEY_2DP);
    await expect(line).toHaveText('$239.97');
  });

  test('p008 × 3 renders the line total as $359.97, not 359.9699…', async ({ page }) => {
    await addAll(page, ['p008', 'p008', 'p008']);
    const line = cartItem(page, 'p008').locator('.cart-item-total');
    await expect(line).toHaveText(MONEY_2DP);
    await expect(line).toHaveText('$359.97');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic re-render paths (changeQty / removeFromCart re-run the formatter)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · totals stay 2dp through cart mutations', () => {
  test('bumping quantity on the cart page keeps totals rounded', async ({ page }) => {
    await addAll(page, ['p006']);
    const item = cartItem(page, 'p006');

    await item.getByRole('button', { name: '+' }).click(); // qty 2
    await item.getByRole('button', { name: '+' }).click(); // qty 3 → float-prone
    await expect(item.locator('.qty-val')).toHaveText('3');

    await expect(item.locator('.cart-item-total')).toHaveText('$239.97');
    await expectSummary2dp(page);
    await expect(page.locator('#total')).toHaveText('$239.97');
  });

  test('removing an item re-renders the remaining totals as 2dp', async ({ page }) => {
    await addAll(page, ['p006', 'p006', 'p006', 'p003']); // p006×3 + p003

    await cartItem(page, 'p003').getByRole('button', { name: '✕' }).click();
    await expect(cartItem(page, 'p003')).toHaveCount(0);

    await expectSummary2dp(page);
    await expect(page.locator('#total')).toHaveText('$239.97');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Free-shipping boundary ($50 threshold) — both branches stay 2dp
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · free-shipping boundary renders 2dp on both branches', () => {
  test('subtotal under $50 charges $9.99 shipping (2dp)', async ({ page }) => {
    await addAll(page, ['p003']); // 49.99 < 50
    await expect(page.locator('#shipping')).toHaveText('$9.99');
    await expectSummary2dp(page);
  });

  test('subtotal over $50 shows $0.00 shipping (2dp, not "$0")', async ({ page }) => {
    await addAll(page, ['p005']); // 59.99 > 50
    await expect(page.locator('#shipping')).toHaveText('$0.00');
    await expectSummary2dp(page);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty cart (format only — see scope note)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · empty cart still renders money fields as 2dp', () => {
  test('empty cart summary is 2dp-formatted', async ({ page }) => {
    await page.goto('/cart.html'); // no items added
    await expect(page.locator('.cart-empty')).toBeVisible();

    // NOTE: empty-cart total currently shows $9.99 (shipping applied to an empty
    // cart). That UX quirk is OUT OF SCOPE for TRI-5; here we only assert that
    // whatever is shown is correctly rounded to 2 decimals.
    await expectSummary2dp(page);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Checkout summary uses the same formatter — must also be 2dp
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · checkout order summary renders 2dp', () => {
  test('checkout total is 2dp for a float-prone cart', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p003').click(); // 59.980000000000004 raw
    await page.goto('/checkout.html');

    await expect(page.locator('#total')).toHaveText(MONEY_2DP);
    await expect(page.locator('#total')).toHaveText('$59.98');
  });

  test('checkout summary lists every line and stays 2dp for multiple items', async ({ page }) => {
    await page.goto('/products.html');
    await addToCartButton(page, 'p003').click();
    await addToCartButton(page, 'p006').click();
    await page.goto('/checkout.html');

    await expect(page.locator('#order-items .summary-row')).toHaveCount(2);
    await expectSummary2dp(page);
    await expect(page.locator('#total')).toHaveText('$129.98'); // 49.99 + 79.99, free shipping
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Breadth sweep — many combinations, format-only invariant
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · format invariant holds across many carts', () => {
  const COMBOS = [
    ['p007'], ['p003'], ['p005'], ['p006', 'p007'], ['p001', 'p002', 'p003'],
    ['p006', 'p006', 'p006'], ['p004', 'p004'], ['p002', 'p003'], ['p008', 'p008'],
  ];
  for (const combo of COMBOS) {
    test(`every money field is 2dp for [${combo.join(', ')}]`, async ({ page }) => {
      await addAll(page, combo);
      await expectSummary2dp(page);
      for (const t of await page.locator('.cart-item-total').allTextContents()) {
        expect(t).toMatch(MONEY_2DP);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Regression — the exact ticket symptom must never appear
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · regression — no floating-point artifacts leak', () => {
  test('a float-dirty total is never rendered with trailing noise', async ({ page }) => {
    await addAll(page, ['p007']); // raw total = 49.980000000000004

    const total = (await page.locator('#total').textContent())?.trim() ?? '';
    expect(total).toBe('$49.98');
    expect(total, 'no 3+ decimal digits').not.toMatch(/\d\.\d{3,}/);
    expect(total).not.toContain('49.980000');
  });

  test('no money field anywhere on the cart page leaks >2 decimals', async ({ page }) => {
    await addAll(page, ['p006', 'p007', 'p003']); // mix of float-prone values
    const money = await page
      .locator('#subtotal, #shipping, #total, .cart-item-total')
      .allTextContents();
    for (const m of money) {
      expect(m, `"${m}" must be 2dp`).toMatch(MONEY_2DP);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — add-to-cart flow has no regression
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TRI-5 · AC2 — add-to-cart flow has no regression', () => {
  test('adding items still updates the badge, toasts, and renders the line item', async ({ page }) => {
    await page.goto('/products.html');
    await expect(cartCount(page)).toHaveText('0');

    await addToCartButton(page, 'p007').click();
    await expect(page.locator('.toast')).toContainText('Added to cart');
    await expect(cartCount(page)).toHaveText('1');

    await addToCartButton(page, 'p007').click(); // same product → quantity bump
    await expect(cartCount(page)).toHaveText('2');

    await page.goto('/cart.html');
    await expect(cartItem(page, 'p007')).toBeVisible();
    await expect(cartItem(page, 'p007').locator('.qty-val')).toHaveText('2');
    await expect(cartItem(page, 'p007').locator('.cart-item-total')).toHaveText('$79.98');
  });
});
