// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
  ],
  use: {
    // Base URL — change to your GitHub Pages URL when deployed
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Visual snapshot directory (Module 3)
  snapshotDir: './tests/snapshots',
  updateSnapshots: 'missing',
  webServer: {
    command: 'npx serve . -p 3000 -s',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
