// Config for the lesson-asset build scripts only.
//
// The root playwright.config.ts scopes testDir to ./qa/tests, so it cannot
// discover anything under design-assets/. This config keeps the asset builds
// isolated from the course test suite.
//
// Serves the static site on 3100 rather than 3000 — :3000 is commonly taken by
// another project on the author's machine.

const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.ASSET_PORT || 3100;

module.exports = defineConfig({
  testDir: __dirname,
  // These builders are named build-*.js, not *.spec.js, so the default
  // testMatch would skip them entirely.
  testMatch: '**/build-*.js',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx serve . -p ${PORT}`,
    url: `http://localhost:${PORT}/checkout.html`,
    cwd: require('path').resolve(__dirname, '..'),
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
