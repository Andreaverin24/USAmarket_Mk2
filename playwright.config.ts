import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: process.env.CI ? 'desktop-chromium' : 'desktop-edge',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.CI ? {} : { channel: 'msedge' as const }),
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @atlas/api start',
      url: 'http://127.0.0.1:4100/health/live',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { PORT: '4100' },
    },
    {
      command: 'pnpm --filter @atlas/web start',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { PORT: '3100', API_URL: 'http://127.0.0.1:4100' },
    },
  ],
});
