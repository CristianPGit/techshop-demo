// design-assets/build-v1.js — opening visual for lesson 3.1.1
//
// Generates three artifacts:
//   v1-working.png   the checkout page as it should look
//   v1-broken.png    the same page with a promo banner OCCLUDING Place Order
//   v1-composed.png  both renders side by side, both badged "CI: all green"
//
// The lesson's argument depends on the banner *covering* the button rather than
// removing it: toBeVisible() only checks the element is rendered and has a
// non-empty bounding box, so it passes happily on a button no user can click.
// Test 2 asserts exactly that, after injection, as the acceptance criterion for
// the asset. Never swap the banner for visibility:hidden / display:none / the
// bug panel's hide-checkout-btn — those make the assertion FAIL and invert the
// point of the lesson.
//
// No app file is modified; the banner is injected at runtime via page.evaluate.
//
// Run:  npx playwright test design-assets/build-v1.js --config=design-assets/playwright.config.js

const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Port 3100, not 3000 — another project squats :3000 on this machine.
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = __dirname;

const WORKING_PNG = path.join(OUT, 'v1-working.png');
const BROKEN_PNG = path.join(OUT, 'v1-broken.png');
const COMPOSED_PNG = path.join(OUT, 'v1-composed.png');

// Bump to 45 if any sliver of the Place Order button survives under the banner.
const BANNER_PADDING = '34px 20px';

test.use({ viewport: { width: 1280, height: 800 } });
test.describe.configure({ mode: 'serial' });

/**
 * Load checkout with the cart pinned to a known-empty state, then park the
 * Place Order button just above the bottom edge of the viewport.
 *
 * Two things make this necessary. At 1280x800 the button starts below the fold,
 * so an unscrolled render never shows it. And scrolling all the way to the
 * document bottom is wrong in the other direction — max scroll puts the button
 * at its *highest* position (y≈629), well clear of a bottom-anchored banner.
 * Landing it near the bottom edge is what puts it in the banner's path.
 *
 * Both tests call this identically, so the two panels line up pixel for pixel.
 */
const BUTTON_BOTTOM_MARGIN = 10;

async function openPinnedCheckout(page) {
  await page.goto(`${BASE}/checkout.html`);
  await page.evaluate(() => localStorage.removeItem('cart'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Drop the QA bug-injection widget from both renders. It is course chrome,
  // not part of the checkout, and it was the only thing differing between the
  // panels for a reason unrelated to the banner (visible bottom-left on the
  // left, swallowed by the banner on the right).
  //
  // display:none is fine *here* — this is the training widget, never the
  // assertion target. Do not reach for it on place-order-btn: hiding that
  // button makes toBeVisible() fail and destroys the point of the lesson.
  await page.evaluate(() => {
    for (const sel of ['[data-testid="bug-panel-toggle"]', '[data-testid="bug-panel"]']) {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    }
  });

  await page.evaluate((margin) => {
    const btn = document.querySelector('[data-testid="place-order-btn"]');
    const rect = btn.getBoundingClientRect();
    window.scrollBy(0, rect.bottom - (window.innerHeight - margin));
  }, BUTTON_BOTTOM_MARGIN);
  await page.waitForTimeout(150);
}

/**
 * Measure how much of the button the banner actually covers, so the acceptance
 * claim is evidence rather than assumption.
 */
async function occlusionReport(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('[data-testid="place-order-btn"]');
    const banner = document.getElementById('promo-banner');
    const b = btn.getBoundingClientRect();
    const n = banner.getBoundingClientRect();
    const probe = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return !!el && (el === banner || banner.contains(el));
    };
    return {
      button: { top: Math.round(b.top), bottom: Math.round(b.bottom) },
      bannerTop: Math.round(n.top),
      centerCovered: probe(b.left + b.width / 2, b.top + b.height / 2),
      topEdgeCovered: probe(b.left + b.width / 2, b.top + 2),
      fullyCovered: n.top <= b.top && n.bottom >= b.bottom,
    };
  });
}

