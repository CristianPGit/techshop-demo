import { test, expect } from '@playwright/test';

const DEMO = { email: 'demo@techshop.com', password: 'password123' };

async function login(request: import('@playwright/test').APIRequestContext) {
  const res = await request.post('/api/auth/login', { data: DEMO });
  return (await res.json()).token as string;
}

test.describe('Auth API', () => {
  test('login with valid credentials returns a token and user', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: DEMO });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ email: DEMO.email, name: 'Demo User' });
    expect(body.expiresIn).toBe(3600);
  });

  test('login with a bad password is a 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: DEMO.email, password: 'nope' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('UNAUTHORIZED');
  });

  test('login with missing fields is a 400', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: DEMO.email } });
    expect(res.status()).toBe(400);
  });

  test('GET /api/auth/me returns the user for a valid token', async ({ request }) => {
    const token = await login(request);
    const res = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).email).toBe(DEMO.email);
  });

  test('GET /api/auth/me without a token is a 401', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('logout invalidates the token', async ({ request }) => {
    const token = await login(request);
    const headers = { Authorization: `Bearer ${token}` };

    const out = await request.post('/api/auth/logout', { headers });
    expect(out.status()).toBe(200);

    // Token no longer works.
    const me = await request.get('/api/auth/me', { headers });
    expect(me.status()).toBe(401);
  });
});
