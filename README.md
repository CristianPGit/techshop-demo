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
