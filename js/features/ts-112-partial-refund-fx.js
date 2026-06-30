/**
 * TS-112 — Partial refund with FX reconciliation (★★★ Advanced)
 * Linear: TRI-38 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Admin selects specific line items + quantities to refund.
 *  2. Refund in shopper currency uses the ORIGINAL order FX rate.
 *  3. Base-currency ledger records original + refund-time rate; FX delta booked separately.
 *  4. Refund cannot exceed captured amount for the lines (incl. prior refunds).
 *  5. Receipt shows items, shopper amount, base amount, both rates + dates.
 */
function refundLines(order, selections, refundRate, refundDate) {
  let shopperAmount = 0;
  const items = [];
  for (const sel of selections) {
    const line = order.lines.find(l => l.sku === sel.sku);
    if (!line) throw new Error(`Unknown line: ${sel.sku}`);
    const refundable = line.qty - (line.refundedQty || 0);
    if (sel.qty > refundable) {
      throw new Error(`Refund exceeds captured qty for ${sel.sku}`);
    }
    const amount = round2(line.unitPrice * sel.qty);
    shopperAmount += amount;
    items.push({ sku: sel.sku, qty: sel.qty, amount });
  }
  shopperAmount = round2(shopperAmount);

  // AC2: refund to shopper at the ORIGINAL rate.
  const baseAtOriginal = round2(shopperAmount / order.fxRate);
  // AC3: what it would cost at today's rate, and the delta the store absorbs.
  const baseAtRefund = round2(shopperAmount / refundRate);
  const fxDelta = round2(baseAtRefund - baseAtOriginal);

  return {
    items,
    shopperAmount,
    shopperCurrency: order.currency,
    baseAmount: baseAtOriginal,
    fxDelta,
    originalRate: order.fxRate,
    originalRateDate: order.fxRateDate,
    refundRate,
    refundRateDate: refundDate,
  };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

module.exports = { refundLines };
