// ============================================================
// Module 4 — CI Error Logs & Performance Analysis
// 4.1: Navigating CI error logs + feeding them to LLMs
// 4.2: Auto-generating bug repro steps from failures
// 4.3: Performance statistics & percentile calculations
// ============================================================

// @ts-check
const { test, expect } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// ─── 4.1: Error Log Patterns (intentional failures for CI log training) ──────

test.describe('4.1 — CI Error Log Patterns', () => {
  /**
   * 4.1.1 — Baseline: passing health check
   * A green run to compare against red runs in the course.
   */
  test('4.1.1 health check returns ok @smoke', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  /**
   * 4.1.2 — INTENTIONALLY FRAGILE: hardcoded count assertion
   * Toggle bug-duplicate-card in the UI bugs panel to make this fail.
   * Produces a clear diff in CI logs — good for "feeding red logs to Claude" demo.
   * @smoke
   */
  test('4.1.2 products endpoint returns exactly 8 products @smoke', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/products`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Intentionally fragile: if a product is added/removed, this fails
    expect(body.total).toBe(8);
    expect(body.data).toHaveLength(8);
  });

  /**
   * 4.1.3 — Wrong status code expectation (for CI log demos)
   * Students feed this failure log to Claude to generate a bug repro (4.2.1).
   */
  test('4.1.3 invalid product ID returns 404 with structured error', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/products/INVALID_ID`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toContain('INVALID_ID');
  });

  /**
   * 4.1.4 — Auth failure produces 401 (structured error for Claude to parse)
   */
  test('4.1.4 wrong credentials return 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: 'demo@techshop.com', password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });
});

// ─── 4.2: Bug Repro Steps from API Responses ─────────────────────────────────

test.describe('4.2 — Auto-generating Bug Repro Steps', () => {
  /**
   * 4.2.1 — Full negative scenario: out-of-stock product
   * The 409 response + body together are the "repro evidence" Claude uses.
   */
  test('4.2.1 adding out-of-stock product to cart returns 409', async ({ request }) => {
    const sessionId = `repro-test-${Date.now()}`;
    const res = await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: 'p008', quantity: 1 }, // p008 is out of stock
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('OUT_OF_STOCK');
    expect(body.message).toContain('out of stock');
  });

  /**
   * 4.2.2 — Missing required field produces 400 with actionable message
   * Claude can extract the field name + fix from the error body.
   */
  test('4.2.2 order without customer details returns 400', async ({ request }) => {
    const sessionId = `repro-order-${Date.now()}`;
    // Add item to cart first
    await request.post(`${API_URL}/api/cart/items`, {
      headers: { 'X-Session-ID': sessionId },
      data: { productId: 'p001', quantity: 1 },
    });

    const res = await request.post(`${API_URL}/api/orders`, {
      headers: { 'X-Session-ID': sessionId },
      data: { paymentMethod: 'credit_card' }, // missing customer
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_REQUEST');
    expect(body.message).toContain('customer');
  });

  /**
   * 4.2.3 — Empty cart order: structured repro steps
   */
  test('4.2.3 ordering from empty cart returns 400', async ({ request }) => {
    const sessionId = `empty-cart-${Date.now()}`;
    const res = await request.post(`${API_URL}/api/orders`, {
      headers: { 'X-Session-ID': sessionId },
      data: { customer: { name: 'Test', email: 'test@test.com' } },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('empty');
  });
});

// ─── 4.3: Performance Statistics ─────────────────────────────────────────────

test.describe('4.3 — Performance & Percentile Analysis', () => {
  const SAMPLE_SIZE = 10;
  const P95_THRESHOLD_MS = 500;
  const P99_THRESHOLD_MS = 1000;

  /**
   * 4.3.1 — Collect raw latency samples (baseline)
   * Students calculate mean, median, p95 from the latencyMs values.
   */
  test('4.3.1 collect search latency samples for statistics', async ({ request }) => {
    const samples = [];

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const start = Date.now();
      const res = await request.get(`${API_URL}/api/products/search?q=wireless&delay=0`);
      const wallTime = Date.now() - start;
      expect(res.status()).toBe(200);
      const body = await res.json();
      samples.push({ latencyMs: body.latencyMs, wallTime });
    }

    // Basic statistics — students extend this with Claude (4.3.1 exercise)
    const latencies = samples.map(s => s.latencyMs).sort((a, b) => a - b);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];

    console.log(`Search latency over ${SAMPLE_SIZE} samples:`);
    console.log(`  Mean:   ${mean.toFixed(1)}ms`);
    console.log(`  Median: ${median}ms`);
    console.log(`  P95:    ${p95}ms`);

    expect(mean).toBeGreaterThan(0);
    expect(samples).toHaveLength(SAMPLE_SIZE);
  });

  /**
   * 4.3.2 — P95 assertion: API must respond within threshold at p95
   * Set delay=300 to simulate a slower backend and watch this fail.
   */
  test(`4.3.2 search p95 latency must be under ${P95_THRESHOLD_MS}ms`, async ({ request }) => {
    const latencies = [];

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const res = await request.get(`${API_URL}/api/products/search?q=audio&delay=0`);
      const body = await res.json();
      latencies.push(body.latencyMs);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];
    const p99 = latencies[Math.ceil(latencies.length * 0.99) - 1];

    console.log(`P95: ${p95}ms | P99: ${p99}ms | Threshold: ${P95_THRESHOLD_MS}ms`);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });

  /**
   * 4.3.3 — Slow endpoint simulation: intentional latency injection
   * Use this to demonstrate what a p95 breach looks like in CI.
   * Students run with delay=600 to reproduce the failure.
   */
  test('4.3.3 search with delay=200 returns latencyMs close to requested', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/products/search?q=keyboard&delay=200`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Allow ±100ms tolerance around the requested delay
    expect(body.latencyMs).toBeGreaterThanOrEqual(180);
    expect(body.latencyMs).toBeLessThan(400);
  });
});
