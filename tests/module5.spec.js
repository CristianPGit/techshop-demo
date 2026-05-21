// ============================================================
// Module 5 — Jira Integration, Page Objects & API Test Data
// 5.1: Jira/AC integration, generating page objects from API
// 5.2: Swagger → DTOs, API contract validation
// 5.3: Parallel test data safety (X-Session-ID isolation)
// ============================================================

// @ts-check
const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a unique session ID — demonstrates Module 5.3.2 safe incrementation */
function uniqueSession() {
  return `test-${crypto.randomBytes(6).toString('hex')}`;
}

/** Login and return bearer token */
async function login(request, email = 'demo@techshop.com', password = 'password123') {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  return body.token;
}

// ─── 5.1: Generating Test Steps from API Contracts ───────────────────────────

test.describe('5.1 — API Contract as Source of Truth for Test Steps', () => {
  /**
   * 5.1.1 — Full happy-path derived from Swagger contract
   * AC: "A logged-in user can add a product to the cart and place an order."
   * These steps were generated from the Swagger spec — Module 5.1.1 exercise.
   */
  test('5.1.1 happy-path: login → browse → add to cart → checkout @smoke', async ({ request }) => {
    const sessionId = uniqueSession();

    // Step 1: Authenticate
    const token = await login(request);
    expect(token).toBeTruthy();

    // Step 2: Verify identity
    const meRes = await request.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status()).toBe(200);
    const user = await meRes.json();
    expect(user.email).toBe('demo@techshop.com');

    // Step 3: Browse products
    const productsRes = await request.get(`${API_URL}/api/products`);
    expect(productsRes.status()).toBe(200);
    const { data: products } = await productsRes.json();
    const inStock = products.find(p => p.inStock);
    expect(inStock).toBeDefined();

    // Step 4: Add to cart (session-isolated)
    const addRes = await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: inStock.id, quantity: 2 },
    });
    expect(addRes.status()).toBe(201);
    const cart = await addRes.json();
    expect(cart.itemCount).toBe(2);
    expect(cart.total).toBeCloseTo(inStock.price * 2, 1);

    // Step 5: Place order
    const orderRes = await request.post(`${API_URL}/api/orders`, {
      headers: { 'X-Session-ID': sessionId },
      data: {
        customer: { name: user.name, email: user.email },
        paymentMethod: 'credit_card',
      },
    });
    expect(orderRes.status()).toBe(201);
    const order = await orderRes.json();
    expect(order.id).toMatch(/^ORD-/);
    expect(order.status).toBe('confirmed');
    expect(order.total).toBeCloseTo(inStock.price * 2, 1);

    // Step 6: Verify order retrieval
    const fetchedRes = await request.get(`${API_URL}/api/orders/${order.id}`);
    expect(fetchedRes.status()).toBe(200);
    const fetched = await fetchedRes.json();
    expect(fetched.id).toBe(order.id);
  });

  /**
   * 5.1.2 — Generating page objects from API structure
   * The API's Product schema maps directly to UI data-testid selectors.
   * Students prompt Claude: "Given this Swagger schema, generate a ProductPage object."
   */
  test('5.1.2 product API fields match UI data-testid naming convention', async ({ request, page }) => {
    const res = await request.get(`${API_URL}/api/products/p001`);
    const product = await res.json();

    await page.goto('/products.html');
    // Wait for JS to render product cards before asserting
    await page.waitForSelector('[data-testid^="product-card-"]');

    // API field `id` → UI selector `data-testid="product-card-{id}"`
    const card = page.locator(`[data-testid="product-card-${product.id}"]`);
    await expect(card).toBeVisible();

    // API field `name` → UI selector `data-testid="product-name-{id}"`
    const name = page.locator(`[data-testid="product-name-${product.id}"]`);
    await expect(name).toHaveText(product.name);

    // API field `price` → UI selector `data-testid="product-price-{id}"`
    const price = page.locator(`[data-testid="product-price-${product.id}"]`);
    await expect(price).toHaveText(`$${product.price.toFixed(2)}`);
  });
});

// ─── 5.2: Swagger → DTOs ─────────────────────────────────────────────────────

