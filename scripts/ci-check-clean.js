#!/usr/bin/env node
/*
 * CI Check — CLEAN FAILURE VARIANT
 *
 * Used in the AI for QA course to practice reading "ideal" CI logs:
 * one focused error, clear file/line, no noise. Students should be
 * able to pinpoint the root cause in under 10 seconds.
 *
 * Expected outcome: exit code 1, ONE assertion error about p007.
 */

const path = require('path');
const PRODUCTS = [
  { id: 'p001', name: 'Pro Wireless Headphones', price: 149.99, stock: 45 },
  { id: 'p002', name: 'Mechanical Keyboard',     price: 89.99,  stock: 22 },
  { id: 'p003', name: 'Portable Power Bank',     price: 49.99,  stock: 60 },
  { id: 'p004', name: 'Smart Watch Ultra',       price: 299.99, stock: 18 },
  { id: 'p005', name: 'USB-C Hub 8-in-1',        price: 59.99,  stock: 33 },
  { id: 'p006', name: 'Wireless Earbuds Pro',    price: 79.99,  stock: 41 },
  { id: 'p007', name: 'Laptop Stand Aluminium',  price: -39.99, stock: 15 }, // <-- BUG
  { id: 'p008', name: 'Phone Gimbal Stabilizer', price: 119.99, stock: 9 },
];

function assertPositivePrice(p) {
  if (typeof p.price !== 'number' || p.price <= 0) {
    const err = new Error(
      `Invalid price for product ${p.id} ("${p.name}"): got ${p.price}, expected a positive number`
    );
    err.code = 'INVALID_PRICE';
    throw err;
  }
}

console.log('▶ Running product catalog validation...');
try {
  PRODUCTS.forEach(assertPositivePrice);
  console.log(`✓ ${PRODUCTS.length} products validated`);
  process.exit(0);
} catch (err) {
  console.error('');
  console.error(`✗ FAIL  ${err.message}`);
  console.error(`        at ${path.basename(__filename)}:${'product catalog validation'}`);
  console.error(`        code: ${err.code}`);
  console.error('');
  process.exit(1);
}
