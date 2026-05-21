const express = require('express');
const router = express.Router();
const { PRODUCTS } = require('../data');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product catalogue endpoints
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [audio, computing, mobile, accessories]
 *         description: Filter by category
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price-asc, price-desc, rating, name]
 *         description: Sort order
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter to in-stock products only
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                   description: Total matching products (before pagination)
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *             example:
 *               data:
 *                 - id: p001
 *                   name: Pro Wireless Headphones
 *                   category: audio
 *                   price: 149.99
 *                   rating: 4.8
 *                   inStock: true
 *               total: 8
 *               limit: 20
 *               offset: 0
 */
router.get('/', (req, res) => {
  let products = [...PRODUCTS];
  const { category, sort, inStock, limit = 20, offset = 0 } = req.query;

  if (category) {
    const valid = ['audio', 'computing', 'mobile', 'accessories'];
    if (!valid.includes(category)) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: `Invalid category. Must be one of: ${valid.join(', ')}`,
      });
    }
    products = products.filter(p => p.category === category);
  }

  if (inStock !== undefined) {
    const stockFilter = inStock === 'true' || inStock === '1';
    products = products.filter(p => p.inStock === stockFilter);
  }

  if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);
  else if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort && !['price-asc', 'price-desc', 'rating', 'name'].includes(sort)) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Invalid sort value. Must be one of: price-asc, price-desc, rating, name',
    });
  }

  const total = products.length;
  const lim = Math.min(Math.max(Number(limit), 1), 100);
  const off = Math.max(Number(offset), 0);
  const paginated = products.slice(off, off + lim);

  res.json({ data: paginated, total, limit: lim, offset: off });
});

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Full-text search across product name, description, and category
 *     description: |
 *       Searches name, description, and category fields. Includes a configurable
 *       `delay` parameter to simulate network latency — useful for performance testing
 *       exercises (Module 4.3.2).
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search keyword
 *         example: wireless
 *       - in: query
 *         name: delay
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 0
 *           maximum: 2000
 *         description: Simulated response delay in ms (capped at 2000ms)
 *     responses:
 *       200:
 *         description: Search results with timing metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 query:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 latencyMs:
 *                   type: integer
 *                   description: Actual server response time in ms
 *       400:
 *         description: Missing or invalid query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', async (req, res) => {
  const { q, delay = 50 } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Query parameter "q" is required and must not be empty',
    });
  }

  const delayMs = Math.min(Math.max(Number(delay) || 0, 0), 2000);
  const start = Date.now();

  await new Promise(resolve => setTimeout(resolve, delayMs));

  const keyword = q.toLowerCase();
  const results = PRODUCTS.filter(
    p =>
      p.name.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword)
  );

  res.json({
    data: results,
    query: q,
    total: results.length,
    latencyMs: Date.now() - start,
  });
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (e.g. p001)
 *         example: p001
 *     responses:
 *       200:
 *         description: Product object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: NOT_FOUND
 *               message: Product "p999" not found
 */
router.get('/:id', (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Product "${req.params.id}" not found`,
    });
  }
  res.json(product);
});

module.exports = router;
