/**
 * TS-106 — Multi-currency sales report aggregation (★★★ Advanced)
 * Linear: TRI-13 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Per-currency breakdown table.
 *  2. Grand total in store base currency.
 *  3. Any cached-rate order → "Approximate*" on grand total.
 *  4. Toggle: Original currencies vs All in base.
 *  5. FX rate at order date, not report-run date.
 *  6. Respect date range, category, channel filters.
 */
function groupByCurrency(orders) {
  const out = {};
  for (const o of orders) {
    const c = o.original_currency;
    if (!out[c]) out[c] = { count: 0, original_total: 0, converted_total: 0 };
    out[c].count += 1;
    out[c].original_total += o.original_total;
    out[c].converted_total += o.base_total;
  }
  return out;
}
function aggregateToBase(orders) {
  return orders.reduce((s, o) => s + (o.base_total || 0), 0);
}
function hasApproximate(orders) {
  return orders.some(o => o.rate_source === 'cached');
}
function formatGrandTotal(total, approximate) {
  return approximate ? `${total}*` : `${total}`;
}

module.exports = { groupByCurrency, aggregateToBase, hasApproximate, formatGrandTotal };
