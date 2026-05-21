const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sessions, DEMO_USERS } = require('../data');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user and receive a bearer token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: demo@techshop.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful — returns bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Bearer token for subsequent authenticated requests
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 expiresIn:
 *                   type: integer
 *                   description: Token lifetime in seconds
 *                   example: 3600
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: UNAUTHORIZED
 *               message: Invalid email or password
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Both "email" and "password" are required',
    });
  }

  const user = DEMO_USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = { email: user.email, name: user.name, loginAt: new Date().toISOString() };

  res.json({
    token,
    user: { email: user.email, name: user.name },
    expiresIn: 3600,
  });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Invalidate the current bearer token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: No valid token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', (req, res) => {
  const token = extractToken(req);
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No active session' });
  }
  delete sessions[token];
  res.json({ message: 'Logged out successfully' });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', (req, res) => {
  const token = extractToken(req);
  const session = sessions[token];
  if (!session) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
  res.json({ email: session.email, name: session.name, loginAt: session.loginAt });
});

function extractToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

module.exports = router;
module.exports.extractToken = extractToken;
