# 🧪 QA Test Plan — Region-based VAT/GST tax (TRI-37 / TS-111)

Grounded in the ticket: draft stub `js/features/ts-111-region-tax.js` (PR [#16](https://github.com/CristianPGit/techshop-demo/pull/16), **not imported** anywhere — pure Node module exporting `calculateTax(lines, region, vatId)`, `taxForLine`, `REGIONS`, `VAT_ID`). ACs = resolve rate from shipping region (1), inclusive vs. exclusive handling (2), VAT/GST-ID exemption after format validation (3), per-line taxing by category then sum (4), breakdown shown + stored (5). Base = USD, `round2` half-up. Source: [TRI-37](https://linear.app/tripleten-pandele/issue/TRI-37).

> Workshop target (★★★ Advanced). Cases are **unit-level** against the module (`require('./js/features/ts-111-region-tax.js')`). Two ACs are **UI/persistence** — the stub is calc-only and unmounted, so those are ⚠️ **not-yet-testable / expected FAIL**. Each case maps back to an AC.

## Stub-modeled reality (audit)
- `REGIONS`: `AT` 20% incl · `DE` 19% incl · `GB` 20% incl · `US-CA` 7.25% **excl** · `AU` 10% incl. Keyed by a single string (`'US-CA'` = country-state). Everything else → `undefined`.
- Unknown/unmapped region **or** `exempt` **or** `category === 'zero-rated'` → `{rate:0, tax:0}`.
- `inclusive`: `tax = amount − amount/(1+rate)` (extract from gross). `exclusive`: `tax = amount × rate` (add on net).
- `VAT_ID = /^[A-Z]{2}[0-9A-Z]{8,12}$/` → 2 upper letters + 8–12 alnum (total 10–14 chars, uppercase only).

## AC → coverage map
| AC | Requirement | Cases |
|----|-------------|-------|
| 1 | Rate resolved from country (+ state where applicable) | H1, H3, S2, S3, E6, SEC1 |
| 2 | Inclusive bakes tax in; exclusive adds a line | H1, H2, ⚠️A2, ⚠️A5-base |
| 3 | Valid VAT/GST ID removes tax after format validation | H4, S1, S4, E1, E2, E3, SEC2 |
| 4 | Mixed carts taxed per line by category, then summed | H5, E4, E5, E7, E8 |
| 5 | Breakdown (rate/base/amount per category) shown + stored | H6, E7, ⚠️A5 |

---

## ✅ Happy Path (P1)
| ID | Preconditions | Steps | Expected result | Pass/Fail |
|----|---------------|-------|-----------------|-----------|
| H1 | Region `AT` (20% inclusive) | `calculateTax([{amount:120,category:'standard'}],'AT')` | `breakdown[0]` = `{rate:0.20, base:120, tax:20, category:'standard'}`; `totalTax:20`; `exempt:false` | |
| H2 | Region `US-CA` (7.25% exclusive) | `calculateTax([{amount:100,category:'standard'}],'US-CA')` | `breakdown[0]` = `{rate:0.0725, base:100, tax:7.25, category:'standard'}`; `totalTax:7.25` | |
| H3 | Region `AU` (10% inclusive GST) | `calculateTax([{amount:110,category:'standard'}],'AU')` | `rate:0.10`, `tax:10`, `totalTax:10` (AC1 resolves AU) | |
| H4 | Region `AT`, valid VAT ID `ATU12345678` | `calculateTax([{amount:120,category:'standard'}],'AT','ATU12345678')` | `exempt:true`; `breakdown[0].tax:0`; `totalTax:0` | |
| H5 | Region `AT`, mixed cart standard + zero-rated | `calculateTax([{amount:120,category:'standard'},{amount:50,category:'zero-rated'}],'AT')` | `breakdown[0].tax:20`, `breakdown[1].tax:0`; `totalTax:20` (per-line, summed) | |
| H6 | Region `DE`, any line | Call `calculateTax` and inspect shape | Returns `{exempt, region, breakdown[], totalTax}`; each breakdown row has `rate, base, tax, category` (AC5 data present) | |

## 🚧 Sad Path
| ID | Preconditions | Steps | Expected result | Pass/Fail |
|----|---------------|-------|-----------------|-----------|
| S1 | Region `DE`, invalid VAT ID `DE123` (too short) | `calculateTax([{amount:119,category:'standard'}],'DE','DE123')` | `exempt:false`; tax charged normally → `tax:19`, `totalTax:19` | |
| S2 | Unmapped region `FR` | `calculateTax([{amount:100,category:'standard'}],'FR')` | ⚠️ Stub returns `rate:0, tax:0` — order **silently untaxed**, no error. AC1 expects a resolved rate/error → **flag as defect** | ⚠️ |
| S3 | Region case mismatch `at` (lowercase) | `calculateTax([{amount:120,category:'standard'}],'at')` | ⚠️ `cfg` undefined → `tax:0` (case-sensitive keys). Silent zero-tax → **defect** | ⚠️ |
| S4 | Exclusive region `US-CA` + VAT ID `US123456789` | `calculateTax([{amount:100,category:'standard'}],'US-CA','US123456789')` | `exempt:true` → US sales tax removed. ⚠️ US sales-tax exemption via a "VAT ID" is semantically wrong; stub applies exemption uniformly → **flag** | ⚠️ |

## 🔬 Edge
| ID | Preconditions | Steps | Expected result | Pass/Fail |
|----|---------------|-------|-----------------|-----------|
| E1 | VAT-ID length boundary (min) | Compare `DE12345678` (8 alnum) vs `DE1234567` (7) | `DE12345678` → `exempt:true`; `DE1234567` → `exempt:false` | |
| E2 | VAT-ID length boundary (max) | Compare `DE123456789012` (12) vs `DE1234567890123` (13) | 12 → `exempt:true`; 13 → `exempt:false` | |
| E3 | Lowercase VAT ID `de12345678` | `calculateTax([...],'DE','de12345678')` | `exempt:false` (regex is uppercase-only). ⚠️ Real VAT IDs are case-insensitive → possible false rejection | ⚠️ |
| E4 | Region `GB`, three `$100` gross lines | `calculateTax([100,100,100 as gross standard],'GB')` | Each `tax:16.67`; `totalTax:50.01`. ⚠️ True tax on $300 gross = `50.00` → **$0.01 per-line-rounding drift** | ⚠️ |
| E5 | Empty cart | `calculateTax([],'AT')` | `breakdown:[]`, `totalTax:0`, `exempt:false` (no throw) | |
| E6 | US without state `US` | `calculateTax([{amount:100,category:'standard'}],'US')` | ⚠️ Only `US-CA` modeled → `tax:0`. AC1 "state where applicable" not generalised → **gap** | ⚠️ |
| E7 | Two `standard` lines, region `AT` | `calculateTax([{amount:120,category:'standard'},{amount:60,category:'standard'}],'AT')` | ⚠️ Breakdown has **2 rows**, not aggregated into one `standard` category. AC5 says "amount **per category**" → **flag per-line vs per-category** | ⚠️ |
| E8 | Zero & negative amounts | `taxForLine({amount:0,...},'AT')` and `{amount:-50,...}` | `amount:0`→`tax:0`; `amount:-50`→ negative tax (refund). Confirm no NaN/throw | |

## 🔒 Security
| ID | Preconditions | Steps | Expected result | Pass/Fail |
|----|---------------|-------|-----------------|-----------|
| SEC1 | Prototype-key as region `__proto__` / `constructor` | `calculateTax([{amount:100,category:'standard'}],'constructor')` | ⚠️ `REGIONS['constructor']` resolves to inherited object (truthy), `cfg.inclusive` undefined → `tax = 100 × undefined = NaN` → `totalTax:NaN`. **Defect: unmapped-region guard bypassed via prototype chain**; guard should use `Object.hasOwn`/null-proto map | ⚠️ |
| SEC2 | Crafted VAT IDs | Try `AT12345678; DROP`, `AT 12345678`, ` AT12345678`, `AT1234_678` | All `exempt:false` — only strict `^[A-Z]{2}[0-9A-Z]{8,12}$` passes; no exemption forced via injection/whitespace | |

## ♻️ Regression
| ID | Preconditions | Steps | Expected result | Pass/Fail |
|----|---------------|-------|-----------------|-----------|
| R1 | Stub added by PR #16, not imported | Run existing suites `npm run qa:e2e` / `qa:api` after merge | Add-to-cart, cart totals (`js/cart.js`), checkout, and API contract **unchanged** — the isolated module must not alter any live flow | |

## ⚠️ Ambiguities & not-yet-testable (expected FAIL vs. AC)
| Ref | AC | Issue |
|-----|----|-------|
| ⚠️A2 | 2 | "Tax-inclusive regions **show prices** with tax baked in; exclusive **add tax as a separate line**" — **UI behavior**. Stub returns numbers only, no display → **not testable** until wired into checkout. |
| ⚠️A5 | 5 | "Breakdown **shown in order summary and stored with the order**" — no UI, no order persistence, module unmounted → **not testable / expected FAIL**. |
| ⚠️A5-base | 2/5 | `base` is **inconsistent**: inclusive rows use gross (tax-included) as `base`; exclusive use net. Downstream "base" meaning is ambiguous — pin down whether `base` should always be net. |
| ⚠️A4-cat | 4 | Only `zero-rated` is special-cased; every other category gets the standard rate. **Reduced-rate** categories from AC4 ("different tax categories") are unmodeled. |
