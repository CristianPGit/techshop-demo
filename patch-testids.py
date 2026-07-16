#!/usr/bin/env python3
"""
patch-testids.py — restores the data-testid attributes that js/bugs.js expects
but that the JS renderers and HTML no longer emit.

Run from the repo root:  python3 patch-testids.py
"""
import re, pathlib, sys

root = pathlib.Path('.')
changed = []

# ── 1. js/products.js — product card renderer ────────────────────────
p = root / 'js/products.js'
s = p.read_text()
old_card = s[s.index('function renderProductCard'):]
new_card = '''function renderProductCard(product) {
  const stars = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '');
  const badge = product.badge
    ? `<span class="product-badge" data-testid="product-badge-${product.id}">${product.badge}</span>`
    : '';
  return `
    <div class="product-card" data-testid="product-card-${product.id}" data-product-id="${product.id}">
      ${badge}
      <div class="product-emoji" data-testid="product-emoji-${product.id}">${product.emoji}</div>
      <div class="product-info">
        <div class="product-category" data-testid="product-category-${product.id}">${product.category}</div>
        <h3 class="product-name" data-testid="product-name-${product.id}">${product.name}</h3>
        <p class="product-desc" data-testid="product-desc-${product.id}">${product.description}</p>
        <div class="product-rating" data-testid="product-rating-${product.id}">
          <span class="stars">${stars}</span>
          <span class="review-count">(${product.reviews})</span>
        </div>
        <div class="product-footer">
          <span class="product-price" data-testid="product-price-${product.id}">$${product.price.toFixed(2)}</span>
          <button class="btn btn-primary btn-sm" data-testid="add-to-cart-${product.id}"
            onclick="addToCart('${product.id}')">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
}
'''
p.write_text(s.replace(old_card, new_card))
changed.append('js/products.js  → product-card / product-name / product-price / add-to-cart / badge / category / desc / emoji / rating')

# ── 2. js/cart.js — cart item renderer, empty state, toast ───────────
p = root / 'js/cart.js'
s = p.read_text()

s = s.replace(
    '<div class="cart-item" data-product-id="${product.id}">',
    '<div class="cart-item" data-testid="cart-item-${product.id}" data-product-id="${product.id}">')
s = s.replace(
    '<div class="cart-item-emoji">${product.emoji}</div>',
    '<div class="cart-item-emoji" data-testid="cart-emoji-${product.id}">${product.emoji}</div>')
s = s.replace(
    '<p class="cart-item-price">$${product.price.toFixed(2)} each</p>',
    '<p class="cart-item-price" data-testid="cart-price-${product.id}">$${product.price.toFixed(2)} each</p>')
s = s.replace(
    '<button class="qty-btn" onclick="changeQty(\'${product.id}\', -1)">−</button>',
    '<button class="qty-btn" data-testid="qty-minus-${product.id}" onclick="changeQty(\'${product.id}\', -1)">−</button>')
s = s.replace(
    '<span class="qty-val">${item.qty}</span>',
    '<span class="qty-val" data-testid="qty-val-${product.id}">${item.qty}</span>')
s = s.replace(
    '<button class="qty-btn" onclick="changeQty(\'${product.id}\', 1)">+</button>',
    '<button class="qty-btn" data-testid="qty-plus-${product.id}" onclick="changeQty(\'${product.id}\', 1)">+</button>')
s = s.replace(
    '<div class="cart-item-total">$${(product.price * item.qty).toFixed(2)}</div>',
    '<div class="cart-item-total" data-testid="cart-total-${product.id}">$${(product.price * item.qty).toFixed(2)}</div>')
s = s.replace(
    '<button class="remove-btn" onclick="removeFromCart(\'${product.id}\')">✕</button>',
    '<button class="remove-btn" data-testid="remove-btn-${product.id}" onclick="removeFromCart(\'${product.id}\')">✕</button>')
s = s.replace('<div class="cart-empty">', '<div class="cart-empty" data-testid="cart-empty">')
s = s.replace('<h4>${product.name}</h4>', '<h4 data-testid="cart-name-${product.id}">${product.name}</h4>')

# toast: the 2.1.5 practice element. Gets a testid so the lesson's
# "capture the post-interaction DOM" scenario has something to find.
s = s.replace("  t.className = 'toast';\n", "  t.className = 'toast';\n  t.setAttribute('data-testid', 'toast');\n")
p.write_text(s)
changed.append('js/cart.js      → cart-item / cart-name / qty-minus / qty-val / qty-plus / remove-btn / cart-empty / toast')

# ── 3. HTML — mirror every id="x" that bugs.js queries as data-testid ─
# The port converted data-testid="x" → id="x". Restore alongside.
HTML_IDS = ['cart-count', 'category-filter', 'sort-filter', 'product-grid',
            'featured-grid', 'checkout-form', 'input-name', 'input-email',
            'input-phone', 'input-address', 'input-city', 'input-zip',
            'input-country', 'subtotal', 'shipping', 'total', 'cart-items',
            'order-success']
for f in ['index.html', 'products.html', 'cart.html', 'checkout.html']:
    p = root / f
    s = p.read_text()
    before = s
    for i in HTML_IDS:
        # add data-testid next to id=, only if not already present on that tag
        s = re.sub(r'id="%s"(?![^>]*data-testid)' % re.escape(i),
                   'id="%s" data-testid="%s"' % (i, i), s)
    # elements bugs.js needs that have no id at all
    s = s.replace('<section class="hero">', '<section class="hero" data-testid="hero">')
    s = s.replace('<div class="filter-bar">', '<div class="filter-bar" data-testid="filter-bar">')
    s = s.replace('<div class="cart-summary">', '<div class="cart-summary" data-testid="cart-summary">')
    s = s.replace('<nav class="navbar">', '<nav class="navbar" data-testid="navbar">')
    # checkout submit button — the 2.3.x fixture target
    s = s.replace('<button type="submit" class="btn btn-primary btn-full">Place Order</button>',
                  '<button type="submit" class="btn btn-primary btn-full" data-testid="place-order-btn">Place Order</button>')
    # cart page checkout link
    s = s.replace('class="btn btn-primary btn-full">Proceed to Checkout</a>',
                  'class="btn btn-primary btn-full" data-testid="checkout-btn">Proceed to Checkout</a>')
    if s != before:
        p.write_text(s)
        changed.append(f'{f:15s} → id-mirrored testids + hero / navbar / filter-bar / cart-summary')

print('PATCHED:')
for c in changed:
    print('  ✔', c)
