const express = require('express');
const router = express.Router();
const { carts, orders, sessions } = require('../data');
const { extractToken } = require('./auth');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order placement and retrieval
 */

function generateOrderId() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place an order from the current cart
 *     description: |
 *       Converts the cart into an order. Requires a non-empty cart (X-Session-ID).
 *       Customer details are passed in the request body.
 *     tags: [Orders]
 *     parameters:
 *       - in: header
 *         name: X-Session-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID used for the cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *             properties:
 *               customer:
 *                 $ref: '#/components/schemas/Customer'
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, paypal, bank_transfer]
 *                 default: credit_card
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error or empty cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Header "X-Session-ID" is required' });
  }

  const cart = carts[sessionId];
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Cart is empty — add items before placing an order' });
  }

  const { customer, paymentMethod = 'credit_card' } = req.body;
  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: '"customer.name" and "customer.email" are required',
    });
  }

  const validMethods = ['credit_card', 'paypal', 'bank_transfer'];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: `"paymentMethod" must be one of: ${validMethods.join(', ')}`,
    });
  }

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderId = generateOrderId();

  const order = {
    id: orderId,
    status: 'confirmed',
    items: cart.items.map(item => ({
      ...item,
      subtotal: parseFloat((item.price * item.quantity).toFixed(2)),
    })),
    total: parseFloat(total.toFixed(2)),
    customer,
    paymentMethod,
    createdAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  orders[orderId] = order;
  // Clear cart after order is placed
  carts[sessionId] = { items: [], updatedAt: new Date().toISOString() };

  res.status(201).json(order);
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Retrieve an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID returned from POST /api/orders
 *         example: ORD-1716000000000-A1B2
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Order "${req.params.id}" not found`,
    });
  }
  res.json(order);
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin — no auth required in demo)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/status', (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({ error: 'NOT_FOUND', message: `Order "${req.params.id}" not found` });
  }

  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const { status } = req.body;
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: `"status" must be one of: ${validStatuses.join(', ')}`,
    });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  res.json(order);
});

module.exports = router;
