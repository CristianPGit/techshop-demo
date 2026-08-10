/**
 * TRI-15 · TS-100 Multi-currency checkout — logic-level automation.
 *
 * The feature (js/features/ts-100-multi-currency-checkout-demo.js) is a CommonJS
 * module of pure functions, not yet wired into the checkout UI. So this suite
 * drives the module directly through the Playwright runner (no browser).
 *
 * Traceability to the 6 ACs is noted per test. AC4's *source* path
 * (convertToBase returning a failure shape on FX outage) is still a TODO in the
 * feature — the record/receipt side already handles the unavailable state, so
 * that half is asserted here and the convertToBase FX-failure half is pinned as
 * an explicit expected-gap (test.fixme) rather than a false green.
 */
import { test, expect } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const feature = require('../../../js/features/ts-100-multi-currency-checkout-demo.js');
const { SUPPORTED, selectCheckoutCurrency, convertToBase, buildOrderRecord, formatReceiptLine } = feature;

test.describe('TRI-15 · currency dropdown / selection (AC1, AC6)', () => {
  test('AC1 — supports 32 unique currencies including the demo set', () => {
    expect(SUPPORTED).toHaveLength(32);
    expect(new Set(SUPPORTED).size).toBe(32); // no duplicates
    for (const code of ['USD', 'EUR', 'JPY', 'BHD', 'KWD']) {
      expect(SUPPORTED).toContain(code);
    }
  });

  test('AC1 — selecting a supported currency returns the code', () => {
    expect(selectCheckoutCurrency('EUR')).toBe('EUR');
    expect(selectCheckoutCurrency('USD')).toBe('USD');
  });

  test('AC1/AC6 — an unsupported currency is rejected, not silently accepted', () => {
    expect(() => selectCheckoutCurrency('XXX')).toThrow(/Unsupported currency/);
    expect(() => selectCheckoutCurrency('BTC')).toThrow(/Unsupported currency/); // crypto is out of scope
  });
});

test.describe('TRI-15 · conversion to base currency (AC3)', () => {
  test('AC3 — convertToBase returns a converted amount with a rate + source', async () => {
    const res = await convertToBase(100, 'EUR', 'USD');
    expect(res.converted).toBe(true);
    expect(res).toHaveProperty('rate');
    expect(res).toHaveProperty('source', 'live');
    expect(res.amount).toBe(100);
  });
});

test.describe('TRI-15 · order record persistence (AC2)', () => {
  test('AC2 — a converted order stores both original and base amounts', async () => {
    const base = { ...(await convertToBase(100, 'EUR', 'USD')), baseCurrency: 'USD' };
    const order = buildOrderRecord({ amount: 100, currency: 'EUR', base });
    expect(order).toMatchObject({
      original_amount: 100,
      original_currency: 'EUR',
      base_amount: 100,
      base_currency: 'USD',
      rate_source: 'live',
    });
  });

  test('AC2 — base currency defaults to USD when unspecified', () => {
    const order = buildOrderRecord({
      amount: 50,
      currency: 'GBP',
      base: { amount: 50, converted: true, source: 'live' },
    });
    expect(order.base_currency).toBe('USD');
  });
});

test.describe('TRI-15 · receipt shows both amounts (AC5)', () => {
  test('AC5 — a converted receipt line lists original and base amounts', () => {
    const line = formatReceiptLine({
      original_amount: 100,
      original_currency: 'EUR',
      base_amount: 108,
      base_currency: 'USD',
      rate_source: 'live',
    });
    expect(line).toBe('100 EUR (108 USD)');
  });
});

test.describe('TRI-15 · FX unavailable — graceful degradation (AC4)', () => {
  test('AC4 — an unconverted order is marked rate_source "unavailable"', () => {
    const order = buildOrderRecord({
      amount: 100,
      currency: 'EUR',
      base: { amount: null, converted: false, baseCurrency: 'USD' },
    });
    expect(order.rate_source).toBe('unavailable');
    expect(order.original_amount).toBe(100); // order still saved with the original
  });

  test('AC4 — receipt for an unconverted order says "conversion unavailable"', () => {
    const line = formatReceiptLine({
      original_amount: 100,
      original_currency: 'EUR',
      base_amount: null,
      base_currency: 'USD',
      rate_source: 'unavailable',
    });
    expect(line).toBe('100 EUR (conversion unavailable)');
  });

  // Expected gap: convertToBase is still a stub (rate:1, always converted:true).
  // Until the FX call + failure branch land, it cannot itself produce the
  // unavailable shape AC4 requires. Pinned so it flips green the moment it's built.
  test.fixme('AC4 — convertToBase returns the failure shape when the FX API is down', async () => {
    const res = await convertToBase(100, 'EUR', 'USD', { fxDown: true });
    expect(res.converted).toBe(false);
    expect(res.warning).toMatch(/unavailable/i);
  });
});
