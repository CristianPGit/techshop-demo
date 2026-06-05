/**
 * TS-107 — Currency validation on product bulk-import CSV (★ Basic)
 * Linear: TRI-14 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Accept ISO 4217 three-letter codes (case-insensitive).
 *  2. Invalid codes → reject row with clear error.
 *  3. Summary: accepted, rejected, reason per rejection.
 *  4. >20% rejected → abort whole import + rollback.
 *  5. Empty cell → default to store base currency.
 */
const ABORT_THRESHOLD = 0.20;
const VALID_CODES = new Set(['AED','AUD','BHD','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP','HKD','HUF','ILS','INR','JOD','JPY','KRW','KWD','MXN','NOK','NZD','OMR','PLN','RON','SEK','SGD','THB','TND','TRY','USD','ZAR']);

function normalizeCode(code) { return (code || '').trim().toUpperCase(); }
function validateRow(row, baseCurrency) {
  const raw = normalizeCode(row.currency);
  const code = raw || baseCurrency;
  if (!VALID_CODES.has(code)) {
    return { ok: false, reason: `Unsupported currency: ${row.currency}` };
  }
  return { ok: true, currency: code };
}
function shouldAbort(rejected, total) {
  return total > 0 && (rejected / total) > ABORT_THRESHOLD;
}

module.exports = { ABORT_THRESHOLD, VALID_CODES, normalizeCode, validateRow, shouldAbort };
