import { defineConfig, devices } from '@playwright/test'

const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: frontendBaseUrl,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEBSERVER_COMMAND || 'npm run dev -- --hostname 127.0.0.1 --port 5173',
    url: frontendBaseUrl,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox'],
        },
      },
    },
  ],
  // For the smoke suite we only need to assert app shell and route readiness.
  outputDir: '.playwright/results',
  globalSetup: './tests/global-setup.ts',
})
