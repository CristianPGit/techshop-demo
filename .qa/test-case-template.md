# Test Case Template 

Use this template for **every** test-case generation in this repo. Fill each section in order.
Sections [1]/[3] have demo-shop defaults pre-filled — keep them unless the ticket overrides.
Read `.qa/preferences.md` for output styling (header, emojis, tables) and apply it on top of this.

---

## [1] CONTEXT — project, user role, base currency, environment
- **Project:** 
- **You are:** a QA engineer testing as an **anonymous shopper** (no auth required for browse/cart/checkout). Switch role only if the ticket says so.
- **Base currency:** **USD ($)**, money rendered with `.toFixed(2)` (exactly 2 decimals).
- **Environment:** local only — frontend `npx serve . -p 3000` (`:3000`), API `node api/server.js` (`:3001`). No staging/prod. Safe to mutate `localStorage`; no real payments.
- **Source of truth files:** product data `js/products.js`, cart logic `js/cart.js`, API routes `api/routes/*.js`.

## [2] TICKET — paste the AC verbatim. Do NOT paraphrase.
> _Paste the Linear/GitHub AC here word-for-word. If pulled from Linear MCP or `gh pr view`, quote the `Acceptance criteria` block exactly. Cite the issue ID + the file(s) under test._

## [3] CONSTRAINTS — out-of-scope items, known limitations
- Out of scope: anything not named in the AC. Do not test unrelated pages/flows.
- **Don't fix bugs while testing** — this repo has an intentional bug-injection panel (🐛) for training; report, don't patch.
- Don't reduce the generous timeouts; the API/serve can be slow on cold start.
- Pre-existing quirks (e.g. empty-cart still shows $9.99 shipping) are **not** regressions of a new ticket — flag separately, don't fold into the plan.
- _Add ticket-specific exclusions here._

## [4] OUTPUT FORMAT — one row per case
Group **Happy → Sad → Edge** (+ Regression / Security / API when relevant), **P1 first**.

| ID | Preconditions | Steps | Expected result | Pass/Fail |
|----|---------------|-------|-----------------|-----------|
| H1 | _state before_ | _numbered actions_ | _observable, asserted outcome_ | _(filled at run time)_ |

- **ID** prefixes: `H`=happy, `S`=sad, `E`=edge, `R`=regression, `SEC`=security, `API`=api-contract.
- **Expected result** must be observable & asserted (value, DOM text, HTTP status/body) — never "works fine".
- Leave **Pass/Fail** blank until executed live (browser via chrome-devtools/agent-browser, API via curl/Playwright).

## [5] COVERAGE REQUIREMENT
- **At least one positive + one negative case per AC item.** Map every case back to an AC line.
- **Include API failure scenarios** when the flow touches `:3001`: non-2xx (400/404/422/500), timeout/network error, malformed/empty body, missing/invalid fields. Assert status code **and** body.
- **Flag ambiguities explicitly** — if an AC term is underspecified (rounding direction, boundary `>` vs `>=`, currency edge, empty/null state), add an `⚠️ AMBIGUITY` note and a case that pins down the assumed behavior.
- Always add a **regression case** for the nearest critical flow the change could break (add-to-cart, cart totals, checkout).

---

### Worked reference — TRI-5 (cart rounding)
A filled example lives in the TRI-5 plan posted to Linear/PR #1: CONTEXT=USD 2-dp, TICKET=verbatim ACs,
CONSTRAINTS=no add-to-cart regression, OUTPUT=H/S/E/R tables, COVERAGE=positive H2 + negative S1/S2
+ ⚠️ flagged empty-cart shipping ambiguity. Mirror that shape.


