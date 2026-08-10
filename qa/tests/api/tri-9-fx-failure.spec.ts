/**
 * TRI-9 · TS-102 FX rate API failure on checkout — logic-level automation.
 *
 * The feature (js/features/ts-102-fx-failure-checkout.js, from PR #5) is a
 * CommonJS module of pure helpers, not yet wired into the checkout UI. This
 * suite drives the module directly through the Playwright runner (no browser),
 * mirroring the TRI-15 pattern.
 *
 * AC coverage map:
 *  AC1 (error/timeout >3s → cached fallback)  — fetchRate is still a TODO stub
 *      returning a hardcoded live rate, so the fallback path is pinned as an
 *      explicit expected-gap (test.fixme), plus a real pin on the 3s constant.
 *  AC2 (warning banner)                       — pure UI, nothing in the module
 *      to drive yet → fixme.
 *  AC3 (order flagged rate_source=cached)     — buildRateSource, fully tested.
 *  AC4 (5-min background retry, banner clears) — retry loop not implemented;
 *      the interval constant is pinned, the behavior is a fixme.
 *  AC5 (cache older than 24h → checkout disabled) — canCheckout/isCacheStale,
 *      fully tested including the 24h boundary.
 */
import { test, expect } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const feature = require('../../../js/features/ts-102-fx-failure-checkout.js');
const {
  fetchRate,
  isCacheStale,
  buildRateSource,
  canCheckout,
  FX_TIMEOUT_MS,
  CACHE_MAX_AGE_MS,
  RETRY_INTERVAL_MS,
} = feature;

const HOUR_MS = 60 * 60 * 1000;

test.describe('TRI-9 · FX fallback on API failure (AC1)', () => {
  test('AC1 — FX timeout budget is 3 seconds', () => {
    expect(FX_TIMEOUT_MS).toBe(3000);
  });

  test.fixme(
    'AC1 — fetchRate falls back to the cached rate on API error/timeout',
    async () => {
      // Expected-gap: fetchRate is a TODO stub that always returns
      // { rate: 1, source: 'live', cachedAt: 0 } — there is no timeout, no
      // error handling and no cache read yet. When implemented, this should
      // simulate an FX outage and assert { source: 'cached', cachedAt > 0 }.
      const res = await fetchRate('EUR', 'USD');
      expect(res.source).toBe('cached');
    },
  );

  test('AC1 (current stub behavior) — fetchRate resolves with a live-shaped result', async () => {
    // Pins the stub contract so the fixme above flips loudly once the real
    // implementation lands (source will change / cachedAt becomes meaningful).
    const res = await fetchRate('EUR', 'USD');
    expect(res).toEqual({ rate: 1, source: 'live', cachedAt: 0 });
  });
});

test.describe('TRI-9 · warning banner (AC2, AC4-banner)', () => {
  test.fixme(
    'AC2 — checkout shows "Live rates unavailable — using rate from {timestamp}" when on cached rate',
    () => {
      // Expected-gap: the module exposes no banner/UI state and the checkout
      // page is not wired to it. Automate as an e2e spec once wired.
    },
  );

  test.fixme('AC4 — banner disappears after a successful background retry', () => {
    // Expected-gap: no retry loop exists yet (only the interval constant).
  });
});

test.describe('TRI-9 · order flagged with rate source (AC3)', () => {
  test('AC3 — order built from a cached rate is flagged rate_source=cached', () => {
    expect(buildRateSource(true)).toBe('cached');
  });

  test('AC3 — order built from a live rate is flagged rate_source=live', () => {
    expect(buildRateSource(false)).toBe('live');
  });
});

test.describe('TRI-9 · background retry cadence (AC4)', () => {
  test('AC4 — retry interval constant is 5 minutes', () => {
    expect(RETRY_INTERVAL_MS).toBe(5 * 60 * 1000);
  });
});

test.describe('TRI-9 · stale-cache checkout lockout (AC5)', () => {
  test('AC5 — cache max age is 24 hours', () => {
    expect(CACHE_MAX_AGE_MS).toBe(24 * HOUR_MS);
  });

  test('AC5 — checkout allowed with a fresh cached rate (1h old)', () => {
    expect(canCheckout(1 * HOUR_MS)).toBe(true);
  });

  test('AC5 — boundary: exactly 24h-old cache still allows checkout', () => {
    expect(canCheckout(CACHE_MAX_AGE_MS)).toBe(true);
  });

  test('AC5 — boundary: 24h + 1ms disables checkout', () => {
    expect(canCheckout(CACHE_MAX_AGE_MS + 1)).toBe(false);
  });

  test('AC5 — isCacheStale agrees with canCheckout across the boundary', () => {
    const now = 1_700_000_000_000; // fixed reference instant
    for (const age of [0, HOUR_MS, CACHE_MAX_AGE_MS, CACHE_MAX_AGE_MS + 1, 48 * HOUR_MS]) {
      expect(isCacheStale(now - age, now)).toBe(!canCheckout(age));
    }
  });

  test('AC5 — negative/zero age (rate just fetched) never blocks checkout', () => {
    expect(canCheckout(0)).toBe(true);
    expect(isCacheStale(Date.now(), Date.now())).toBe(false);
  });
});
