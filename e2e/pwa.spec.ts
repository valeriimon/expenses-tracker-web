// The app as an installed, offline-capable application.
//
// These run against the production build served from `www/`, because the dev
// server registers no service worker. They run one at a time: the last test
// publishes a "new version" by rewriting files in `www/`.
import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const readyNotice = (page: Page) => page.getByText('Ready to use offline');
const updateNotice = (page: Page) => page.getByText('An update is ready');
const weekTotal = (page: Page) => page.locator('app-expenses .t-balance');

/** Resolves once the build is stored and this page is served from it. */
async function savedForOffline(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

/** Has the browser look for a newer version now, and waits for its answer. */
async function checkForUpdate(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
}

async function recordExpense(page: Page, description: string, amount: string) {
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('What was bought', { exact: true }).locator('visible=true').fill(description);
  await page.getByLabel('Amount', { exact: true }).locator('visible=true').fill(amount);
  await page.getByRole('radio', { name: 'Other', exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: `Edit ${description}` })).toBeVisible();
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Where your data lives')).toBeVisible();
}

test('says once when it is ready for offline use', async ({ page }) => {
  await page.goto('/');

  await expect(readyNotice(page)).toBeVisible();
  await expect(updateNotice(page)).toHaveCount(0);

  // The notice sits near the add button and must not take a press meant for it.
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByText('New expense')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await openSettings(page);
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible();

  // A later visit: already saved, so nothing is announced again.
  await page.goto('/');
  await savedForOffline(page);
  await checkForUpdate(page);
  await expect(readyNotice(page)).toHaveCount(0);
  await expect(updateNotice(page)).toHaveCount(0);

  await openSettings(page);
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible();
});

test('shows settings going from being saved to available without reopening', async ({
  page,
  context,
}) => {
  // Holds the service worker back long enough to see the state before it.
  await context.route('**/sw.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  await page.goto('/settings');
  await expect(page.getByText('Being saved for offline use…')).toBeVisible();
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible();
});

test('meets the browser criteria for installation', async ({ page, context }) => {
  await page.goto('/');
  await savedForOffline(page);

  const session = await context.newCDPSession(page);
  const { installabilityErrors } = await session.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});

test('opens every page offline, including ones never visited', async ({ page, context }) => {
  // Only the Expenses destination is ever opened while online.
  await page.goto('/');
  await savedForOffline(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText('Nothing recorded this week.')).toBeVisible();
  await expect(updateNotice(page)).toHaveCount(0);
  await expect(readyNotice(page)).toHaveCount(0);

  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(page.getByText('Nothing was recorded in this week.')).toBeVisible();

  await page.getByRole('tab', { name: 'Data' }).click();
  await page.getByRole('button', { name: 'Import from CSV' }).click();
  await expect(page.getByText('Import from a CSV file')).toBeVisible();
  await page.getByRole('button', { name: 'Close import' }).click();

  await page.getByRole('tab', { name: 'Expenses' }).click();
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByText('New expense')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await openSettings(page);
  await page.getByRole('button', { name: 'Manage categories' }).click();
  await expect(page.getByText('Built-in').first()).toBeVisible();
});

test('opens a page at its own address offline', async ({ page, context }) => {
  await page.goto('/');
  await savedForOffline(page);

  await context.setOffline(true);
  await page.goto('/settings/categories');

  await expect(page.getByText('Built-in').first()).toBeVisible();
});

test('keeps what was recorded offline', async ({ page, context }) => {
  await page.goto('/');
  await savedForOffline(page);

  await context.setOffline(true);
  await page.reload();
  await recordExpense(page, 'Train ticket', '120');
  await expect(weekTotal(page)).toHaveText('120 ₴');

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit Train ticket' })).toBeVisible();
  await expect(weekTotal(page)).toHaveText('120 ₴');
});

test('declares a manifest a browser can install from', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);

  const manifest = await response.json();
  expect(manifest.name).toBe('Expenses');
  expect(manifest.short_name).toBe('Expenses');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./');

  const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
  expect(purposes).toContain('maskable');

  for (const icon of manifest.icons as { src: string; sizes: string; type: string }[]) {
    const image = await request.get(`/${icon.src}`);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()['content-type']).toBe(icon.type);

    // A PNG states its width and height in its header, at bytes 16 and 20.
    const body = await image.body();
    expect(`${body.readUInt32BE(16)}x${body.readUInt32BE(20)}`, icon.src).toBe(icon.sizes);
  }

  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

test('offers a newer version, and applies it only when accepted', async ({ page, context }) => {
  await page.goto('/');
  await expect(readyNotice(page)).toBeVisible();
  await recordExpense(page, 'Before the update', '75');

  // Publish a new version. From the service worker's point of view that is
  // nothing more than a changed file and the precache list that names it.
  const marker = `published-${Date.now()}`;
  appendFileSync('www/index.html', `\n<!-- ${marker} -->\n`);
  execSync('node scripts/build-sw.mjs', { stdio: 'ignore' });

  // The app opens on the version it already had, then learns of the new one.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit Before the update' })).toBeVisible();
  await expect(updateNotice(page)).toBeVisible();
  // Becoming up to date is an update, not becoming ready.
  await expect(readyNotice(page)).toHaveCount(0);

  // Until it is accepted, the old version is still the one being served.
  const served = () => page.evaluate(() => fetch('index.html').then((r) => r.text()));
  expect(await served()).not.toContain(marker);

  // A second window has the same offer, and no say in when it is accepted.
  const other = await context.newPage();
  await other.goto('/');
  await expect(updateNotice(other)).toBeVisible();

  const reloaded = page.waitForEvent('load');
  const otherReloaded = other.waitForEvent('load');
  await page.getByRole('button', { name: 'Reload' }).click();
  await Promise.all([reloaded, otherReloaded]);

  // Both windows are now on the new version, with the data untouched.
  for (const window of [page, other]) {
    await expect(window.getByRole('button', { name: 'Edit Before the update' })).toBeVisible();
    await expect(updateNotice(window)).toHaveCount(0);
    expect(await window.evaluate(() => fetch('index.html').then((r) => r.text()))).toContain(
      marker,
    );
  }
  await expect(weekTotal(page)).toHaveText('75 ₴');
});

test('leaves the running version alone when the offer is declined', async ({ page, context }) => {
  await page.goto('/');
  await savedForOffline(page);

  const marker = `declined-${Date.now()}`;
  appendFileSync('www/index.html', `\n<!-- ${marker} -->\n`);
  execSync('node scripts/build-sw.mjs', { stdio: 'ignore' });

  await page.reload();
  await expect(updateNotice(page)).toBeVisible();

  // Part-way through an entry when the offer is turned down.
  await page.getByRole('button', { name: 'Add expense' }).click();
  const description = page.getByLabel('What was bought', { exact: true }).locator('visible=true');
  await description.fill('Half typed');
  await page.getByRole('button', { name: 'Later' }).click();

  await expect(updateNotice(page)).toHaveCount(0);
  await expect(description).toHaveValue('Half typed');
  expect(await page.evaluate(() => fetch('index.html').then((r) => r.text()))).not.toContain(
    marker,
  );

  // Closing every window and opening the app again is what picks it up.
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByText('Nothing recorded this week.')).toBeVisible();
  await expect
    .poll(() => reopened.evaluate(() => fetch('index.html').then((r) => r.text())))
    .toContain(marker);
});
