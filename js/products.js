const PRODUCTS = [
  {
    id: 'p001',
    name: 'Pro Wireless Headphones',
    category: 'audio',
    price: 149.99,
    badge: 'Bestseller',
    emoji: '🎧',
    description: 'Studio-quality sound with 40h battery life and active noise cancellation.',
    rating: 4.8,
    reviews: 312,
  },
  {
    id: 'p002',
    name: 'Mechanical Keyboard',
    category: 'computing',
    price: 89.99,
    badge: 'New',
    emoji: '⌨️',
    description: 'Compact TKL layout with RGB backlight and tactile blue switches.',
    rating: 4.6,
    reviews: 187,
  },
  {
    id: 'p003',
    name: 'Portable Power Bank',
    category: 'accessories',
    price: 49.99,
    badge: null,
    emoji: '🔋',
    description: '20,000 mAh capacity with 65W fast charging and dual USB-C ports.',
    rating: 4.7,
    reviews: 534,
  },
  {
    id: 'p004',
    name: 'Smart Watch Ultra',
    category: 'mobile',
    price: 299.99,
    badge: 'Hot',
    emoji: '⌚',
    description: 'Health tracking, GPS, AMOLED display. 7-day battery.',
    rating: 4.9,
    reviews: 892,
  },
  {
    id: 'p005',
    name: 'USB-C Hub 8-in-1',
    category: 'accessories',
    price: 59.99,
    badge: null,
    emoji: '🔌',
    description: 'HDMI 4K, 3x USB-A, SD card reader, Ethernet, 100W PD.',
    rating: 4.5,
    reviews: 245,
  },
  {
    id: 'p006',
    name: 'Wireless Earbuds Pro',
    category: 'audio',
    price: 79.99,
    badge: 'Sale',
    emoji: '🎵',
    description: 'True wireless, 8h playback, IPX5 water resistant, touch controls.',
    rating: 4.4,
    reviews: 423,
  },
  {
    id: 'p007',
    name: 'Laptop Stand Aluminium',
    category: 'computing',
    price: 39.99,
    badge: null,
    emoji: '💻',
    description: 'Foldable, adjustable height, compatible with 10–17" laptops.',
    rating: 4.6,
    reviews: 178,
  },
  {
    id: 'p008',
    name: 'Phone Gimbal Stabilizer',
    category: 'mobile',
    price: 119.99,
    badge: 'New',
    emoji: '📱',
    description: '3-axis stabilizer with AI tracking and 12h battery.',
    rating: 4.7,
    reviews: 96,
  },
];

function renderProductCard(product) {
  const stars = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '');
  const badge = product.badge
    ? `<span class="product-badge">${product.badge}</span>`
    : '';
  return `
    <div class="product-card" data-product-id="${product.id}">
      ${badge}
      <div class="product-emoji">${product.emoji}</div>
      <div class="product-info">
        <div class="product-category">${product.category}</div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="review-count">(${product.reviews})</span>
        </div>
        <div class="product-footer">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
}
