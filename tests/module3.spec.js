// tests/module3.spec.js
// ============================================================
// MODULE 3 — Visual Validation Tests
// Uses Playwright screenshot comparison + Claude vision API
// ============================================================

const { test, expect } = require('@playwright/test');
const path = require('path');

// ============================================================
// Chapter 3.1 — Visual Testing Fundamentals
// Basic snapshot comparisons using Playwright built-in
// ============================================================

test.describe('3.1 - Visual Baseline Snapshots', () => {

  test('3.1.1 - Homepage full page snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // First run: creates baseline. Subsequent runs: compares.
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02, // Allow 2% pixel difference
    });
  });

  test('3.1.2 - Navbar component snapshot', async ({ page }) => {
    await page.goto('/');
    const navbar = page.getByTestId('navbar');
    await expect(navbar).toHaveScreenshot('navbar.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('3.1.3 - Hero section snapshot', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('hero');
    await expect(hero).toHaveScreenshot('hero.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('3.1.4 - Products page full snapshot', async ({ page }) => {
    await page.goto('/products.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('products-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

});

// ============================================================
// Chapter 3.2 — Playwright CLI Integration
// Element-level and section snapshots for diff analysis
// ============================================================

test.describe('3.2 - Component-Level Visual Tests', () => {

  test('3.2.1 - Product card snapshot (p001)', async ({ page }) => {
    await page.goto('/products.html');
    const card = page.getByTestId('product-card-p001');
    await expect(card).toHaveScreenshot('product-card-p001.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('3.2.2 - Product grid snapshot', async ({ page }) => {
    await page.goto('/products.html');
    const grid = page.getByTestId('product-grid');
    await expect(grid).toHaveScreenshot('product-grid.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('3.2.3 - Cart summary snapshot', async ({ page }) => {
    await page.goto('/cart.html');
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    const summary = page.getByTestId('cart-summary');
    await expect(summary).toHaveScreenshot('cart-summary.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('3.2.4 - Checkout form snapshot', async ({ page }) => {
    await page.goto('/checkout.html');
    const form = page.getByTestId('checkout-form');
    await expect(form).toHaveScreenshot('checkout-form.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('3.2.5 - Filter bar snapshot', async ({ page }) => {
    await page.goto('/products.html');
    const filterBar = page.getByTestId('filter-bar');
    await expect(filterBar).toHaveScreenshot('filter-bar.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

});

// ============================================================
// Chapter 3.3 — AI-Assisted Diff Analysis
// These tests save screenshots for Claude to analyze
// Run with: node tests/ai-visual-check.js
// ============================================================

test.describe('3.3 - AI Visual Diff Capture', () => {

  test('3.3.1 - Capture current homepage for AI comparison', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Save current state for Claude to compare
    await page.screenshot({
      path: 'test-results/ai-diff/homepage-current.png',
      fullPage: true,
    });

    // Also capture individual sections
    await page.getByTestId('navbar').screenshot({
      path: 'test-results/ai-diff/navbar-current.png',
    });
    await page.getByTestId('hero').screenshot({
      path: 'test-results/ai-diff/hero-current.png',
    });
    await page.getByTestId('featured-section').screenshot({
      path: 'test-results/ai-diff/featured-current.png',
    });
  });

  test('3.3.2 - Capture products page for AI comparison', async ({ page }) => {
    await page.goto('/products.html');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/ai-diff/products-current.png',
      fullPage: true,
    });
    await page.getByTestId('product-grid').screenshot({
      path: 'test-results/ai-diff/product-grid-current.png',
    });
  });

  test('3.3.3 - Capture cart page for AI comparison', async ({ page }) => {
    await page.goto('/cart.html');
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/ai-diff/cart-current.png',
      fullPage: true,
    });
  });

  test('3.3.4 - Simulate visual regression: change primary color', async ({ page }) => {
    await page.goto('/');
    // 🔴 SIMULATE a visual regression: someone changed --primary color
    await page.addStyleTag({ content: ':root { --primary: #ff4444 !important; }' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/ai-diff/homepage-regression.png',
      fullPage: true,
    });
    // This screenshot should look DIFFERENT from the baseline
    // Claude will be asked to classify: is this a bug or intentional?
  });

});
