/**
 * TS-101 — Currency selector on product page (★ Basic)
 * Linear: TRI-8 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Dropdown lists 32 supported currencies, alphabetical by ISO code.
 *  2. Default detected from browser locale (fallback USD).
 *  3. Selection persists across pages via localStorage.
 *  4. Keyboard-accessible (tab + arrow keys).
 *  5. Visible prices update immediately on change.
 */
const SUPPORTED = ['AED','AUD','BHD','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP','HKD','HUF','ILS','INR','JOD','JPY','KRW','KWD','MXN','NOK','NZD','OMR','PLN','RON','SEK','SGD','THB','TND','TRY','USD','ZAR'];
const STORAGE_KEY = 'techshop.currency';

function listCurrencies() { return [...SUPPORTED].sort(); }
function getSelectedCurrency() {
  if (typeof localStorage === 'undefined') return detectDefault();
  return localStorage.getItem(STORAGE_KEY) || detectDefault();
}
function setSelectedCurrency(code) {
  if (SUPPORTED.includes(code) && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, code);
  }
}
function detectDefault() { return 'USD'; /* TODO: derive from navigator.language */ }

module.exports = { listCurrencies, getSelectedCurrency, setSelectedCurrency, SUPPORTED };
