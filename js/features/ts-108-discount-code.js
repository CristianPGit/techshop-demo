/**
 * TS-108 — Discount code field at checkout (★ Basic)
 * Linear: TRI-34 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. "Discount code" input + "Apply" button in the checkout summary.
 *  2. Percentage codes (SAVE10 = 10%) or fixed-amount codes (WELCOME5 = 5.00 off).
 *  3. Invalid / expired / used codes show an inline error, total unchanged.
 *  4. Only one code active at a time; a new code replaces the previous one.
 *  5. Discount line + recalculated total reflected immediately.
 */
const CODES = {
  SAVE10:   { type: 'percent', value: 10 },
  WELCOME5: { type: 'fixed',   value: 5.0 },
  EXPIRED:  { type: 'percent', value: 20, expired: true },
};

function applyDiscount(subtotal, code) {
  const rule = CODES[String(code || '').toUpperCase()];
  if (!rule || rule.expired) {
    return { ok: false, error: 'Invalid or expired discount code', total: subtotal };
  }
  const discount = rule.type === 'percent'
    ? subtotal * (rule.value / 100)
    : Math.min(rule.value, subtotal);
  const total = Math.max(0, subtotal - discount);
  return { ok: true, discount: round2(discount), total: round2(total) };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

module.exports = { applyDiscount, CODES };