test.describe('5.2 — Swagger Docs to DTOs (Contract Validation)', () => {
  /**
   * 5.2.1 — Validate Product DTO shape against Swagger schema
   * These assertions ARE the DTO — generated from the Swagger spec by Claude.
   * Exercise: fetch /api/docs.json and paste into Claude → get TypeScript interfaces.
   */
  test('5.2.1 Product response matches Swagger-defined schema', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/products/p001`);
    expect(res.status()).toBe(200);
    const product = await res.json();

    // DTO validation (generated from Swagger schema — Module 5.2.1 output)
    expect(typeof product.id).toBe('string');
    expect(typeof product.name).toBe('string');
    expect(['audio', 'computing', 'mobile', 'accessories']).toContain(product.category);
    expect(typeof product.price).toBe('number');
    expect(product.price).toBeGreaterThan(0);
    expect(typeof product.rating).toBe('number');
    expect(product.rating).toBeGreaterThanOrEqual(1);
    expect(product.rating).toBeLessThanOrEqual(5);
    expect(typeof product.reviews).toBe('number');
    expect(typeof product.inStock).toBe('boolean');
    expect(typeof product.stock).toBe('number');
    // badge is nullable
    expect(product.badge === null || typeof product.badge === 'string').toBe(true);
  });

  /**
   * 5.2.2 — Validate Cart DTO shape
   */
  test('5.2.2 Cart response matches Swagger-defined schema', async ({ request }) => {
    const sessionId = uniqueSession();
    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: 'p001', quantity: 1 },
    });

    const res = await request.get(`${API_URL}/api/cart`, {
      headers: { 'X-Session-ID': sessionId },
    });
    expect(res.status()).toBe(200);
    const cart = await res.json();

    // Cart DTO
    expect(typeof cart.sessionId).toBe('string');
    expect(Array.isArray(cart.items)).toBe(true);
    expect(typeof cart.total).toBe('number');
    expect(typeof cart.itemCount).toBe('number');

    // CartItem DTO
    const item = cart.items[0];
    expect(typeof item.productId).toBe('string');
    expect(typeof item.name).toBe('string');
    expect(typeof item.price).toBe('number');
    expect(typeof item.quantity).toBe('number');
    expect(typeof item.subtotal).toBe('number');
    expect(item.subtotal).toBeCloseTo(item.price * item.quantity, 2);
  });

  /**
   * 5.2.3 — Validate Order DTO shape
   */
  test('5.2.3 Order response matches Swagger-defined schema', async ({ request }) => {
    const sessionId = uniqueSession();
    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: 'p002', quantity: 1 },
    });

    const res = await request.post(`${API_URL}/api/orders`, {
      headers: { 'X-Session-ID': sessionId },
      data: {
        customer: { name: 'DTO Test', email: 'dto@test.com' },
        paymentMethod: 'paypal',
      },
    });
    expect(res.status()).toBe(201);
    const order = await res.json();

    // Order DTO
    expect(order.id).toMatch(/^ORD-/);
    expect(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).toContain(order.status);
    expect(Array.isArray(order.items)).toBe(true);
    expect(typeof order.total).toBe('number');
    expect(['credit_card', 'paypal', 'bank_transfer']).toContain(order.paymentMethod);
    expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(order.estimatedDelivery).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Customer DTO
    expect(order.customer.name).toBe('DTO Test');
    expect(order.customer.email).toBe('dto@test.com');
  });

  /**
   * 5.2.4 — Swagger spec itself is accessible at /api/docs.json
   * Students download this and feed it to Claude for DTO generation.
   */
  test('5.2.4 OpenAPI spec is available at /api/docs.json', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/docs.json`);
    expect(res.status()).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe('TechShop API');
    expect(spec.components.schemas).toHaveProperty('Product');
    expect(spec.components.schemas).toHaveProperty('Cart');
    expect(spec.components.schemas).toHaveProperty('Order');
  });
});

// ─── 5.3: Parallel Test Data Safety ──────────────────────────────────────────

test.describe('5.3 — Parallel-Safe Test Data (X-Session-ID Isolation)', () => {
  /**
   * 5.3.1 — Two parallel sessions do not share cart state
   * Run with --workers=4 to demonstrate true isolation.
   */
  test('5.3.1 two sessions have independent cart state', async ({ request }) => {
    const sessionA = uniqueSession();
    const sessionB = uniqueSession();

    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionA },
      data: { productId: 'p001', quantity: 3 },
    });

    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionB },
      data: { productId: 'p002', quantity: 1 },
    });

    const cartA = await (await request.get(`${API_URL}/api/cart`, {
      headers: { 'X-Session-ID': sessionA },
    })).json();

    const cartB = await (await request.get(`${API_URL}/api/cart`, {
      headers: { 'X-Session-ID': sessionB },
    })).json();

    expect(cartA.itemCount).toBe(3);
    expect(cartB.itemCount).toBe(1);
    expect(cartA.items[0].productId).toBe('p001');
    expect(cartB.items[0].productId).toBe('p002');
  });

  /**
   * 5.3.2 — Safe incrementation: updating quantity without collisions
   * Shows why uniqueSession() prevents parallel test conflicts.
   */
  test('5.3.2 quantity updates are isolated per session', async ({ request }) => {
    const sessionId = uniqueSession();

    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: 'p003', quantity: 1 },
    });

    const updateRes = await request.put(`${API_URL}/api/cart/items/p003`, {
      headers: { 'X-Session-ID': sessionId },
      data: { quantity: 5 },
    });
    expect(updateRes.status()).toBe(200);
    const cart = await updateRes.json();
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.itemCount).toBe(5);
  });

  /**
   * 5.3.3 — Cart cleared after order: no data leaks between test steps
   */
  test('5.3.3 cart is cleared after placing an order', async ({ request }) => {
    const sessionId = uniqueSession();

    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: 'p001', quantity: 1 },
    });

    await request.post(`${API_URL}/api/orders`, {
      headers: { 'X-Session-ID': sessionId },
      data: { customer: { name: 'Cleanup Test', email: 'cleanup@test.com' } },
    });

    const cartRes = await request.get(`${API_URL}/api/cart`, {
      headers: { 'X-Session-ID': sessionId },
    });
    const cart = await cartRes.json();
    expect(cart.itemCount).toBe(0);
    expect(cart.items).toHaveLength(0);
  });

  /**
   * 5.3.4 — Missing X-Session-ID returns structured 400
   * Students learn why the header is mandatory for test isolation.
   */
  test('5.3.4 missing X-Session-ID header returns 400', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/cart`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_REQUEST');
    expect(body.message).toContain('X-Session-ID');
  });
});
