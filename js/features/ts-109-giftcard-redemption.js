/**
 * TS-109 — Gift card balance redemption with multi-currency (★★ Intermediate)
 * Linear: TRI-35 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Show remaining balance in the card's native currency.
 *  2. Applied amount converted to order currency at the daily FX rate, capped at total.
 *  3. Balance > total: consume only what's needed, remainder stays on card.
 *  4. Total > balance: show remaining amount due for another payment method.
 *  5. Redemption is atomic — a failed payment must not deduct the balance.
 */
function redeemGiftCard({ balance, balanceCurrency, orderTotal, orderCurrency, fxRate }) {
  const balanceInOrderCcy = round2(balance * fxRate);          // card ccy -> order ccy
  const applied = Math.min(balanceInOrderCcy, orderTotal);
  const amountDue = round2(orderTotal - applied);
  const remainingBalance = round2((balanceInOrderCcy - applied) / fxRate); // back to card ccy
  return {
    applied: round2(applied),
    amountDue,
    remainingBalance,
    balanceCurrency,
    orderCurrency,
    fxRate,
  };
}

// NOTE: caller must only call commitRedemption() after payment capture succeeds.
function commitRedemption(quote, paymentOk) {
  if (!paymentOk) return { committed: false, balanceDelta: 0 };
  return { committed: true, balanceDelta: -quote.applied };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

module.exports = { redeemGiftCard, commitRedemption };
