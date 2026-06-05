/**
 * TS-104 — Concurrent cart edit conflict across devices (★★★ Advanced)
 * Linear: TRI-11 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Device B sees conflict dialog when saving over A's edit.
 *  2. Dialog: item-by-item diff highlighting.
 *  3. Resolution options: keep this / keep other / merge per-line.
 *  4. Audit log records both device IDs.
 *  5. Device C edit during B's resolution → re-resolve.
 *  6. Works for authenticated + guest carts.
 */
function detectConflict(localVersion, serverVersion) {
  return localVersion !== serverVersion;
}
function diffCarts(a, b) {
  // TODO: per-line diff
  return { added: [], removed: [], changed: [] };
}
function resolveConflict(strategy, localCart, serverCart) {
  // TODO: strategy ∈ {'keep-local','keep-server','merge'}
  if (strategy === 'keep-server') return serverCart;
  return localCart;
}
function logResolution(auditLog, deviceA, deviceB, strategy, timestamp) {
  auditLog.push({ deviceA, deviceB, strategy, at: timestamp });
}

module.exports = { detectConflict, diffCarts, resolveConflict, logResolution };
