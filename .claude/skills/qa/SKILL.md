---
name: qa
description: >-
  Run automated QA for the TechShop demo shop — Playwright E2E browser flows,
  REST API contract checks, and bug-injection verification against the local
  dev servers (frontend :3000, API :3001). Use when asked to "run QA", "test the
  app", "check the flows", verify a change end-to-end, or reproduce/verify the
  bug-injection panel. Generated as the Claude Code equivalent of Factory's
  /install-qa, tailored to this repo.
---

# TechShop Automated QA

This skill drives the project's Playwright suite. It covers three layers:

| Layer | Where | What it checks |
|-------|-------|----------------|
| **E2E browser** | `qa/tests/e2e/` | Home + catalog, filter/sort, add-to-cart, cart totals & persistence, checkout, login |
| **API contract** | `qa/tests/api/` | `products`, `cart` (session-isolated), `auth` (token lifecycle), `orders`, `health` |
| **Bug-injection** | `qa/tests/bugs/` | Proves the suite *catches* defects toggled by the 🐛 panel |

Config: `playwright.config.ts`. Servers start automatically via `webServer`
(reused if already up): static frontend on **:3000** (`npm start`) and the
Express API on **:3001** (`npm run start:api`).

## First-time setup

If `node_modules/@playwright` is missing, install once:

```bash
npm install
npx playwright install chromium
```

## Running

```bash
npm run qa            # everything (api + chromium + bugs)
npm run qa:e2e        # browser flows only
npm run qa:api        # API contract only
npm run qa:bugs       # bug-injection verification only
npm run qa:ui         # interactive Playwright UI mode
npm run qa:report     # open the HTML report from the last run
```

Run a single file or test:

```bash
npx playwright test qa/tests/e2e/cart.spec.ts
npx playwright test -g "out-of-stock"        # filter by title
npx playwright test --project=chromium --headed
```

Target the **live** GitHub Pages build instead of local (frontend only — the
API/cart/order suites won't apply there):

```bash
WEB_URL=https://cristianpgit.github.io/techshop-demo npx playwright test --project=chromium
```

## How to run this skill

When invoked:

1. Ensure deps are installed (see setup above). If `npx playwright` is absent,
   run the install step first.
2. Decide scope from the request — default to `npm run qa` (all layers). For a
   targeted change, run only the relevant project/spec.
3. Run the command, then **report results plainly**: pass/fail counts, and for
   any failure quote the spec name + the assertion diff. Don't claim green
   unless the run actually passed.
4. On failure, open `qa/report/` or rerun the single failing test `--headed` /
   with `--trace on` to diagnose before proposing a fix.

## Selector strategy (app left untouched)

The app source is **not modified** by this suite. Selectors rely on hooks that
already exist:

- `data-testid` in the navbar/hero (`logo`, `nav-*`, `hero-title`, `hero-cta`)
  and the bug panel (`bug-panel-toggle`, `bug-toggle-*`, `bug-reset`).
- Element `id`s: `#cart-count`, `#category-filter`, `#sort-filter`,
  `#product-grid`, `#featured-grid`, `#checkout-btn`, the `#input-*` checkout
  fields, and the `#login-*` fields.
- Stable CSS / data attributes: `.product-card[data-product-id="p001"]`,
  `.product-name`, `.product-price`, `.cart-item`, and role/text selectors.

Reference data lives in `qa/tests/e2e/_selectors.ts`.

## Bug-injection panel

`js/bugs.js` renders a 🐛 panel and persists active bugs in
`localStorage['techshop-bugs']`, re-applying them on each page load. The bug
suite seeds that key before navigation to verify detection.

⚠️ **Instrumentation gap:** only the bugs whose targets exist in the current
markup actually fire — `bug-primary-color` (flips `--primary`) and
`bug-hide-logo` (hides `[data-testid="logo"]`). The other 8 panel bugs target
testids the product cards/forms don't have yet (`product-name-*`,
`product-price-*`, `add-to-cart-*`, `[data-testid="hero"]`, `product-grid`,
`category-filter`, `cart-count`, `checkout-btn`). The last test in
`bug-injection.spec.ts` pins this gap. To enable the dormant bugs, add those
`data-testid`s to `js/products.js` (`renderProductCard`) and the cart/checkout
markup, then extend the bug suite — that becomes a natural Module 2/3 exercise.

## Key facts for writing new tests

- 8 products (`p001`–`p008`); `p008` (Phone Gimbal Stabilizer) is **out of stock**.
- Categories: audio (p001, p006), computing (p002, p007), mobile (p004, p008),
  accessories (p003, p005).
- Free shipping over $50, else a flat **$9.99** fee.
- Demo logins: `demo@techshop.com` / `password123` and `qa@techshop.com` / `qa1234`.
- API cart/orders require an `X-Session-ID` header — use a fresh UUID per test
  for isolation (Module 5.3 pattern). The API store is in-memory and resets on
  server restart.
- OpenAPI spec is served at `http://localhost:3001/api/docs.json`
  (Swagger UI at `/api/docs`).
