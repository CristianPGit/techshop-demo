/**
 * TS-100 — Multi-currency checkout (Stage 2 demo ticket)
 * Linear: TRI-15 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * This is the foundational demo ticket used in Stage 2 of the workshop
 * (live contrast: unstructured vs structured prompt).
 *
 * AC:
 *  1. Shopper selects currency at checkout from dropdown.
 *  2. Selected currency saved on order + shown on confirmation.
 *  3. Converted base-currency amount shown alongside original.
 *  4. On FX API failure, save without conversion + show warning.
 *  5. Order receipt (PDF/email) shows both amounts.
 *  6. Currency selection is per-order, not per-account.
 */
const SUPPORTED = ['AED','AUD','BHD','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP','HKD','HUF','ILS','INR','JOD','JPY','KRW','KWD','MXN','NOK','NZD','OMR','PLN','RON','SEK','SGD','THB','TND','TRY','USD','ZAR'];

function selectCheckoutCurrency(code) {
  if (!SUPPORTED.includes(code)) throw new Error(`Unsupported currency: ${code}`);
  return code;
}
async function convertToBase(amount, from, baseCurrency) {
  // TODO: call FX API; on failure return { amount: null, converted: false, warning: 'FX unavailable' }
  return { amount, converted: true, rate: 1, source: 'live' };
}
function buildOrderRecord({ amount, currency, base }) {
  return {
    original_amount: amount,
    original_currency: currency,
    base_amount: base.amount,
    base_currency: base.baseCurrency || 'USD',
    rate_source: base.converted ? base.source : 'unavailable',
  };
}
function formatReceiptLine(order) {
  return order.rate_source === 'unavailable'
    ? `${order.original_amount} ${order.original_currency} (conversion unavailable)`
    : `${order.original_amount} ${order.original_currency} (${order.base_amount} ${order.base_currency})`;
}

module.exports = { SUPPORTED, selectCheckoutCurrency, convertToBase, buildOrderRecord, formatReceiptLine };
