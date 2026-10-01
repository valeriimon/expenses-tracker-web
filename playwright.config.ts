import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive the real app in a browser, against a real IndexedDB.
 * Every test gets a fresh browser context, and with it an empty database.
 *
 * Two projects, run separately:
 *
 * - `chromium` (`npm run e2e`) runs the everyday suite against the dev server.
 * - `pwa` (`npm run e2e:pwa`) builds the app and runs against the production
 *   output, which is the only place a service worker exists.
 */

const DEV_URL = 'http://localhost:4300';
const PWA_URL = 'http://localhost:4301';

// Playwright starts every configured server whichever project is selected, so
// the one that is not needed — and the build it would trigger — is left out.
const pwa = process.argv.some((argument) => argument.includes('--project=pwa'));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  // The dev server compiles lazily, so the first page of a cold run is slow.
  expect: { timeout: 15_000 },
  use: {
    // Pinned so "today" and week boundaries are the same on every machine.
    timezoneId: 'Europe/Kyiv',
    locale: 'en-GB',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: 'app.spec.ts',
      use: { ...devices['Pixel 7'], baseURL: DEV_URL },
    },
    {
      name: 'pwa',
      testMatch: 'pwa.spec.ts',
      use: { ...devices['Pixel 7'], baseURL: PWA_URL },
    },
  ],
  webServer: pwa
    ? {
        command: 'npm run preview',
        url: PWA_URL,
        // Always a fresh build: these tests rewrite files in `www/`.
        reuseExistingServer: false,
        timeout: 240_000,
      }
    : {
        command: 'npx ng serve --port 4300',
        url: DEV_URL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
