# ⚡ TechShop — AI for QA Demo Store

A purposely-built demo e-commerce site for the **AI for QA Course** — Modules 2–5.
Every page has stable `data-testid` attributes, intentional bugs you can toggle on/off, a REST API with Swagger docs, and a full Playwright + GitHub Actions pipeline.

**Live site:** https://cristianpgit.github.io/techshop-demo/

---

## Quick Start

```bash
git clone https://github.com/CristianPGit/techshop-demo.git
cd techshop-demo
npm install
npx playwright install chromium

npm run start:all   # static site on :3000 + REST API on :3001
```

| URL | What's there |
|-----|-------------|
| http://localhost:3000 | TechShop site |
| http://localhost:3001/api/docs | Swagger UI — interactive API docs |
| http://localhost:3001/api/docs.json | Raw OpenAPI spec (for Claude DTO generation) |

---

## Pages

| Page | URL | What to test |
|------|-----|-------------|
| Home | `/` | Hero, featured grid, promo banner |
| Products | `/products.html` | Filter, sort, add-to-cart |
| Cart | `/cart.html` | Qty controls, totals, checkout link |
| Checkout | `/checkout.html` | Form validation, order success |
| Login | `/login.html` | Auth flow, field errors, password toggle |

**Demo credentials:** `demo@techshop.com` / `password123`

---

## REST API

The API runs on port 3001 and is fully documented via Swagger. Start it with `npm run start:api` (or `npm run start:all` to run both together).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | List products — filter by `category`, `sort`, `inStock`; paginate with `limit`/`offset` |
| GET | `/api/products/search?q=&delay=` | Full-text search with injectable latency (Module 4.3.2) |
| GET | `/api/products/:id` | Single product |
| POST | `/api/auth/login` | Login → returns bearer token |
| GET | `/api/auth/me` | Current user (requires `Authorization: Bearer <token>`) |
| POST | `/api/auth/logout` | Invalidate token |
| GET | `/api/cart` | Get cart (requires `X-Session-ID` header) |
| POST | `/api/cart/items` | Add item to cart |
| PUT | `/api/cart/items/:productId` | Update item quantity |
| DELETE | `/api/cart/items/:productId` | Remove item |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/orders` | Place order from cart |
| GET | `/api/orders/:id` | Get order by ID |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/docs.json` | Raw OpenAPI 3.0 spec |

### Try it with curl

**List all audio products sorted by price:**
```bash
curl "http://localhost:3001/api/products?category=audio&sort=price-asc"
```
```json
{
  "data": [
    { "id": "p006", "name": "Wireless Earbuds Pro", "price": 79.99, "category": "audio", ... },
    { "id": "p001", "name": "Pro Wireless Headphones", "price": 149.99, "category": "audio", ... }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Get a single product:**
```bash
curl "http://localhost:3001/api/products/p001"
```
```json
{
  "id": "p001",
  "name": "Pro Wireless Headphones",
  "category": "audio",
  "price": 149.99,
  "rating": 4.8,
  "reviews": 312,
  "inStock": true,
  "stock": 45
}
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@techshop.com","password":"password123"}'
```
```json
{
  "token": "90581626da8c46d75239...",
  "user": { "email": "demo@techshop.com", "name": "Demo User" },
  "expiresIn": 3600
}
```

**Add to cart → place order (full flow):**
```bash
SESSION="my-test-session-001"

# Add item
curl -X POST http://localhost:3001/api/cart/items \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"productId":"p001","quantity":2}'

