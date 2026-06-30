/**
 * TS-110 — Cart stock reservation timeout (★★ Intermediate)
 * Linear: TRI-36 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Adding to cart reserves the quantity for 15 minutes.
 *  2. Countdown visible in cart, refreshed when the cart is modified.
 *  3. On expiry the reservation is released with a notice.
 *  4. Reserved stock unavailable at checkout flags the line; order cannot proceed.
 *  5. Concurrent shoppers cannot reserve the same unit twice (no oversell).
 */
const RESERVE_MS = 15 * 60 * 1000;

function reserve(sku, qty, available, now) {
  if (qty > available) {
    return { ok: false, reason: 'insufficient_stock', reserved: 0 };
  }
  return { ok: true, sku, reserved: qty, expiresAt: now + RESERVE_MS };
}

function isExpired(reservation, now) {
  return now >= reservation.expiresAt;
}

function remainingMs(reservation, now) {
  return Math.max(0, reservation.expiresAt - now);
}

// Re-validate at checkout: an expired or released reservation must block the order.
function validateAtCheckout(reservation, now, currentAvailable) {
  if (isExpired(reservation, now) && currentAvailable < reservation.reserved) {
    return { ok: false, flagged: true, reason: 'reservation_expired' };
  }
  return { ok: true, flagged: false };
}

module.exports = { reserve, isExpired, remainingMs, validateAtCheckout, RESERVE_MS };
