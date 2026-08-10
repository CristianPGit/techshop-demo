# 🧪 QA Test Plan — Improve product filtering logic (TRI-7)

Grounded in the ticket: bug in `js/products.js` — new `filterProducts({category, minPrice, maxPrice})` returns `matchCategory || (matchMin && matchMax)` (OR, so it never narrows — absent dimension is vacuously `true`) and uses strict `>`/`<` (exclusive bounds); ACs = category + price combine (AND) + all products still render with no filter. Source: PR [#3](https://github.com/CristianPGit/techshop-demo/pull/3).

**Data (`PRODUCTS`, 8):** audio p001/149.99 p006/79.99 · computing p002/89.99 p007/39.99 · accessories p003/49.99 p005/59.99 · mobile p004/299.99 p008/119.99

## ✅ Happy Path (P1)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| H1 | No filter renders all | `filterProducts()` | All **8** products |
| H2 | Render full grid | `renderFilteredProducts({})` into `#product-grid` | 8 `.product-card` nodes |
| H3 | Category alone narrows | `{category:'audio'}` | Only **p001, p006** ⚠️ |
| H4 | Price alone narrows | `{minPrice:50, maxPrice:100}` | Only **p002, p005, p006** ⚠️ |
| H5 | Category + price combine | `{category:'audio', minPrice:100, maxPrice:200}` | Only **p001** ⚠️ |
| H6 | Combo drops same-cat out-of-range | (as H5) | **p006** excluded ⚠️ |
| H7 | Combo drops in-range wrong-cat | (as H5) | **p008** excluded ⚠️ |

⚠️ Expected to FAIL on PR #3: H3, H4 return all 8; H5 returns union `{p001, p006, p008}` not `{p001}`. Core AC defect.

## 🚧 Sad Path
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| S1 | Unknown category | `{category:'gaming'}` | Empty (current: all 8) |
| S2 | Empty-string category | `{category:''}` | Treated as no-category → all 8 |
| S3 | Inverted range | `{minPrice:300, maxPrice:50}` | Empty |
| S4 | Over-filtered | `{minPrice:1000}` | Empty |
| S5 | Missing grid element | `renderFilteredProducts({})`, no `#product-grid` | Returns early, no throw |

## 🔬 Edge
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| E1 | Inclusive lower bound | `{minPrice:49.99}` | **p003** included (strict `>` excludes ⚠️) |
| E2 | Inclusive upper bound | `{maxPrice:299.99}` | **p004** included (strict `<` excludes ⚠️) |
| E3 | Single-price window | `{minPrice:89.99, maxPrice:89.99}` | p002 if inclusive — document semantics |
| E4 | `minPrice:0` honored | `{minPrice:0}` | Real bound, not falsy-skipped |
| E5 | Category + price boundary | `{category:'mobile', minPrice:200}` | Only **p004**; p008 excluded |
| E6 | Case sensitivity | `{category:'Audio'}` | No matches — confirm intended |

## ♻️ Regression
| ID | Title | Expected |
|----|-------|----------|
| R1 | `renderProductCard` unchanged | Markup, `$NNN.NN` price, badge identical |
| R2 | Initial load renders all 8 | Existing catalog path unaffected |

## 🔒 Non-functional
| ID | Title | Expected |
|----|-------|----------|
| N1 | Pure function | `filterProducts` does not mutate `PRODUCTS` |
| N2 | innerHTML hygiene | If filters ever take user input, no injection into grid `innerHTML` |

---
**Fix:** `||` → `&&` (intersection) and `>`/`<` → `>=`/`<=` (inclusive bounds).
