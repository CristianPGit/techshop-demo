import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('valid demo credentials reach the success state', async ({ page }) => {
    await page.goto('login.html');

    await page.locator('#login-email').fill('demo@techshop.com');
    await page.locator('#login-password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    const success = page.locator('#login-success');
    await expect(success).toBeVisible();
    await expect(page.locator('#success-username')).toHaveText('demo@techshop.com');
  });

  test('wrong password surfaces an error and stays on the form', async ({ page }) => {
    await page.goto('login.html');

    await page.locator('#login-email').fill('demo@techshop.com');
    await page.locator('#login-password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-success')).toBeHidden();
  });

  test('empty submit shows inline field validation', async ({ page }) => {
    await page.goto('login.html');

    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('#error-email')).toHaveText('Email is required.');
    await expect(page.locator('#error-password')).toHaveText('Password is required.');
  });

  test('malformed email is rejected before submit', async ({ page }) => {
    await page.goto('login.html');

    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('#error-email')).toHaveText('Please enter a valid email address.');
  });

  test('an authenticated session is remembered on reload', async ({ page }) => {
    await page.goto('login.html');
    await page.locator('#login-email').fill('demo@techshop.com');
    await page.locator('#login-password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('#login-success')).toBeVisible();

    await page.reload();
    await expect(page.locator('#login-success')).toBeVisible();
  });

  // ——— Added from live-page exploration (agent-browser, GitHub Pages build) ———

  test('show-password toggle flips the field between masked and plain text', async ({ page }) => {
    await page.goto('login.html');
    const password = page.locator('#login-password');
    const toggle = page.getByRole('button', { name: 'Show password' });

    await password.fill('password123');
    await expect(password).toHaveAttribute('type', 'password');

    await toggle.click();
    await expect(password).toHaveAttribute('type', 'text');

    await toggle.click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('failed sign-in re-enables the button and shows the exact error copy', async ({ page }) => {
    await page.goto('login.html');
    await page.locator('#login-email').fill('demo@techshop.com');
    await page.locator('#login-password').fill('wrong-password');

    const button = page.getByRole('button', { name: /Sign In|Signing in/ });
    await button.click();

    // Simulated latency: the button disables while "signing in", then recovers.
    await expect(page.locator('#login-error')).toContainText(
      'Invalid email or password. Please try again.',
    );
    await expect(page.locator('#login-btn')).toBeEnabled();
    await expect(page.locator('#login-btn')).toHaveText('Sign In');
  });

  test('log out clears the stored session and returns to the sign-in form', async ({ page }) => {
    await page.goto('login.html');
    await page.locator('#login-email').fill('demo@techshop.com');
    await page.locator('#login-password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('#login-success')).toBeVisible();

    await page.getByRole('button', { name: 'Log Out' }).click();

    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-success')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('techshop-user'))).toBeNull();
  });
});