# Place order
curl -X POST http://localhost:3001/api/orders \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Jane Smith","email":"jane@example.com"},"paymentMethod":"credit_card"}'
```
```json
{
  "id": "ORD-1716000000000-A1B2",
  "status": "confirmed",
  "total": 299.98,
  "items": [{ "productId": "p001", "name": "Pro Wireless Headphones", "quantity": 2, "subtotal": 299.98 }],
  "estimatedDelivery": "2026-05-26"
}
```

**Search with latency injection (Module 4.3.2):**
```bash
# Simulate a 500ms slow endpoint
curl "http://localhost:3001/api/products/search?q=wireless&delay=500"
```
```json
{
  "data": [...],
  "query": "wireless",
  "total": 2,
  "latencyMs": 502
}
```

### Key API design choices for QA training

- **`X-Session-ID` header on cart/orders** — each test run uses a unique session ID so parallel tests never share state (Module 5.3)
- **`?delay=` on search** — inject latency up to 2000ms to simulate slow backends for p95/p99 exercises (Module 4.3.2)
- **Structured errors** — every error returns `{ "error": "ERROR_CODE", "message": "..." }` so Claude can parse failure logs consistently (Module 4.1/4.2)
- **`/api/docs.json`** — raw OpenAPI spec, paste into Claude to auto-generate TypeScript DTOs (Module 5.2.1)

---

## 🐛 Bug Injection Panel

Every page has a floating **🐛** button in the bottom-left corner.
Click it to open the Bug Injection Panel — toggle bugs on/off without touching code.

| Bug | What breaks |
|-----|-------------|
| Change primary color → red | Visual regression (Module 3) |
| Break hero background | Visual regression (Module 3) |
| Hide navbar logo | Missing element test |
| Wrong product prices (×10) | Content validation test |
| Duplicate first product card | Count assertion test |
| Clear all product names | Text assertion test |
| Rename add-to-cart test IDs | Broken locator (Module 2) |
| Remove cart count element | Missing element test |
| Break category filter | Functional regression |
| Hide checkout button | Critical flow test |

Bugs persist across page reloads via `localStorage`. Click **Reset All Bugs** to restore.

---

## Running Tests

```bash
npm test                       # all tests
npm run test:module2           # Module 2 — locators & auto-fixing
npm run test:module3           # Module 3 — visual validation
npm run test:module4           # Module 4 — CI logs & performance
npm run test:module5           # Module 5 — Swagger DTOs & test data
npm run test:api               # module4 + module5 together
npm run test:smoke             # @smoke tests only (fast check)
npm run test:update-snapshots  # create/update visual baselines
npm run test:report            # open last HTML report
```

> **Note:** module4 and module5 tests require the API server running.
> Use `npm run start:all` in one terminal before running tests in another,
> or set `API_URL=http://localhost:3001` if using a different port.

---

## Module 2 — Auto-fixing vs. Self-healing

### Chapter 2.1 — Smart Locator Generation

**Lesson 2.1.1 — Claude for complex DOM structures**
Open `tests/module2.spec.js` → tests `2.1.7`–`2.1.10`.
The login page has a password toggle, field-level validation, error banner, and success state — a realistic complex DOM for Claude to navigate.

**Lesson 2.1.2 — Prompting for resilient locators**
See test `2.1.4` vs `2.2.2`: the fragile CSS-class locator vs the stable `data-testid` locator.
Demo: ask Claude to rewrite `2.1.4` using semantic attributes.

### Chapter 2.2 — The Self-Healing Debate

**Lesson 2.2.1 — Why self-healing hides real bugs**
Test `2.2.1` uses `.product-card:nth(0)` — it always finds *something* even if products are reordered.
Toggle the "Duplicate first product card" bug → the nth-child locator passes on the wrong element.

**Lesson 2.2.2 — Risks and bad practices**
Compare `2.2.1` (flaky) vs `2.2.2` (stable `data-testid`). Show how self-healing would silently accept the wrong card.

### Chapter 2.3 — Controlled Auto-fixing

**Lesson 2.3.1 — Auto-fixing concept**
Test `2.3.4` is intentionally broken (`add-to-cart-btn` does not exist).
Run `npm run test:module2` → it fails.
Run `npm run autofix` → Claude reads the JSON report, patches the test, re-runs.

**Lesson 2.3.2 — Configuring limits**
The agent reads `MAX_FIX_ATTEMPTS` from env (default: 2).
```bash
MAX_FIX_ATTEMPTS=1 npm run autofix   # only one attempt allowed
```

**Lesson 2.3.3 — Fallback: auto-create Jira/Linear bug**
If both fix attempts fail, `scripts/create-bug-report.js` runs.
Set `LINEAR_API_KEY` or `JIRA_API_TOKEN + JIRA_BASE_URL` in your env (or GitHub Secrets).

