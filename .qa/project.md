# QA Project Context — TechShop (demo-shop)

Durable context for QA Architect. Future `test-cases` / `automate-tests` runs read this first so they
don't re-analyze the repo from scratch. Pair it with `.qa/preferences.md` (output style) and
`.qa/test-case-template.md` (test-case structure).

> Last reconciled: 2026-06-29 via `qa-architect` setup. Refresh when the architecture changes
> meaningfully (new app surface, framework swap, new auth).

---

## 1. What this is

**TechShop** — a single-app demo e-commerce store (tech gadgets) that doubles as **training material
for an "AI for QA" course (Modules 2–5)**.

- **Primary day-to-day use:** course demos / teaching. QA output should be **didactic and
  self-explanatory** — a student reading the plan or test should understand *why* each case exists,
  not just *what* it asserts. (It is also a genuine working suite; keep it green where the app is
  correct.)
- **Repo:** `CristianPGit/techshop-demo` · Live (read-only) build: https://cristianpgit.github.io/techshop-demo/
- **Local path:** `/Users/cristianpandele/Documents/learn.dev/demo-shop/`

---

## 2. Architecture

Single app, **no monorepo**, **no framework**. Two processes:

### Frontend — static, vanilla HTML/CSS/JS (port 3000)
- Pages: `index.html`, `products.html`, `cart.html`, `checkout.html`, `login.html`
- Served by `serve` (`npm start`).
- Logic: `js/products.js` (catalog/render/filter), `js/cart.js` (cart math), `js/bugs.js` (bug panel).
- **Cart state lives in `localStorage`** — no backend needed for the browse→cart→checkout flow.
- Money is rendered with `.toFixed(2)` (USD, exactly 2 decimals).

### REST API — Express + Swagger (port 3001)
- `api/server.js` (Express, CORS, `express.json`, Swagger UI at `/api/docs`, raw spec at `/api/docs.json`).
- **In-memory store** — `api/data.js` holds products, carts, orders, sessions, `DEMO_USERS`.
  **State resets on every server restart** — this is the cleanup mechanism (see §6).
- Routes in `api/routes/`: `products.js`, `cart.js`, `auth.js`, `orders.js`.
- Endpoints (see README + Swagger for full contract):
  - `GET /api/health`
  - `GET /api/products` (filter `category`, `sort`, `inStock`) · `GET /api/products/:id`
  - `GET /api/products/search?q=&delay=N` — **`delay` injects latency in ms** (Module 4.3.2 percentiles)
  - `POST /api/auth/login` → bearer token · `GET /api/auth/me` · `POST /api/auth/logout`
  - Cart (`GET/POST/PUT/DELETE`) — **requires `X-Session-ID` header**, isolates parallel test data (Module 5.3)
  - `POST /api/orders` · `GET /api/orders/:id` · `PATCH /api/orders/:id/status`

---

## 3. Auth, roles & test accounts

- **Anonymous shopper** — default. Browse, cart, and checkout need **no auth** on the static site.
- **Demo user** — `demo@techshop.com` / `password123` (`DEMO_USERS` in `api/data.js`). Used for authed
  API calls (`POST /api/auth/login` → bearer token, `GET /api/auth/me`).
- **No other roles to model.** The `PATCH /api/orders/:id/status` endpoint is open in this demo — treat it
  as part of the order flow, not as a privileged admin surface. If a future ticket adds real RBAC, revisit.

---

## 4. Environments

- **Local only** — there is **no staging/prod**. Safe to mutate `localStorage` and the in-memory API.
  No real payments, no real PII.
- Frontend `http://localhost:3000` · API `http://localhost:3001`.
- Live GitHub Pages build is **read-only** (static frontend only — no API). Point browser tests at it via
  `WEB_URL=https://cristianpgit.github.io/techshop-demo npx playwright test --project=chromium`.
- Playwright auto-starts both local servers (`webServer` block) and reuses them if already running.

---

## 5. Critical flows (P1 backbone)

All four surfaces are first-class P1 for this course. A regression in any breaks a lesson.

| # | Flow | Surface | Suite |
|---|------|---------|-------|
| F1 | Browse catalog → filter/sort → add to cart → cart totals correct → checkout | UI E2E | `qa/tests/e2e/` |
| F2 | Login (demo user) → token → authed call | UI E2E + API | `e2e/login.spec.ts`, `api/auth.api.spec.ts` |
| F3 | API contract: products/search, cart (X-Session-ID), orders, auth — status **and** body | API | `qa/tests/api/` |
| F4 | Bug-injection repro — toggle 🐛 panel, assert the injected defect | Bug repro | `qa/tests/bugs/` |
| F5 | CI log reading — `ci:clean` / `ci:noisy` intentional failures | CI logs | `scripts/ci-check-*.js` |

