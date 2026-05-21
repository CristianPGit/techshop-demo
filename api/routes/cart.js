const express = require('express');
const router = express.Router();
const { PRODUCTS, carts } = require('../data');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart — session-based, no auth required. Use X-Session-ID header for isolation between test runs.
 */

function getOrCreateCart(sessionId) {
  if (!carts[sessionId]) {
    carts[sessionId] = { items: [], updatedAt: new Date().toISOString() };
  }
  return carts[sessionId];
}

function computeCart(cart, sessionId) {
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    sessionId,
    items: cart.items.map(item => ({
      ...item,
      subtotal: parseFloat((item.price * item.quantity).toFixed(2)),
    })),
    total: parseFloat(total.toFixed(2)),
    itemCount,
    updatedAt: cart.updatedAt,
  };
}

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the current cart for a session
 *     description: |
 *       Returns the cart associated with the given session ID. Each test run should use a
 *       unique X-Session-ID to avoid data conflicts in parallel testing (Module 5.3).
 *     tags: [Cart]
 *     parameters:
 *       - in: header
 *         name: X-Session-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique session identifier (use UUID for parallel test isolation)
 *         example: test-session-abc123
 *     responses:
 *       200:
 *         description: Current cart state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Missing X-Session-ID header
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Header "X-Session-ID" is required for cart isolation',
    });
  }
  const cart = getOrCreateCart(sessionId);
  res.json(computeCart(cart, sessionId));
});

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add a product to the cart (or increase quantity if already present)
 *     tags: [Cart]
 *     parameters:
 *       - in: header
 *         name: X-Session-ID
 *         required: true
 *         schema:
 *           type: string
 *         example: test-session-abc123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: p001
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 example: 2
 *     responses:
 *       201:
 *         description: Item added or quantity updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Product out of stock
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/items', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Header "X-Session-ID" is required' });
  }

  const { productId, quantity = 1 } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '"productId" is required' });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '"quantity" must be a positive integer' });
  }

  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'NOT_FOUND', message: `Product "${productId}" not found` });
  }
  if (!product.inStock) {
    return res.status(409).json({ error: 'OUT_OF_STOCK', message: `Product "${product.name}" is out of stock` });
  }

  const cart = getOrCreateCart(sessionId);
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, name: product.name, price: product.price, quantity });
  }
  cart.updatedAt = new Date().toISOString();

  res.status(201).json(computeCart(cart, sessionId));
});

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   put:
 *     summary: Update the quantity of a specific cart item
 *     tags: [Cart]
 *     parameters:
 *       - in: header
 *         name: X-Session-ID
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         example: p001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *     responses:
 *       200:
 *         description: Quantity updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not in cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/items/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Header "X-Session-ID" is required' });
  }

  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '"quantity" must be a positive integer' });
  }

  const cart = getOrCreateCart(sessionId);
  const item = cart.items.find(i => i.productId === req.params.productId);
  if (!item) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Product "${req.params.productId}" is not in your cart`,
    });
  }

  item.quantity = quantity;
  cart.updatedAt = new Date().toISOString();
  res.json(computeCart(cart, sessionId));
});

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   delete:
 *     summary: Remove a specific item from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: header
 *         name: X-Session-ID
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         example: p001
 *     responses:
 *       200:
 *         description: Item removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Item not in cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/items/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Header "X-Session-ID" is required' });
  }

  const cart = getOrCreateCart(sessionId);
  const idx = cart.items.findIndex(i => i.productId === req.params.productId);
  if (idx === -1) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Product "${req.params.productId}" is not in your cart`,
    });
  }

  cart.items.splice(idx, 1);
  cart.updatedAt = new Date().toISOString();
  res.json(computeCart(cart, sessionId));
});

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear all items from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: header
 *         name: X-Session-ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cart cleared
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */
router.delete('/', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Header "X-Session-ID" is required' });
  }

  const cart = getOrCreateCart(sessionId);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  res.json(computeCart(cart, sessionId));
});

module.exports = router;