test('1 — working render', async ({ page }) => {
  await openPinnedCheckout(page);
  await page.screenshot({ path: WORKING_PNG });
});

test('2 — broken render: banner occludes the button, toBeVisible still passes', async ({ page }) => {
  await openPinnedCheckout(page);

  await page.evaluate((padding) => {
    const banner = document.createElement('div');
    banner.id = 'promo-banner';
    Object.assign(banner.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '9999',
      padding,
      textAlign: 'center',
      background: 'linear-gradient(90deg, #6c6cff, #5252e0)',
      color: '#fff',
      fontSize: '17px',
      fontWeight: '600',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    });
    banner.textContent = '🎉 SUMMER SALE — 20% off everything this week!';
    document.body.appendChild(banner);
  }, BANNER_PADDING);

  // The acceptance criterion for this asset: the assertion PASSES while the
  // button sits underneath an opaque banner.
  await expect(page.getByTestId('place-order-btn')).toBeVisible();

  const occ = await occlusionReport(page);
  console.log(
    '\n  ✅ ACCEPTANCE: expect(getByTestId(\'place-order-btn\')).toBeVisible() PASSED\n' +
      '     while the button was occluded by the promo banner.\n' +
      '     Rendered + non-empty box === "visible" to Playwright. Nobody can click it.\n' +
      `     button y: ${occ.button.top}..${occ.button.bottom}   banner top y: ${occ.bannerTop}\n` +
      `     centre point covered: ${occ.centerCovered}   top edge covered: ${occ.topEdgeCovered}\n` +
      `     button fully behind banner: ${occ.fullyCovered}\n`
  );
  if (!occ.fullyCovered) {
    console.log(
      `  ⚠️  Part of the button still shows above the banner — raise BANNER_PADDING.\n`
    );
  }

  await page.screenshot({ path: BROKEN_PNG });
});

test('3 — compose the final asset', async ({ page }) => {
  const b64 = (p) => fs.readFileSync(p).toString('base64');
  const working = b64(WORKING_PNG);
  const broken = b64(BROKEN_PNG);

  const badge = '<div class="badge">CI: ✅ all green</div>';

  const html = `
<!doctype html>
<html>
<head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0f0f13;
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .row { display: flex; gap: 32px; align-items: flex-start; }
  .panel { flex: 1; position: relative; }
  .panel img {
    display: block;
    width: 100%;
    border-radius: 10px;
    border: 1px solid #2a2a38;
  }
  .badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    color: #4ade80;
    background: rgba(15,15,19,0.92);
    border: 1px solid #2a2a38;
    padding: 7px 13px;
    border-radius: 7px;
  }
  .assertion {
    margin-top: 16px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13.5px;
    line-height: 1.4;
    color: #888;
  }
  .assertion .pass { color: #4ade80; }
  .spacer { visibility: hidden; }
  .caption {
    margin-top: 34px;
    text-align: center;
    color: #e8e8f0;
    font-size: 17px;
    line-height: 1.65;
  }
</style>
</head>
<body>
  <div class="row">
    <div class="panel">
      <img src="data:image/png;base64,${working}" />
      ${badge}
      <div class="assertion spacer">await expect(page.getByTestId('place-order-btn')).toBeVisible() <span class="pass">&rarr; passes</span></div>
    </div>
    <div class="panel">
      <img src="data:image/png;base64,${broken}" />
      ${badge}
      <div class="assertion">await expect(page.getByTestId('place-order-btn')).toBeVisible() <span class="pass">&rarr; passes</span></div>
    </div>
  </div>
  <div class="caption">
    Same code path, same test run, same green.<br />
    One of these pages sells; the other loses every customer who reaches it.
  </div>
</body>
</html>`;

  await page.setViewportSize({ width: 1720, height: 1200 });
  await page.setContent(html);
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
  );
  await page.waitForTimeout(300);

  await page.locator('body').screenshot({ path: COMPOSED_PNG });
});
