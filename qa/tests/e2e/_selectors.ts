/**
 * Selectors for the TechShop UI.
 *
 * Per the QA-skill setup choice, the app source is left UNTOUCHED — so we lean on
 * the stable hooks that already exist: the `data-testid`s in the navbar/hero, the
 * element `id`s on forms and controls, and semantic role/text selectors. We do NOT
 * use the `product-name-*`, `product-price-*`, `add-to-cart-*` testids that the bug
 * panel expects, because those are not present in the current markup.
 *
 * If you later instrument the product cards, swap the `.product-card` CSS selectors
 * below for the corresponding testids and the bug-injection suite will light up the
 * remaining 7 dormant bugs (see qa/tests/bugs/bug-injection.spec.ts).
 */
import type { Page, Locator } from '@playwright/test';

export const PRODUCTS = {
  p001: { name: 'Pro Wireless Headphones', category: 'audio', price: 149.99 },
  p002: { name: 'Mechanical Keyboard', category: 'computing', price: 89.99 },
  p003: { name: 'Portable Power Bank', category: 'accessories', price: 49.99 },
  p004: { name: 'Smart Watch Ultra', category: 'mobile', price: 299.99 },
  p006: { name: 'Wireless Earbuds Pro', category: 'audio', price: 79.99 },
} as const;

/** A single product card by its data-product-id (a stable hook in the rendered HTML). */
export function card(page: Page, productId: string): Locator {
  return page.locator(`.product-card[data-product-id="${productId}"]`);
}

/** The "Add to Cart" button inside a given product card. */
export function addToCartButton(page: Page, productId: string): Locator {
  return card(page, productId).getByRole('button', { name: 'Add to Cart' });
}

/** Navbar cart-count badge (shared across every page via id="cart-count"). */
export function cartCount(page: Page): Locator {
  return page.locator('#cart-count');
}

/** A cart-page line item by product id. */
export function cartItem(page: Page, productId: string): Locator {
  return page.locator(`.cart-item[data-product-id="${productId}"]`);
}
