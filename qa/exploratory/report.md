# 🧪 Exploratory Test Report — TechShop (live GitHub Pages build)

**Target:** https://cristianpgit.github.io/techshop-demo/ (frontend-only; no API on Pages)
**Driver:** `agent-browser` · **Date:** 2026-07-01

Grounded in the live build: walked the five surfaces (home, products, cart, checkout, login)
as an anonymous shopper. Frontend is static HTML/JS with cart state in `localStorage`; login
resolves client-side against the demo user.

## ✅ Works as expected
| Area | Check | Result |
|------|-------|--------|
| Home | Hero + 4 featured products render | ✅ |
| Catalog | 8 products; category filter (Audio → 2) | ✅ |
| Cart | Add persists across pages; count badge updates (0→1→2) | ✅ |
| Cart math | Subtotal $449.98, free shipping (>$50) $0.00, total $449.98 | ✅ |
| Checkout | Valid details → "Order Placed Successfully!" (order #11252), cart cleared to 0 | ✅ |
| Login | `demo@techshop.com` / `password123` → "Welcome back" | ✅ |

No console errors observed across the flow.

## ⚠️ Pre-existing quirks (report, don't patch — per `.qa/project.md` §7)
| # | Finding | Detail |
|---|---------|--------|
| 1 | Empty-cart shipping | Empty cart shows **Shipping $9.99 / Total $9.99** — should be $0.00. Known quirk; flag separately, not a new regression. |

## Notes for automation
- Live build is a **subpath** deploy (`…/techshop-demo/`). Playwright's `baseURL` must end
  with a trailing slash and specs must use **relative** gotos (`index.html`, not `/index.html`)
  or the leading slash drops the subpath and hits GitHub's 404. Fixed in `playwright.config.ts`
  (base normalized to trailing slash) and used by `qa/tests/e2e/smoke.spec.ts`.
- Stable hooks confirmed on live: `data-testid` on navbar/hero, `#subtotal`/`#shipping`/`#total`,
  `#cart-count`, `.product-card[data-product-id]`, checkout `#input-*` ids.
