import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const CUSTOMER = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  address: { street: '123 Main Street', city: 'Springfield', country: 'US' },
};

function session() {
  return { 'X-Session-ID': `pw-${randomUUID()}` };
}

async function seedCart(request: import('@playwright/test').APIRequestContext, headers: Record<string, string>) {
  await request.post('/api/cart/items', { headers, data: { productId: 'p001', quantity: 2 } });
}

test.describe('Orders API', () => {
  test('placing an order from a non-empty cart returns 201 and clears the cart', async ({ request }) => {
    const headers = session();
    await seedCart(request, headers);

    const res = await request.post('/api/orders', {
      headers,
      data: { customer: CUSTOMER, paymentMethod: 'credit_card' },
    });
    expect(res.status()).toBe(201);

    const order = await res.json();
    expect(order.id).toMatch(/^ORD-/);
    expect(order.status).toBe('confirmed');
    expect(order.total).toBe(299.98);

    // Cart is emptied server-side after checkout.
    const cart = await (await request.get('/api/cart', { headers })).json();
    expect(cart.itemCount).toBe(0);
  });

  test('ordering with an empty cart is a 400', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: session(),
      data: { customer: CUSTOMER },
    });
    expect(res.status()).toBe(400);
  });

  test('ordering without customer details is a 400', async ({ request }) => {
    const headers = session();
    await seedCart(request, headers);
    const res = await request.post('/api/orders', { headers, data: {} });
    expect(res.status()).toBe(400);
  });

  test('an order can be retrieved by id', async ({ request }) => {
    const headers = session();
    await seedCart(request, headers);
    const created = await (
      await request.post('/api/orders', { headers, data: { customer: CUSTOMER } })
    ).json();

    const res = await request.get(`/api/orders/${created.id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).id).toBe(created.id);
  });

  test('unknown order id is a 404', async ({ request }) => {
    const res = await request.get('/api/orders/ORD-does-not-exist');
    expect(res.status()).toBe(404);
  });

  test('order status can be patched to a valid value', async ({ request }) => {
    const headers = session();
    await seedCart(request, headers);
    const created = await (
      await request.post('/api/orders', { headers, data: { customer: CUSTOMER } })
    ).json();

    const res = await request.patch(`/api/orders/${created.id}/status`, {
      data: { status: 'shipped' },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('shipped');
  });

  test('an invalid status is rejected with 400', async ({ request }) => {
    const headers = session();
    await seedCart(request, headers);
    const created = await (
      await request.post('/api/orders', { headers, data: { customer: CUSTOMER } })
    ).json();

    const res = await request.patch(`/api/orders/${created.id}/status`, {
      data: { status: 'teleported' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Health', () => {
  test('GET /api/health reports ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });
});
