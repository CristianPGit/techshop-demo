/**
 * TS-103 — Order export with multi-currency columns (★★ Intermediate)
 * Linear: TRI-10 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. CSV cols: original_total, original_currency, base_total, base_currency, fx_rate, rate_date.
 *  2. PDF invoice shows both totals side by side.
 *  3. rate_source=cached orders flagged with asterisk.
 *  4. Respect admin date range + status filters.
 *  5. File naming: orders_{storeId}_{YYYYMMDD}_{HHMM}.{ext}.
 */
const CSV_COLUMNS = ['order_id','original_total','original_currency','base_total','base_currency','fx_rate','rate_date','rate_source'];

function pad(n) { return String(n).padStart(2, '0'); }
function buildExportFilename(storeId, ext, date) {
  const d = date instanceof Date ? date : new Date(date);
  const ymd = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const hm = `${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `orders_${storeId}_${ymd}_${hm}.${ext}`;
}
function flagCachedRate(row) {
  return row.rate_source === 'cached' ? `${row.original_total}*` : `${row.original_total}`;
}
function toCsvRow(order) { return CSV_COLUMNS.map(c => order[c] ?? '').join(','); }

module.exports = { CSV_COLUMNS, buildExportFilename, flagCachedRate, toCsvRow };