---

## 6. Test data & cleanup strategy

- **Frontend:** cart is `localStorage`. Clear it between tests (`localStorage.clear()` / fresh context) to
  avoid bleed. Playwright's per-test context already isolates this.
- **API:** isolate parallel work with a **unique `X-Session-ID` per test** — carts are keyed by it, so tests
  don't collide. (Module 5.3 teaches exactly this.)
- **Hard reset:** restart `npm run start:api` — the in-memory store wipes back to seed data. No DB, no
  teardown scripts needed.
- Leave the app **source untouched** — see §7.

---

## 7. Risk areas & house rules (read before testing)

- 🐛 **Do NOT fix bugs.** This repo ships an intentional **Bug Injection Panel** (`js/bugs.js`, 10 toggleable
  bugs) and intentionally-failing CI scripts. They are the lesson. **Report, repro, assert — never patch.**
- **Keep `data-testid` / `id` / `data-product-id` hooks intact** on interactive elements; tests and the bug
  panel depend on them.
- ⚠️ **Selector reality:** `qa/tests/e2e/_selectors.ts` deliberately uses the *existing* stable hooks
  (navbar/hero `data-testid`, form `id`s, `.product-card[data-product-id]`, semantic role/text). The product
  cards are **not** yet instrumented with `product-name-*` / `product-price-*` / `add-to-cart-*` testids, so
  **only ~3 of the 10 bug-panel bugs currently light up** in `bug-injection.spec.ts`. The other 7 are dormant
  until the cards are instrumented. Don't assume all 10 are wired.
- **Don't reduce the generous timeouts** (30s test / 7s expect) — `serve` + API can be slow on cold start.
- **Pre-existing quirks ≠ new regressions.** e.g. empty cart still shows `$9.99` shipping. Flag such things
  separately; don't fold them into a new ticket's plan.
- **Expected failures:** when the code under test already contains the bug (e.g. `TRI-7` filter OR-logic),
  mark the failing cases ⚠️ explicitly — the plan should predict the failure, not hide it.

---

## 8. Quickstart

```bash
npm install && npx playwright install   # first time only

# Run the app (both servers)
npm run start:all          # static :3000 + API :3001  (or: npm start / npm run start:api)

# Run the suites (Playwright auto-starts/reuses the servers)
npm run qa                 # all projects
npm run qa:e2e             # chromium UI flows   → qa/tests/e2e
npm run qa:api             # API contract        → qa/tests/api
npm run qa:bugs            # bug-injection repro → qa/tests/bugs
npm run qa:ui              # Playwright interactive UI
npm run qa:report          # open HTML report (qa/report)

# Point browser tests at the live Pages build (no local server, frontend only)
WEB_URL=https://cristianpgit.github.io/techshop-demo npx playwright test --project=chromium

# CI failure playground (intentionally exit 1 — do NOT fix)
npm run ci:clean           # one focused error
npm run ci:noisy           # realistic noisy log — find the failure
```

- **Browser driver:** `agent-browser` skill is installed (`.agents/skills/`, pinned in `skills-lock.json`) —
  preferred for exploratory/automate-tests work. Playwright is the framework for committed specs.
- **Tracker:** Linear-style issue IDs (`TRI-5`, `TRI-7`) + GitHub PRs on `CristianPGit/techshop-demo`. When a
  ticket/PR is given, quote its acceptance criteria **verbatim** into the test plan (per the template).

---

## 9. Where things live

| Need | Path |
|------|------|
| QA calibration (output style) | `.qa/preferences.md` |
| Test-case template | `.qa/test-case-template.md` |
| This context | `.qa/project.md` |
| E2E specs + selectors | `qa/tests/e2e/` (`_selectors.ts`) |
| API specs | `qa/tests/api/` |
| Bug-injection specs | `qa/tests/bugs/bug-injection.spec.ts` |
| Worked test-case examples | `qa/test-cases/` (`TRI-7.md`) |
| Playwright config | `playwright.config.ts` (projects: `chromium`, `api`, `bugs`) |
| App source (do not patch) | `js/`, `api/`, `*.html` |
| Bug panel | `js/bugs.js` |
| CI playground | `scripts/ci-check-{clean,noisy}.js` |
