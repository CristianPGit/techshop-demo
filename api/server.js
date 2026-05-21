const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Swagger / OpenAPI ────────────────────────────────────────────────────────

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TechShop API',
      version: '1.0.0',
      description: [
        'REST API for the TechShop demo e-commerce site.',
        '',
        '**Used in AI for QA Course — Modules 4 & 5:**',
        '- Module 5.2.1: Paste this spec into Claude → generate TypeScript DTOs automatically',
        '- Module 4.3.2: Use `GET /api/products/search?delay=N` to benchmark percentiles',
        '- Module 5.3: Use `X-Session-ID` header for parallel-safe test data isolation',
        '',
        '**Demo credentials:** `demo@techshop.com` / `password123`',
      ].join('\n'),
      contact: { name: 'AI for QA Course' },
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Token returned by POST /api/auth/login',
        },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p001', description: 'Unique product identifier' },
            name: { type: 'string', example: 'Pro Wireless Headphones' },
            category: {
              type: 'string',
              enum: ['audio', 'computing', 'mobile', 'accessories'],
              example: 'audio',
            },
            price: { type: 'number', format: 'float', example: 149.99 },
            badge: { type: 'string', nullable: true, example: 'Bestseller', description: 'Optional promotional badge' },
            emoji: { type: 'string', example: '🎧' },
            description: { type: 'string' },
            rating: { type: 'number', format: 'float', minimum: 1, maximum: 5, example: 4.8 },
            reviews: { type: 'integer', minimum: 0, example: 312 },
            inStock: { type: 'boolean', example: true },
            stock: { type: 'integer', minimum: 0, example: 45 },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            productId: { type: 'string', example: 'p001' },
            name: { type: 'string', example: 'Pro Wireless Headphones' },
            price: { type: 'number', format: 'float', example: 149.99 },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            subtotal: { type: 'number', format: 'float', example: 299.98 },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', example: 'test-session-abc123' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CartItem' },
            },
            total: { type: 'number', format: 'float', example: 389.97 },
            itemCount: { type: 'integer', example: 3 },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Customer: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', example: 'Jane Smith' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            phone: { type: 'string', example: '+1-555-0100', nullable: true },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        Address: {
          type: 'object',
          required: ['street', 'city', 'country'],
          properties: {
            street: { type: 'string', example: '123 Main Street' },
            city: { type: 'string', example: 'Springfield' },
            state: { type: 'string', example: 'IL', nullable: true },
            zip: { type: 'string', example: '62701', nullable: true },
            country: { type: 'string', example: 'US' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ORD-1716000000000-A1B2' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
              example: 'confirmed',
            },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CartItem' },
            },
            total: { type: 'number', format: 'float', example: 389.97 },
            customer: { $ref: '#/components/schemas/Customer' },
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'paypal', 'bank_transfer'],
              example: 'credit_card',
            },
            createdAt: { type: 'string', format: 'date-time' },
            estimatedDelivery: { type: 'string', format: 'date', example: '2026-05-24' },
          },
        },
        User: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'demo@techshop.com' },
            name: { type: 'string', example: 'Demo User' },
            loginAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Machine-readable error code',
              example: 'NOT_FOUND',
            },
            message: {
              type: 'string',
              description: 'Human-readable error description',
              example: 'Product "p999" not found',
            },
          },
        },
      },
    },
  },
  apis: ['./api/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'TechShop API — AI for QA Course',
}));

// Raw OpenAPI JSON — useful for Claude to generate DTOs (Module 5.2.1)
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, () => {
  console.log(`\n🛒 TechShop API  →  http://localhost:${PORT}/api`);
  console.log(`📖 Swagger docs  →  http://localhost:${PORT}/api/docs`);
  console.log(`📄 OpenAPI JSON  →  http://localhost:${PORT}/api/docs.json\n`);
});
