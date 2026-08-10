import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/** Each test gets a fresh session id so carts stay isolated (Module 5.3 pattern). */
function session() {
  return { 'X-Session-ID': `pw-${randomUUID()}` };
}

test.describe('Cart API', () => {
  test('GET /api/cart without a session header is a 400', async ({ request }) => {
    const res = await request.get('/api/cart');
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('BAD_REQUEST');
  });

  test('POST /api/cart/items adds a product', async ({ request }) => {
    const headers = session();
    const res = await request.post('/api/cart/items', {
      headers,
      data: { productId: 'p001', quantity: 2 },
    });
    expect(res.status()).toBe(201);

    const cart = await res.json();
    expect(cart.itemCount).toBe(2);
    expect(cart.items[0]).toMatchObject({ productId: 'p001', quantity: 2, subtotal: 299.98 });
    expect(cart.total).toBe(299.98);
  });

  test('adding an out-of-stock product returns 409', async ({ request }) => {
    const res = await request.post('/api/cart/items', {
      headers: session(),
      data: { productId: 'p008' }, // Phone Gimbal Stabilizer — inStock: false
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toBe('OUT_OF_STOCK');
  });

  test('adding an unknown product returns 404', async ({ request }) => {
    const res = await request.post('/api/cart/items', {
      headers: session(),
      data: { productId: 'p999' },
    });
    expect(res.status()).toBe(404);
  });

  test('PUT updates the quantity of an existing item', async ({ request }) => {
    const headers = session();
    await request.post('/api/cart/items', { headers, data: { productId: 'p001' } });

    const res = await request.put('/api/cart/items/p001', { headers, data: { quantity: 5 } });
    expect(res.status()).toBe(200);
    expect((await res.json()).items[0].quantity).toBe(5);
  });

  test('DELETE removes a single item', async ({ request }) => {
    const headers = session();
    await request.post('/api/cart/items', { headers, data: { productId: 'p001' } });
    await request.post('/api/cart/items', { headers, data: { productId: 'p002' } });

    const res = await request.delete('/api/cart/items/p001', { headers });
    expect(res.status()).toBe(200);
    const cart = await res.json();
    expect(cart.items.map((i: any) => i.productId)).toEqual(['p002']);
  });

  test('DELETE /api/cart clears everything', async ({ request }) => {
    const headers = session();
    await request.post('/api/cart/items', { headers, data: { productId: 'p001' } });

    const res = await request.delete('/api/cart', { headers });
    expect(res.status()).toBe(200);
    expect((await res.json()).itemCount).toBe(0);
  });

  test('sessions are isolated from one another', async ({ request }) => {
    const a = session();
    const b = session();
    await request.post('/api/cart/items', { headers: a, data: { productId: 'p001' } });

    const cartB = await (await request.get('/api/cart', { headers: b })).json();
    expect(cartB.itemCount).toBe(0); // B never saw A's additions
  });
});
