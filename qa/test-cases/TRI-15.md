# 🧪 QA Test Plan — Multi-currency checkout (TRI-15 / TS-100)

Grounded in the ticket: stub `js/features/ts-100-multi-currency-checkout-demo.js` (PR [#11](https://github.com/CristianPGit/techshop-demo/pull/11), draft, **not imported** anywhere) exposing `SUPPORTED` (32 currencies), `selectCheckoutCurrency`, `convertToBase`, `buildOrderRecord`, `formatReceiptLine` — with `TODO`s for the FX call. ACs = checkout currency dropdown (1, 6), persist + display selection (2), show converted base amount alongside original (3), FX-failure graceful degrade (4), receipt shows both amounts (5). Store **base = USD**. Source: [TRI-15](https://linear.app/tripleten-pandele/issue/TRI-15).

> Stage-2 demo plan (structured-prompt output). The stub is a skeleton, so most assertions are **⚠️ expected to FAIL / not-yet-testable** — that's the point of the contrast. Each case maps back to an AC.

## AC → coverage map
| AC | What it requires | Cases |
|----|------------------|-------|
| 1 | Select currency from dropdown at checkout | H1, H2, S1, S2, SEC1 |
| 2 | Selected currency saved on order + shown on confirmation | H3, H7, S5 |
| 3 | Converted base amount shown alongside original | H4, H5, E1–E5 |
| 4 | FX unavailable → warning + save without conversion | F1, F2, F3 |
| 5 | Receipt (PDF/email) shows both amounts | X1, X2, X3 |
| 6 | Currency is per-order, not per-account | H6, S6 |

## ✅ Happy Path (P1)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| H1 | Supported currency accepted | `selectCheckoutCurrency('EUR')` | Returns `'EUR'`, no throw |
| H2 | Dropdown lists all 32 | Render checkout currency `<select>` from `SUPPORTED` | 32 options; `USD` present; matches AC "32 supported" |
| H3 | Currency persisted on order | `buildOrderRecord({amount:100, currency:'EUR', base})` | `original_currency:'EUR'`, `original_amount:100` |
| H4 | Converted amount alongside original | `convertToBase(100,'EUR','USD')` → `buildOrderRecord` | Record has both `original_amount` **and** `base_amount` (≠ null) ⚠️ |
| H5 | Receipt line shows both | `formatReceiptLine(record)` | `"100 EUR (108.50 USD)"`-shape: original + converted ⚠️ |
| H6 | Per-order scope | Two orders same session, `'EUR'` then `'JPY'` | Each order keeps its own currency; no carry-over |
| H7 | Confirmation displays selection | Place order in `EUR` → view confirmation | Confirmation shows `EUR` + base USD ⚠️ (no UI yet) |

⚠️ **Expected to FAIL on stub:** `convertToBase` always returns `rate:1, source:'live'` (TODO unfilled) → H4/H5 show base amount **equal to** the original number regardless of currency (e.g. `100 EUR (100 USD)`), so real conversion is wrong. H7 has no checkout UI — not yet testable.

## 🚧 Sad Path
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| S1 | Unsupported code | `selectCheckoutCurrency('XYZ')` | Throws `Unsupported currency: XYZ` |
| S2 | Empty / null code | `selectCheckoutCurrency('')`, `(null)` | Throws (not silently accepted) |
| S3 | Case sensitivity | `selectCheckoutCurrency('eur')` | ⚠️ **AMBIGUITY** — stub is case-sensitive → throws. AC silent on normalization; pin behavior |
| S4 | Negative / zero amount | `convertToBase(-5,'EUR','USD')`, `(0,…)` | ⚠️ AMBIGUITY — should reject negative; `0` likely valid |
| S5 | Missing fields to `buildOrderRecord` | `buildOrderRecord({amount:100})` (no `currency`/`base`) | Should error or default safely; stub throws on `base.amount` (undefined) ⚠️ |
| S6 | Account-level override attempted | Set a "preferred currency" on the user, then checkout | Ignored — order uses the per-order selection (AC 6) |

## 🔬 Edge — conversion & rounding (P1; AC 3)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| E1 | Base == selected | `convertToBase(100,'USD','USD')` | Identity: base_amount == 100, rate 1, no FX call needed |
| E2 | Zero-decimal currency | `'JPY'` / `'KRW'` amount `1500` | Rendered with **0** decimals (`1500 JPY`), not `1500.00` ⚠️ |
| E3 | Three-decimal currency | `'BHD'`/`'KWD'`/`'OMR'`/`'JOD'`/`'TND'` `12.345` | **3** decimal places preserved, not truncated to 2 ⚠️ |
| E4 | Rounding direction | Amount × rate = `…985` (half-up vs banker's) | ⚠️ AMBIGUITY — AC doesn't specify rounding mode/precision; pin it. Assert `base_amount` to a defined precision |
| E5 | Large amount precision | `999999.99 EUR` × rate | No float drift / scientific notation in base_amount |

⚠️ Zero-/three-decimal handling (E2/E3) is the classic gap; stub does no per-currency precision → **expected fail**.

## ⚡ FX-API failure (P1; AC 4)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| F1 | FX unavailable → graceful | Force `convertToBase` failure path | Returns `{amount:null, converted:false, warning:'FX unavailable'}` |
| F2 | Order still saved | `buildOrderRecord` with the failed `base` | Order saved; `rate_source:'unavailable'`, `base_amount:null` — **not** rejected |
| F3 | Warning shown to shopper | Checkout with FX down | Visible warning at checkout/confirmation |

⚠️ **Expected to FAIL:** the FX call is a `TODO` — `convertToBase` never fails, so AC 4's whole branch is unexercised. F1–F3 are the headline gap the unstructured prompt misses.

## 📄 Export / receipt (AC 5)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| X1 | Receipt shows both amounts | `formatReceiptLine` on a converted order | `"<amt> <cur> (<base_amt> <base_cur>)"` |
| X2 | Receipt under FX failure | `formatReceiptLine` on `rate_source:'unavailable'` | `"<amt> <cur> (conversion unavailable)"` — handled in stub ✅ |
| X3 | PDF/email parity | Generate PDF **and** email receipt | Both contain original + converted; identical figures ⚠️ (no exporter yet — not testable) |

## 🔒 Security / input
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| SEC1 | Injection via currency field | `selectCheckoutCurrency("USD'; DROP…")` | Rejected by allowlist (`SUPPORTED`) — no passthrough |

## ♻️ Regression
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| R1 | Existing checkout unaffected | Place a normal USD order (no currency picker) via current `checkout.html` / `POST /api/orders` | Unchanged — stub is not imported, base flow intact |
| R2 | Cart totals intact | Add-to-cart → cart totals (`js/cart.js`, 2-dp USD) | No regression to TRI-5 rounding behavior |

## ⚠️ Ambiguities to resolve with the ticket owner
1. **Rounding precision/mode** for `base_amount` (AC 3) — half-up? banker's? fixed 2-dp even for JPY/BHD? (E2–E4)
2. **Per-currency minor units** — zero-decimal (JPY/KRW) and three-decimal (BHD/JOD/KWD/OMR/TND) display.
3. **Code normalization** — is `'eur'` accepted or rejected? (S3)
4. **Negative/zero amounts** — reject or allow? (S4)
5. **"alongside" (AC 3) UI placement** and **receipt PDF *and* email** (AC 5) — neither has an implementation to test yet.