---

## Module 3 — Visual Validation

### Chapter 3.1 — Visual Testing Fundamentals

**Lesson 3.1.1 — Why UI is 80% of product value**
The site has CSS variables (`--primary`, `--bg`, `--accent`) intentionally easy to change.
Toggle "Change primary color → red" in the Bug Panel to create an instant regression.

**Lesson 3.1.2 — Heavy libraries vs. lightweight solutions**
`tests/module3.spec.js` uses only Playwright's built-in `toHaveScreenshot()` — no Percy, no Applitools.

### Chapter 3.2 — Playwright Integration

**Lesson 3.2.1 — Setting up snapshots**
```bash
npm run test:update-snapshots
```

**Lesson 3.2.2 — Managing baselines safely**
Baselines are committed to git. On CI, `push` to `main` updates them; `pull_request` compares against them.

### Chapter 3.3 — AI-Assisted Diff Analysis

**Lesson 3.3.2 — Prompting vision models to classify diffs**
`scripts/ai-visual-diff.js` sends baseline + actual to Claude Vision and returns:
```json
{ "classification": "color_change", "isBug": true, "severity": "major", "recommendation": "fix_immediately" }
```
```bash
npm run visual-diff   # output: test-results/ai-visual-report.md
```

---

## Module 4 — CI Error Logs & Performance

### Chapter 4.1 — Navigating CI Error Logs

**Lesson 4.1.1 — Baseline vs. red run**
Test `4.1.1` is the green health check. Tests `4.1.2`–`4.1.4` produce structured failures.
Capture the CI log output and feed it to Claude to practice log triage.

**Lesson 4.1.2 — Feeding red logs to LLMs**
Every API error follows the `{ "error": "CODE", "message": "..." }` pattern.
Example prompt: *"Here is my Playwright failure log. What is the root cause and how do I fix it?"*

### Chapter 4.2 — Auto-generating Bug Repro Steps

**Lesson 4.2.1 — Out-of-stock repro**
`tests/module4.spec.js` test `4.2.1` hits `POST /api/cart/items` with product `p008` (out of stock).
The 409 response body is the repro evidence — students prompt Claude to turn it into Jira steps.

**Lesson 4.2.2 — Missing field repro**
Test `4.2.2` places an order without a `customer` field → 400 with a field-level message.

### Chapter 4.3 — Performance Statistics

**Lesson 4.3.1 — Collecting samples**
Test `4.3.1` runs 10 search requests, collects `latencyMs` from each response, and logs mean/median/p95.
Exercise: extend it with Claude to add a histogram or percentile table.

**Lesson 4.3.2 — P95 assertions**
Test `4.3.2` asserts p95 < 500ms. Run with `delay=600` to see it fail:
```bash
# In the test file, change delay=0 to delay=600 — watch the p95 breach in CI
```

---

## Module 5 — Jira, Page Objects & Test Data

### Chapter 5.1 — API Contracts as Test Source

**Lesson 5.1.1 — Generating test steps from AC**
Test `5.1.1` walks the full happy path (login → browse → add to cart → checkout) derived directly from the Swagger contract.
Exercise: take an AC tag from a Jira story, paste the relevant Swagger paths into Claude, get the test steps back.

**Lesson 5.1.2 — Generating Page Objects from API structure**
Test `5.1.2` shows how API field names (`id`, `name`, `price`) map to `data-testid` selectors.
Exercise: paste the Product schema from `/api/docs.json` into Claude → ask it to generate a `ProductPage` class.

### Chapter 5.2 — Swagger → DTOs

**Lesson 5.2.1 — Auto-generating TypeScript interfaces**
1. Fetch the spec: `curl http://localhost:3001/api/docs.json`
2. Paste it into Claude with the prompt: *"Generate TypeScript interfaces for all schemas in this OpenAPI spec."*
3. You get `Product`, `Cart`, `CartItem`, `Order`, `Customer` interfaces — validated by tests `5.2.1`–`5.2.3`.

### Chapter 5.3 — Parallel Test Data Safety

