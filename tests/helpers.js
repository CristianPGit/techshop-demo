// tests/helpers.js — drive the Bug Injection Panel from tests.
//
// The panel (js/bugs.js) persists active bugs in localStorage under
// 'techshop-bugs'. Injecting before navigation makes a "broken app"
// state deterministic and revertible — no hand-edited fixtures.
//
// Bug ids: bug-primary-color, bug-hero-gradient, bug-hide-logo,
//          bug-wrong-prices, bug-duplicate-card, bug-empty-names,
//          bug-rename-add-to-cart, bug-remove-cart-count,
//          bug-break-filter, bug-hide-checkout-btn

async function injectBugs(page, ids) {
  await page.addInitScript((bugIds) => {
    localStorage.setItem('techshop-bugs', JSON.stringify(bugIds));
  }, ids);
}

async function clearBugs(page) {
  await page.addInitScript(() => localStorage.removeItem('techshop-bugs'));
}

async function clearCart(page) {
  // Init scripts re-run on EVERY navigation. Guard with sessionStorage
  // (persists across same-tab navigations) so we only clear the cart at the
  // start of the test — not mid-flow, e.g. products.html → cart.html.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__cart-cleared')) {
      localStorage.removeItem('cart');
      sessionStorage.setItem('__cart-cleared', '1');
    }
  });
}

module.exports = { injectBugs, clearBugs, clearCart };
