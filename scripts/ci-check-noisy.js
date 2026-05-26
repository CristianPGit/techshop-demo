#!/usr/bin/env node
/*
 * CI Check — NOISY FAILURE VARIANT
 *
 * Used in the AI for QA course to practice reading REAL CI logs:
 * deprecation warnings, dependency chatter, retried steps, swallowed
 * stack traces, and the actual failure buried mid-output.
 *
 * Expected outcome: exit code 1. The real failure is an inventory
 * mismatch for product p004, but students must filter past the noise.
 */

const PRODUCTS = [
  { id: 'p001', name: 'Pro Wireless Headphones', price: 149.99, stock: 45,  reservedStock: 45 },
  { id: 'p002', name: 'Mechanical Keyboard',     price: 89.99,  stock: 22,  reservedStock: 22 },
  { id: 'p003', name: 'Portable Power Bank',     price: 49.99,  stock: 60,  reservedStock: 60 },
  { id: 'p004', name: 'Smart Watch Ultra',       price: 299.99, stock: 18,  reservedStock: 23 }, // <-- BUG
  { id: 'p005', name: 'USB-C Hub 8-in-1',        price: 59.99,  stock: 33,  reservedStock: 33 },
  { id: 'p006', name: 'Wireless Earbuds Pro',    price: 79.99,  stock: 41,  reservedStock: 41 },
  { id: 'p007', name: 'Laptop Stand Aluminium',  price: 39.99,  stock: 15,  reservedStock: 15 },
  { id: 'p008', name: 'Phone Gimbal Stabilizer', price: 119.99, stock: 9,   reservedStock: 9  },
];

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn(...a);
const err = (...a) => console.error(...a);

log('npm warn deprecated har-validator@5.1.5: this library is no longer supported');
log('npm warn deprecated request@2.88.2: request has been deprecated, see https://github.com/request/request/issues/3142');
log('npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.');
log('npm warn deprecated @npmcli/move-file@1.1.2: This functionality has been moved to @npmcli/fs');
log('');
log('> techshop-demo@1.0.0 ci:noisy');
log('> node scripts/ci-check-noisy.js');
log('');
log('(node:48127) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.');
log('(Use `node --trace-deprecation ...` to show where the warning was created)');
log('(node:48127) ExperimentalWarning: Importing JSON modules is an experimental feature.');
log('');
log('▶ pipeline: lint  → unit  → integration  → catalog-check  → build');
log('');
log('───────────────  lint  ───────────────');
log('eslint . --ext .js,.html');
log('  /css/style.css: skipping (not a JS file)');
log('  /js/cart.js:    13 lines, 0 errors, 2 warnings');
log('    warning  Unexpected console statement                 no-console');
log('    warning  \'PRODUCTS\' is not defined                     no-undef');
log('  /js/products.js: 116 lines, 0 errors, 4 warnings');
log('    warning  Mixed spaces and tabs                         no-mixed-spaces-and-tabs');
log('    warning  \'addToCart\' is defined but never used         no-unused-vars');
log('✓ lint passed (6 warnings)');
log('');
log('───────────────  unit  ───────────────');
log('cart.spec.js');
log('  ✓ getCart returns [] when empty                          (3ms)');
log('  ✓ addToCart appends new item                             (1ms)');
log('  ✓ addToCart increments existing item                     (1ms)');
log('  ✓ removeFromCart filters by id                           (1ms)');
log('  ✓ getCartTotals computes subtotal                        (2ms)');
log('  ✓ getCartTotals computes shipping                        (1ms)');
log('  ✓ getCartTotals returns 0 shipping above $50             (1ms)');
log('products.spec.js');
log('  ✓ renderProductCard renders a div                        (1ms)');
log('  ✓ PRODUCTS has 8 items                                   (1ms)');
log('  ✓ all product ids are unique                             (2ms)');
log('  ↷ skipped — filterProducts not yet implemented           (0ms)');
log('✓ 10 passed, 1 skipped');
log('');
log('───────────────  integration  ───────────────');
warn('▲ retry 1/3: GET http://localhost:3001/api/health → ECONNREFUSED');
warn('▲ retry 2/3: GET http://localhost:3001/api/health → ECONNREFUSED');
log('✓ GET /api/health                                          → 200 (412ms)');
log('✓ GET /api/products                                        → 200 (38ms)');
log('✓ GET /api/products/p001                                   → 200 (11ms)');
warn('▲ GET /api/products/p999 returned 404 — expected, suppressing');
log('✓ POST /api/auth/login (demo@techshop.com)                 → 200 (94ms)');
warn('  ! token TTL not asserted (TODO: 2026-Q3)');
log('✓ POST /api/cart/items                                     → 201 (22ms)');
log('✓ DELETE /api/cart                                         → 204 (8ms)');
log('✓ integration passed (7 requests, 2 warnings)');
log('');
log('───────────────  catalog-check  ───────────────');
log('Loading PRODUCTS snapshot...');
log('  found 8 products');
log('  validating: price > 0, stock >= 0, reservedStock <= stock');

let firstError = null;
for (const p of PRODUCTS) {
  if (p.reservedStock > p.stock) {
    if (!firstError) {
      firstError = {
        id: p.id,
        name: p.name,
        stock: p.stock,
        reservedStock: p.reservedStock,
      };
    }
    err(`  ✗ ${p.id}: reservedStock (${p.reservedStock}) exceeds stock (${p.stock}) — INVENTORY_DESYNC`);
    err('      at validateInventory (scripts/ci-check-noisy.js:84:11)');
    err('      at Array.forEach (<anonymous>)');
    err('      at runCatalogCheck (scripts/ci-check-noisy.js:79:14)');
    err('      at Object.<anonymous> (scripts/ci-check-noisy.js:142:1)');
  } else {
    log(`  ✓ ${p.id}: stock=${p.stock}, reservedStock=${p.reservedStock}`);
  }
}

log('');
log('───────────────  build  ───────────────');
log('rollup -c rollup.config.js');
log('  created dist/bundle.js in 1.2s');
log('  gzip: 14.3 kB');
log('✓ build passed');
log('');
log('───────────────  summary  ───────────────');
log('  lint            ✓');
log('  unit            ✓');
log('  integration     ✓');
log('  catalog-check   ✗  1 failure');
log('  build           ✓');
log('');

if (firstError) {
  err(`error: catalog-check failed — product ${firstError.id} (${firstError.name})`);
  err(`       reservedStock=${firstError.reservedStock}, stock=${firstError.stock}`);
  err(`       see INVENTORY_DESYNC above`);
  err('');
  err('Exit code: 1');
  process.exit(1);
}

log('All checks passed.');
