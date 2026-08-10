import { test, expect } from '@playwright/test';

test.describe('GET /api/products', () => {
  test('returns all 8 products in a paginated envelope', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(8);
    expect(body.data).toHaveLength(8);
    expect(body.data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      price: expect.any(Number),
      category: expect.any(String),
      inStock: expect.any(Boolean),
    });
  });

  test('filters by category', async ({ request }) => {
    const res = await request.get('/api/products', { params: { category: 'audio' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data.every((p: any) => p.category === 'audio')).toBe(true);
  });

  test('rejects an invalid category with 400', async ({ request }) => {
    const res = await request.get('/api/products', { params: { category: 'banana' } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('BAD_REQUEST');
  });

  test('sorts by price ascending', async ({ request }) => {
    const res = await request.get('/api/products', { params: { sort: 'price-asc' } });
    const prices = (await res.json()).data.map((p: any) => p.price);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
  });

  test('paginates with limit and offset', async ({ request }) => {
    const res = await request.get('/api/products', { params: { limit: 3, offset: 0 } });
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(body.total).toBe(8);
    expect(body.limit).toBe(3);
  });

  test('filters in-stock only (excludes the out-of-stock p008)', async ({ request }) => {
    const res = await request.get('/api/products', { params: { inStock: 'true' } });
    const ids = (await res.json()).data.map((p: any) => p.id);
    expect(ids).not.toContain('p008');
  });
});

test.describe('GET /api/products/{id}', () => {
  test('returns a single product', async ({ request }) => {
    const res = await request.get('/api/products/p001');
    expect(res.status()).toBe(200);
    expect((await res.json()).id).toBe('p001');
  });

  test('returns 404 for an unknown id', async ({ request }) => {
    const res = await request.get('/api/products/p999');
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toBe('NOT_FOUND');
  });
});

test.describe('GET /api/products/search', () => {
  test('matches across name, description and category', async ({ request }) => {
    const res = await request.get('/api/products/search', { params: { q: 'wireless' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.query).toBe('wireless');
    const ids = body.data.map((p: any) => p.id);
    expect(ids).toContain('p001'); // Pro Wireless Headphones
    expect(ids).toContain('p006'); // Wireless Earbuds Pro
    expect(body).toHaveProperty('latencyMs');
  });

  test('requires a non-empty q', async ({ request }) => {
    const res = await request.get('/api/products/search', { params: { q: '' } });
    expect(res.status()).toBe(400);
  });

  test('honours the simulated delay parameter', async ({ request }) => {
    const res = await request.get('/api/products/search', { params: { q: 'hub', delay: 300 } });
    expect(res.status()).toBe(200);
    expect((await res.json()).latencyMs).toBeGreaterThanOrEqual(250);
  });
});
