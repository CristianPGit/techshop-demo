/**
 * TS-105 — Rounding for 3-decimal currencies (★★★ Advanced)
 * Linear: TRI-12 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. 3-decimal prices stored full precision (KWD, BHD, JOD, OMR, TND).
 *  2. Display uses banker's rounding (half-to-even).
 *  3. Cart subtotals computed full precision; rounded at display.
 *  4. Tax preserves full precision through line; round at final total.
 *  5. API returns both price and price_precise.
 *  6. PDF rounded; CSV full precision.
 */
const THREE_DECIMAL = new Set(['KWD','BHD','JOD','OMR','TND']);

function decimalsFor(currency) { return THREE_DECIMAL.has(currency) ? 3 : 2; }
function bankersRound(value, decimals) {
  const factor = Math.pow(10, decimals);
  const n = value * factor;
  const r = Math.round(n);
  if (Math.abs(n - Math.trunc(n) - 0.5) < 1e-9) {
    return (Math.trunc(n) % 2 === 0 ? Math.trunc(n) : Math.trunc(n) + Math.sign(n)) / factor;
  }
  return r / factor;
}
function formatPrice(value, currency) {
  const d = decimalsFor(currency);
  return bankersRound(value, d).toFixed(d);
}

module.exports = { THREE_DECIMAL, decimalsFor, bankersRound, formatPrice };
