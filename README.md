# ⚡ TechShop

A demo e-commerce store for tech gadgets.

**Live site:** https://cristianpgit.github.io/techshop-demo/

---

## Quick Start

```bash
git clone https://github.com/CristianPGit/techshop-demo.git
cd techshop-demo
npm install

npm run start:all   # site on :3000 + API on :3001
```

Or run them separately:

```bash
npm start           # static site only → http://localhost:3000
npm run start:api   # REST API only    → http://localhost:3001
```

---

## Pages

| Page | URL |
|------|-----|
| Home | `http://localhost:3000` |
| Products | `http://localhost:3000/products.html` |
| Cart | `http://localhost:3000/cart.html` |
| Checkout | `http://localhost:3000/checkout.html` |
| Login | `http://localhost:3000/login.html` |

**Demo credentials:** `demo@techshop.com` / `password123`

---

## REST API

Base URL: `http://localhost:3001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | List products (filter: `category`, `sort`, `inStock`) |
| GET | `/api/products/search?q=` | Search products (optional `delay` param in ms) |
| GET | `/api/products/:id` | Single product |
| POST | `/api/auth/login` | Login → bearer token |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/cart` | Get cart (requires `X-Session-ID` header) |
| POST | `/api/cart/items` | Add item |
| PUT | `/api/cart/items/:productId` | Update quantity |
| DELETE | `/api/cart/items/:productId` | Remove item |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/orders` | Place order |
| GET | `/api/orders/:id` | Get order |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/docs.json` | OpenAPI spec |

---

## 🐛 Bug Injection Panel

Every page has a floating **🐛** button (bottom-left). Click it to toggle bugs on and off without touching code — bugs persist via `localStorage`.

| Bug | Effect |
|-----|--------|
| Change primary color → red | Visual change |
| Break hero background | Visual change |
| Hide navbar logo | Missing element |
| Wrong product prices (×10) | Wrong content |
| Duplicate first product card | DOM change |
| Clear all product names | Missing content |
| Rename add-to-cart buttons | DOM attribute change |
| Remove cart count element | Missing element |
| Break category filter | Broken interaction |
| Hide checkout button | Missing element |

---

## 🧪 CI Failure Playground

Two intentionally-failing scripts to practice reading CI logs. Both exit with code `1` and ship with the bugs baked into their fixture data — **don't fix the scripts**, the failures are the lesson.

```bash
npm run ci:clean    # one focused error, no noise
npm run ci:noisy    # realistic CI output — find the failure in the chatter
```

### Variant A — `ci:clean` (ideal log)

A minimal product-catalog validator. Single assertion, single error line, clear exit code. Use this when introducing students to log parsing.

**Planted bug:** product `p007` ("Laptop Stand Aluminium") has a **negative price** (`-39.99`) in `scripts/ci-check-clean.js`. The `assertPositivePrice` check trips on it.

**Expected output (abridged):**

```
▶ Running product catalog validation...

✗ FAIL  Invalid price for product p007 ("Laptop Stand Aluminium"): got -39.99, expected a positive number
        at ci-check-clean.js:product catalog validation
        code: INVALID_PRICE
```

**Teaching points:**
- Exit code conveys pass/fail; output conveys *why*.
- A single failing assertion gives you the product id, the bad value, and the expected shape in one line.
- This is the log you *wish* you had — most real pipelines look like Variant B.

### Variant B — `ci:noisy` (realistic log)

Simulates a full pipeline (lint → unit → integration → catalog-check → build) with deprecation warnings, retried HTTP calls, skipped tests, multi-line stack traces, and a pipeline summary. The actual failure is in the **catalog-check** stage, partway through ~70 lines of output.

**Planted bug:** product `p004` ("Smart Watch Ultra") has `reservedStock: 23` but `stock: 18` — an inventory desync — in `scripts/ci-check-noisy.js`. The check is `reservedStock <= stock`.

**What students need to learn to ignore:**

| Noise category | Example |
|---|---|
| Dependency deprecation warnings | `npm warn deprecated har-validator@5.1.5` |
| Node experimental/deprecation flags | `(node:48127) [DEP0040] DeprecationWarning: punycode` |
| Lint warnings that don't fail the build | `eslint ... 6 warnings` |
| Skipped tests | `↷ skipped — filterProducts not yet implemented` |
| Retried network calls | `▲ retry 1/3: GET /api/health → ECONNREFUSED` |
| Suppressed expected failures | `▲ GET /api/products/p999 returned 404 — expected, suppressing` |
| Inline TODOs from earlier authors | `! token TTL not asserted (TODO: 2026-Q3)` |
| Multi-frame stack traces | `at validateInventory (scripts/ci-check-noisy.js:84:11)` … |

**Teaching points:**
- Scan the **summary block** first (`lint ✓ / unit ✓ / catalog-check ✗`) — it points you at the failing stage before you read a single warning.
- `✗` ≠ `▲` ≠ `!`. The job exit code is driven by `✗` only.
- Stack traces from a thrown error in one product can repeat — count *distinct* failures, not lines.
- A failing test with `assert(reservedStock <= stock)` is more useful than `assert(p.valid === true)`. The teaching value of the noisy variant is recognizing that the message `INVENTORY_DESYNC` + a product id is the **only** payload that matters in 70 lines of output.

### Suggested student exercise

1. Run `npm run ci:noisy` and pipe to a file: `npm run ci:noisy > ci.log 2>&1; echo $?`
2. Without scrolling, use `grep`, `tail`, or your AI assistant to identify:
   - The failing stage
   - The product id that triggered the failure
   - The assertion that fired
3. Compare against the clean log from `npm run ci:clean` — what information was preserved? What was added?
4. Bonus: ask Claude to summarize `ci.log` and grade its summary against the planted bug.
