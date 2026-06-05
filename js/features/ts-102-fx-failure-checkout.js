/**
 * TS-102 — FX rate API failure on checkout (★★ Intermediate)
 * Linear: TRI-9 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. On FX API error/timeout (>3s), proceed with last cached rate.
 *  2. Warning banner on checkout: "Live rates unavailable — using rate from {ts}".
 *  3. Order flagged rate_source=cached.
 *  4. Background retry every 5 min; banner clears on success.
 *  5. Cached rate >24h → checkout disabled with error.
 */
const FX_TIMEOUT_MS = 3000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;

async function fetchRate(from, to) {
  // TODO: fetch with timeout, fall back to cache, return { rate, source, cachedAt }
  return { rate: 1, source: 'live', cachedAt: 0 };
}
function isCacheStale(cachedAt, now) { return (now - cachedAt) > CACHE_MAX_AGE_MS; }
function buildRateSource(usedCache) { return usedCache ? 'cached' : 'live'; }
function canCheckout(cacheAge) { return cacheAge <= CACHE_MAX_AGE_MS; }

module.exports = { fetchRate, isCacheStale, buildRateSource, canCheckout, FX_TIMEOUT_MS, CACHE_MAX_AGE_MS, RETRY_INTERVAL_MS };
