# ⚡ TechShop — AI for QA Demo Store

A purposely-built demo e-commerce site for the **AI for QA Course** — Modules 2 & 3.
Every page has stable `data-testid` attributes, intentional bugs you can toggle on/off, and a full Playwright + GitHub Actions pipeline.

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/techshop-demo.git
cd techshop-demo
npm install
npx playwright install chromium
npm start          # opens http://localhost:3000
```

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
npm run test:smoke             # @smoke tests only (fast check)
npm run test:update-snapshots  # create/update visual baselines
npm run test:report            # open last HTML report
```

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

**Independent Practice**
> Build a Claude + Playwright agent that reads a GitHub Actions failure log, auto-fixes the broken test up to 2 times, and creates a Jira/Linear bug report if both attempts fail.

The scaffold is already in `scripts/autofix-agent.js` and `scripts/create-bug-report.js`.

---

## Module 3 — Visual Validation

### Chapter 3.1 — Visual Testing Fundamentals

**Lesson 3.1.1 — Why UI is 80% of product value**
The site has CSS variables (`--primary`, `--bg`, `--accent`) intentionally easy to change.
Toggle "Change primary color → red" in the Bug Panel to create an instant regression.

**Lesson 3.1.2 — Heavy libraries vs. lightweight solutions**
`tests/module3.spec.js` uses only Playwright's built-in `toHaveScreenshot()` — no Percy, no Applitools.
Compare the 5-line snapshot assertion with what an Applitools integration would look like.

### Chapter 3.2 — Playwright Integration

**Lesson 3.2.1 — Setting up snapshots**
First run creates baselines (stored in `tests/module3.spec.js-snapshots/`):
```bash
npm run test:update-snapshots
```

**Lesson 3.2.2 — Managing baselines safely**
Baselines are committed to git. On CI, `push` to `main` updates them; `pull_request` compares against them.
Demo: show `git diff` after a CSS change to see which snapshots change.

### Chapter 3.3 — AI-Assisted Diff Analysis

**Lesson 3.3.1 — Figma vs. live website**
Open the bug panel and toggle a visual bug. Take a screenshot.
Ask Claude: *"Compare this screenshot to the Figma spec. What changed?"*

**Lesson 3.3.2 — Prompting vision models to classify diffs**
`scripts/ai-visual-diff.js` sends baseline + actual to Claude Vision and returns:
```json
{ "classification": "color_change", "isBug": true, "severity": "major", "recommendation": "fix_immediately" }
```
Run manually:
```bash
npm run visual-diff   # output: test-results/ai-visual-report.md
```

**Independent Practice**
> Build a visual validation pipeline that captures screenshots, compares them against baselines, generates a structured diff report, and runs via GitHub Actions on regression and smoke triggers.

The scaffold is in `scripts/ai-visual-diff.js` and `.github/workflows/playwright.yml`.

---

## GitHub Actions

### Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| Tests (Module 2 + 3) | `playwright.yml` | push / PR / manual |
| Deploy to GitHub Pages | `deploy-pages.yml` | push to main |

### Enable GitHub Pages
1. Go to **Settings → Pages**
2. Source: **GitHub Actions**
3. Push to `main` → site deploys automatically at `https://YOUR_USERNAME.github.io/techshop-demo/`

### Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for auto-fix + visual diff |
| `LINEAR_API_KEY` | Optional | Creates Linear issue on persistent failure |
| `JIRA_API_TOKEN` | Optional | Creates Jira ticket on persistent failure |
| `JIRA_BASE_URL` | Optional | e.g. `https://yourteam.atlassian.net` |
| `JIRA_EMAIL` | Optional | Your Jira email |
| `JIRA_PROJECT_KEY` | Optional | e.g. `QA` |

### CI Flow

**Module 2:**
```
push/PR → run module2.spec.js → fail? → autofix-agent (up to 2×) → re-run → still fail? → create Jira/Linear ticket
```

**Module 3:**
```
push to main → update visual baselines
PR → compare against baselines → fail? → Claude classifies diffs → ai-visual-report.md in artifacts
```

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
│   └── bugs.js             # Bug Injection Panel
├── tests/
│   ├── module2.spec.js     # Module 2: Locator & auto-fixing tests
│   └── module3.spec.js     # Module 3: Visual validation tests
├── scripts/
│   ├── autofix-agent.js    # Claude auto-fix agent (Module 2.3)
│   ├── ai-visual-diff.js   # Claude visual diff analysis (Module 3.3)
│   └── create-bug-report.js # Jira/Linear fallback (Module 2.3.3)
├── .github/workflows/
│   ├── playwright.yml      # Test CI pipeline
│   └── deploy-pages.yml    # GitHub Pages deployment
└── playwright.config.js    # Playwright config (webServer + reporters)
```

---

## Notes

- All interactive elements have `data-testid` attributes — use these as the gold standard in lessons
- CSS variables in `:root` make visual regression demos trivially easy to create
- Checkout and login forms are demo-only — no real payment or auth
- `localStorage` stores cart and session — clears on browser private mode or explicit reset
- The `webServer` in `playwright.config.js` starts `serve` automatically during test runs
