import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive the real app in a browser, against a real IndexedDB.
 * Every test gets a fresh browser context, and with it an empty database.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  // The dev server compiles lazily, so the first page of a cold run is slow.
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:4300',
    // Pinned so "today" and week boundaries are the same on every machine.
    timezoneId: 'Europe/Kyiv',
    locale: 'en-GB',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npx ng serve --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
