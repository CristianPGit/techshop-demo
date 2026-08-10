/**
 * TRI-15 · TS-100 Multi-currency checkout — HAPPY PATH (golden path only).
 *
 * Exercises the full success chain end-to-end through the feature module:
 *   selectCheckoutCurrency → convertToBase → buildOrderRecord → formatReceiptLine
 * i.e. the shopper picks a supported currency, the amount converts, the order
 * persists both amounts, and the receipt shows both. No sad/edge paths here.
 *
 * Mirrors the H1–H5 happy-path checklist posted to TRI-15, at the logic layer
 * (the module isn't wired into the checkout UI yet).
 */
import { test, expect } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const feature = require('../../../js/features/ts-100-multi-currency-checkout-demo.js');
const { selectCheckoutCurrency, convertToBase, buildOrderRecord, formatReceiptLine } = feature;

const BASE = 'USD';

/** One shopper checkout, all four steps, returning the pieces to assert on. */
async function checkout(amount: number, currency: string) {
  const selected = selectCheckoutCurrency(currency);
  const conv = await convertToBase(amount, selected, BASE);
  const order = buildOrderRecord({ amount, currency: selected, base: { ...conv, baseCurrency: BASE } });
  const receipt = formatReceiptLine(order);
  return { selected, conv, order, receipt };
}

test.describe('TRI-15 · happy path — golden checkout chain', () => {
  test('H1/H2 — pick EUR, convert, and get a persisted order with both amounts', async () => {
    const { selected, conv, order } = await checkout(100, 'EUR');
    expect(selected).toBe('EUR');                 // H1: currency selected
    expect(conv.converted).toBe(true);            // H2: conversion happened
    expect(order.original_currency).toBe('EUR');  // H1: saved on order
    expect(order.original_amount).toBe(100);      // original preserved
    expect(order.base_amount).toBe(conv.amount);  // H2: base amount present
    expect(order.base_currency).toBe('USD');
    expect(order.rate_source).toBe('live');       // converted via live rate
  });

  test('H3 — receipt lists the original and the base amount together', async () => {
    const { receipt, order } = await checkout(100, 'EUR');
    expect(receipt).toBe(`100 EUR (${order.base_amount} USD)`);
    expect(receipt).toContain('EUR');
    expect(receipt).toContain('USD');
    expect(receipt).not.toContain('unavailable');
  });

  test('H4 — currency is per-order: two orders on the same run keep their own', async () => {
    const first = await checkout(100, 'EUR');
    const second = await checkout(5000, 'JPY');
    expect(first.order.original_currency).toBe('EUR');
    expect(second.order.original_currency).toBe('JPY');
    // no shared/leaked state between the two checkouts
    expect(first.order.original_amount).toBe(100);
    expect(second.order.original_amount).toBe(5000);
  });

  test('H5 — checking out in the base currency (USD) round-trips cleanly', async () => {
    const { selected, order, receipt } = await checkout(250, 'USD');
    expect(selected).toBe('USD');
    expect(order.original_currency).toBe('USD');
    expect(order.base_currency).toBe('USD');
    expect(order.original_amount).toBe(order.base_amount); // same currency ⇒ same figure
    expect(receipt).toBe('250 USD (250 USD)');
  });

  // Data-driven golden path across a spread of the 32 supported currencies.
  for (const cur of ['GBP', 'CHF', 'CAD', 'AUD', 'SGD', 'BHD']) {
    test(`H-multi — golden chain succeeds for ${cur}`, async () => {
      const { order, receipt } = await checkout(100, cur);
      expect(order.original_currency).toBe(cur);
      expect(order.rate_source).toBe('live');
      expect(receipt).toBe(`100 ${cur} (${order.base_amount} USD)`);
    });
  }
});
