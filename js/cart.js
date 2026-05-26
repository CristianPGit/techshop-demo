function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart(cart);
  updateCartCount();
  showToast('Added to cart ✓');
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

function changeQty(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.qty = Math.max(1, item.qty + delta);
    saveCart(cart);
    renderCart();
    updateCartCount();
  }
}

function updateCartCount() {
  const total = getCart().reduce((sum, i) => sum + i.qty, 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = total;
}

function getCartTotals() {
  const subtotal = getCart().reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
  const shipping = subtotal > 50 ? 0 : 9.99;
  const round2 = v => Math.round(v * 100) / 100;
  return {
    subtotal: round2(subtotal),
    shipping: round2(shipping),
    total: round2(subtotal + shipping),
  };
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-items');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <a href="products.html" class="btn btn-primary">Shop Now</a>
      </div>`;
    const btn = document.getElementById('checkout-btn');
    if (btn) btn.style.pointerEvents = 'none';
  } else {
    container.innerHTML = cart.map(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) return '';
      return `
        <div class="cart-item" data-product-id="${product.id}">
          <div class="cart-item-emoji">${product.emoji}</div>
          <div class="cart-item-info">
            <h4>${product.name}</h4>
            <p class="cart-item-price">$${product.price.toFixed(2)} each</p>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="changeQty('${product.id}', -1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${product.id}', 1)">+</button>
          </div>
          <div class="cart-item-total">$${(product.price * item.qty).toFixed(2)}</div>
          <button class="remove-btn" onclick="removeFromCart('${product.id}')">✕</button>
        </div>`;
    }).join('');
  }

  const { subtotal, shipping, total } = getCartTotals();
  const fmt = v => '$' + v.toFixed(2);
  ['subtotal', 'shipping', 'total'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'subtotal' ? fmt(subtotal) : id === 'shipping' ? fmt(shipping) : fmt(total);
  });
}

function renderCheckoutSummary() {
  const cart = getCart();
  const container = document.getElementById('order-items');
  if (!container) return;
  container.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    return p ? `<div class="summary-row"><span>${p.name} x${item.qty}</span><span>$${(p.price * item.qty).toFixed(2)}</span></div>` : '';
  }).join('');
  const { subtotal, shipping, total } = getCartTotals();
  const fmt = v => '$' + v.toFixed(2);
  ['subtotal', 'shipping', 'total'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'subtotal' ? fmt(subtotal) : id === 'shipping' ? fmt(shipping) : fmt(total);
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
}