**Lesson 5.3.1 — Why parallel tests conflict**
Each test uses `uniqueSession()` which generates a `crypto.randomBytes` session ID.
Test `5.3.1` runs two sessions simultaneously to prove they never share cart state.

**Lesson 5.3.2 — Safe incrementation**
Test `5.3.2` shows how `PUT /api/cart/items/:id` updates quantity without race conditions when sessions are isolated.

---

## GitHub Actions

### Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| Tests (Modules 2–5) | `playwright.yml` | push / PR / manual |
| Deploy to GitHub Pages | `deploy-pages.yml` | push to main |

### CI Jobs

| Job | Tests | What it demos |
|-----|-------|--------------|
| `smoke` | `@smoke` across all modules | Fast gate on every push |
| `module2-tests` | `module2.spec.js` | Auto-fix loop + Jira fallback |
| `module3-visual` | `module3.spec.js` | Snapshot regression + Claude Vision diff |
| `module4-api` | `module4.spec.js` | API error logs + performance |
| `module5-api` | `module5.spec.js` | Swagger DTOs + parallel isolation |

### CI Flow

**Modules 2:**
```
push/PR → module2 tests → fail? → autofix-agent (up to 2×) → re-run → still fail? → Jira/Linear ticket
```

**Module 3:**
```
push to main → update visual baselines
PR → compare against baselines → fail? → Claude Vision diff → ai-visual-report.md in artifacts
```

**Modules 4 & 5:**
```
push/PR → start API server → run tests → upload results as artifacts
```

### Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for auto-fix + visual diff |
| `LINEAR_API_KEY` | Optional | Creates Linear issue on persistent failure |
| `JIRA_API_TOKEN` | Optional | Creates Jira ticket on persistent failure |
| `JIRA_BASE_URL` | Optional | e.g. `https://yourteam.atlassian.net` |
| `JIRA_EMAIL` | Optional | Your Jira email |
| `JIRA_PROJECT_KEY` | Optional | e.g. `QA` |

---

## Project Structure

```
techshop-demo/
├── index.html              # Home page
├── products.html           # Products + filter/sort
├── cart.html               # Cart + totals
├── checkout.html           # Checkout form + order success
├── login.html              # Login with validation + demo creds
├── css/style.css           # All styles (CSS variables for visual regression)
├── js/
│   ├── products.js         # Product data + card renderer
│   ├── cart.js             # Cart logic (localStorage)
│   └── bugs.js             # Bug Injection Panel (10 toggleable bugs)
├── api/
│   ├── server.js           # Express + Swagger setup (port 3001)
│   ├── data.js             # In-memory store: products, carts, orders, sessions
│   └── routes/
│       ├── products.js     # GET /api/products, /api/products/search, /api/products/:id
│       ├── cart.js         # Cart CRUD (X-Session-ID isolated)
│       ├── auth.js         # POST /api/auth/login, /logout, GET /me
│       └── orders.js       # POST /api/orders, GET /api/orders/:id, PATCH status
├── tests/
│   ├── module2.spec.js     # Module 2: locator & auto-fixing tests
│   ├── module3.spec.js     # Module 3: visual validation tests
│   ├── module4.spec.js     # Module 4: CI error logs & performance tests
│   └── module5.spec.js     # Module 5: Swagger DTOs & parallel test data
├── scripts/
│   ├── autofix-agent.js    # Claude auto-fix agent (Module 2.3)
│   ├── ai-visual-diff.js   # Claude visual diff analysis (Module 3.3)
│   └── create-bug-report.js # Jira/Linear fallback (Module 2.3.3)
├── .github/workflows/
│   ├── playwright.yml      # Test CI pipeline (all 5 jobs)
│   └── deploy-pages.yml    # GitHub Pages deployment
└── playwright.config.js    # Playwright config (webServer + reporters)
```

---

## Notes

- All interactive elements have `data-testid` attributes — use these as the gold standard in lessons
- CSS variables in `:root` make visual regression demos trivially easy to create
- The API store is **in-memory** — it resets on server restart, which is intentional for demo purposes
- Checkout and login forms on the static site are demo-only — the real auth/order logic lives in the API
- `localStorage` stores cart and session on the static site — clears on browser private mode or explicit reset
